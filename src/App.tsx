import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import DocumentUpload from './pages/DocumentUpload';
import DocumentView from './pages/DocumentView';
import DocumentsList from './pages/DocumentsList';
import Settings from './pages/Settings';
import ChatPage from './pages/ChatPage';
import AnswerFormulationPage from './pages/AnswerFormulationPage';
import DashboardLayout from './layouts/DashboardLayout';
import { useAuth } from './contexts/AuthContext';
import { DocumentProvider } from './contexts/DocumentContext'; // Import DocumentProvider
import QuizProvider from './contexts/QuizContext';

// Developer-only import - lazy loaded and excluded from production builds
const DeprecationShowcase = import.meta.env.DEV 
  ? React.lazy(() => import('./pages/dev/DeprecationShowcase'))
  : null;

// UserInteractionGateway component to unblock browser audio features
const UserInteractionGateway: React.FC<{onInteractionComplete: () => void}> = ({ onInteractionComplete }) => {
  useEffect(() => {
    const handleUserInteraction = () => {
      console.log('User interaction detected - initializing audio capabilities');
      
      // Try to unblock audio by creating and immediately playing/pausing a silent audio context
      try {
        // Create and play a silent audio context to unblock audio capabilities
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContext();
        
        // Create oscillator node and connect it
        const oscillator = audioCtx.createOscillator();
        oscillator.connect(audioCtx.destination);
        oscillator.start(0);
        oscillator.stop(0.001); // Very short sound (essentially silent)
        
        // Also try to initialize speech synthesis
        if ('speechSynthesis' in window) {
          const silentUtterance = new SpeechSynthesisUtterance('');
          window.speechSynthesis.speak(silentUtterance);
          window.speechSynthesis.cancel();
        }
        
        // Cleanup event listeners
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
        
        // Signal that interaction is complete
        onInteractionComplete();
      } catch (e) {
        console.error('Error initializing audio:', e);
        // Still mark as complete even if there was an error
        onInteractionComplete();
      }
    };
    
    // Add listeners for user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    
    return () => {
      // Cleanup
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [onInteractionComplete]);
  
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md text-center">
        <h2 className="text-xl font-bold mb-4">Welcome to AI Tutor</h2>
        <p className="mb-6">Click or tap anywhere to enable all features including text-to-speech.</p>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          onClick={onInteractionComplete}
        >
          Click to Continue
        </button>
      </div>
    </div>
  );
};

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/auth/signin" replace />;
  }
  
  return <>{children}</>;
};

// Routes wrapper with auth context
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/signin" element={<SignIn />} />
      <Route path="/auth/signup" element={<SignUp />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      
      {/* Developer-only routes - only available in development mode */}
      {import.meta.env.DEV && DeprecationShowcase && (
        <Route 
          path="/dev/deprecation-showcase" 
          element={
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Loading...</div>}>
              <DeprecationShowcase />
            </React.Suspense>
          } 
        />
      )}
      
      {/* Protected dashboard routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DocumentProvider>
              <QuizProvider>
                <DashboardLayout />
              </QuizProvider>
            </DocumentProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        
        {/* Document routes */}
        <Route path="upload" element={<DocumentUpload />} />
        <Route path="documents" element={<DocumentsList />} />
        <Route path="documents/:id" element={<DocumentView />} />
        
        {/* Chat route */}
        <Route path="chat" element={<ChatPage />} />
        
        {/* Answer Formulation route */}
        <Route path="answer-formulation" element={<AnswerFormulationPage />} />
        
        {/* Settings route */}
        <Route path="settings" element={<Settings />} />
        
        {/* Fallback for dashboard routes */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  // State to track if user has interacted with the page
  // This helps us ensure audio features work properly
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  
  // Function to handle when user interaction is complete
  const handleInteractionComplete = () => {
    console.log('User interaction complete - audio features unlocked');
    setUserHasInteracted(true);
  };

  return (
    <Router>
      <AuthProvider>
        <AccessibilityProvider>
          {/* Show the interaction gateway if user hasn't interacted yet */}
          {!userHasInteracted && (
            <UserInteractionGateway onInteractionComplete={handleInteractionComplete} />
          )}
          <AppRoutes />
        </AccessibilityProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;