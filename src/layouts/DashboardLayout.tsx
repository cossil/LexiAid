import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Book, 
  BookOpen, 
  Moon, 
  Sun, 
  Upload, 
  MessageSquare, 
  FileText, 
  Award, 
  Settings, 
  LogOut, 
  Folder, 
  Menu, 
  X, 
  Headphones, 
  User,
  Layers, // Added for Quiz icon
  PenTool // Added for Answer Formulation icon
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useDocument } from '../contexts/DocumentContext';
import { useQuiz } from '../contexts/QuizContext';
import { toast } from 'react-hot-toast';

// Define a discriminated union for navigation link types
type NavLinkEntry = 
  | { to: string; text: string; icon: JSX.Element; onClick?: never }
  | { to?: never; text: string; icon: JSX.Element; onClick: () => void };

const DashboardLayout: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const { 
    toggleUiTts, 
    uiTtsEnabled, 
    highContrast, 
    toggleHighContrast,
    speakText
  } = useAccessibility();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeDocumentId } = useDocument();
  const { quizThreadId, cancelQuizSession, isCancelling } = useQuiz();
  
  // Apply high contrast theme if enabled
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);
  
  // Function to handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };
  
  // Function to handle TTS for navigation elements
  const handleNavLinkHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  const handleReadNavigation = useCallback(() => {
    if (activeDocumentId) {
      navigate(`/dashboard/documents/${activeDocumentId}`);
    } else {
      toast.error('Please select a document first to read.');
      navigate('/dashboard/documents');
    }
  }, [activeDocumentId, navigate]);

  const handleChatNavigation = useCallback(async () => {
    if (isCancelling) {
      toast('Please wait, ending quiz session...');
      return;
    }

    // If there's an active quiz, cancel it first.
    if (quizThreadId) {
      await cancelQuizSession();
    }

    // Proceed with navigation.
    if (activeDocumentId) {
      navigate(`/dashboard/chat?document=${activeDocumentId}`);
    } else {
      toast.error('Please select a document first.');
      navigate('/dashboard/documents');
    }
  }, [activeDocumentId, navigate, quizThreadId, isCancelling, cancelQuizSession]);

  const handleQuizNavigation = useCallback(() => {
    if (activeDocumentId) {
      navigate(`/dashboard/documents/${activeDocumentId}?tab=quiz`);
    } else {
      toast.error('Please select a document first to start a quiz.');
      navigate('/dashboard/documents');
    }
  }, [activeDocumentId, navigate]);
  
  // Navigation links with icons and accessibility support
  const navLinks: NavLinkEntry[] = [
    { to: '/dashboard', text: 'Dashboard', icon: <FileText className="w-5 h-5" /> },
    { to: '/dashboard/documents', text: 'My Documents', icon: <Folder className="w-5 h-5" /> },
    { to: '/dashboard/study', text: 'Study Mode', icon: <Book className="w-5 h-5" /> },
    { text: 'Read document', icon: <BookOpen className="w-5 h-5" />, onClick: handleReadNavigation },
    { text: 'Chat with the document', icon: <MessageSquare className="w-5 h-5" />, onClick: handleChatNavigation },
    { text: 'Quiz', icon: <Layers className="w-5 h-5" />, onClick: handleQuizNavigation },
    { to: '/dashboard/answer-formulation', text: 'Answer Formulation', icon: <PenTool className="w-5 h-5" /> },
    { to: '/dashboard/upload', text: 'Upload Document', icon: <Upload className="w-5 h-5" /> },
    { to: '/dashboard/progress', text: 'My Progress', icon: <Award className="w-5 h-5" /> },
    { to: '/dashboard/settings', text: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];
  
  return (
    <div className={`min-h-screen flex flex-col ${highContrast ? 'bg-black text-white' : 'bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100'}`}>
      {/* Mobile Header - only visible on small screens */}
      <header className={`lg:hidden flex items-center justify-between p-4 ${highContrast ? 'bg-black border-b border-white' : 'bg-gray-800'}`}>
        <div className="flex items-center">
          <button 
            onClick={() => setSidebarOpen(true)}
            className={`p-2 rounded-md ${highContrast ? 'bg-gray-900 text-white' : 'bg-gray-700 text-gray-200'}`}
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/dashboard" className="flex items-center ml-4" onMouseEnter={() => handleNavLinkHover('AI Tutor Dashboard')}>
            <Book className={`mr-2 h-6 w-6 ${highContrast ? 'text-white' : 'text-blue-400'}`} aria-hidden="true" />
            <span className={`text-xl font-semibold ${highContrast ? 'text-white' : 'text-blue-400'}`}>AI Tutor</span>
          </Link>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleUiTts}
            className={`p-2 rounded-full ${uiTtsEnabled ? 'bg-blue-600' : highContrast ? 'bg-gray-900' : 'bg-gray-700'}`} 
            aria-label={uiTtsEnabled ? 'Disable UI text-to-speech' : 'Enable UI text-to-speech'}
            aria-pressed={uiTtsEnabled}
            onMouseEnter={() => handleNavLinkHover(uiTtsEnabled ? 'Disable UI text-to-speech' : 'Enable UI text-to-speech')}
          >
            <Headphones className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleHighContrast}
            className={`p-2 rounded-full ${highContrast ? 'bg-white text-black' : 'bg-gray-700 text-gray-200'}`}
            aria-label={highContrast ? 'Disable high contrast' : 'Enable high contrast'}
            aria-pressed={highContrast}
            onMouseEnter={() => handleNavLinkHover(highContrast ? 'Disable high contrast' : 'Enable high contrast')}
          >
            {highContrast ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>
      
      {/* Sidebar for navigation */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300 ease-in-out`}>
        {/* Overlay */}
        <div className="fixed inset-0 bg-black bg-opacity-70" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        
        {/* Sidebar panel */}
        <div className={`relative flex flex-col w-80 max-w-xs ${highContrast ? 'bg-black border-r border-white' : 'bg-gray-800'} pb-4 flex-1 flex flex-col`}>
          <div className="absolute top-0 right-0 pt-2 pr-2">
            <button
              className={`p-2 rounded-md ${highContrast ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-16 pb-4 overflow-y-auto">
            <div className="px-4 pb-6 flex items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white'}`}>
                <User className="w-6 h-6" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{currentUser?.email}</p>
                <p className={`text-xs ${highContrast ? 'text-gray-200' : 'text-gray-400'}`}>Student</p>
              </div>
            </div>
            
            <nav className="mt-4 px-2 space-y-1">
              {navLinks.map((link) => {
                const isActive = typeof link.to === 'string' && location.pathname === link.to;
                const commonClasses = `group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? (highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white')
                    : (highContrast ? 'text-gray-900 hover:bg-gray-700' : 'text-gray-200 hover:bg-gray-700')
                } transition-colors duration-200 w-full text-left`;

                if (typeof link.onClick === 'function') {
                  return (
                    <button
                      key={link.text}
                      onClick={link.onClick}
                      className={commonClasses}
                      onMouseEnter={() => handleNavLinkHover(link.text)}
                      aria-label={link.text}
                    >
                      {link.icon}
                      <span className="ml-3">{link.text}</span>
                    </button>
                  );
                } else {
                  return (
                    <Link
                      key={link.to} 
                      to={link.to} 
                      className={commonClasses}
                      onMouseEnter={() => handleNavLinkHover(link.text)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {link.icon}
                      <span className="ml-3">{link.text}</span>
                    </Link>
                  );
                }
              })}
              
              <button
                onClick={handleLogout}
                className={`w-full group flex items-center px-4 py-3 text-base font-medium rounded-md ${
                  highContrast 
                    ? 'text-white hover:bg-gray-900' 
                    : 'text-gray-200 hover:bg-gray-700'
                } transition-colors duration-200`}
                onMouseEnter={() => handleNavLinkHover('Sign out')}
              >
                <LogOut className="w-5 h-5" />
                <span className="ml-4">Sign out</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      {/* Main content container to hold sidebar and content side-by-side */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar (permanent) - fixed width */}
        <div className="hidden lg:block lg:flex-shrink-0 lg:w-64">
          <div className={`h-full flex flex-col ${highContrast ? 'bg-black border-r border-white' : 'bg-gray-800'}`}>
            {/* Sidebar header with logo */}
            <div className="flex items-center h-16 flex-shrink-0 px-6">
              <Link to="/dashboard" className="flex items-center" onMouseEnter={() => handleNavLinkHover('AI Tutor Dashboard')}>
                <Book className={`mr-2 h-6 w-6 ${highContrast ? 'text-white' : 'text-blue-400'}`} aria-hidden="true" />
                <span className={`text-xl font-semibold ${highContrast ? 'text-white' : 'text-blue-400'}`}>AI Tutor</span>
              </Link>
            </div>
            
            {/* User profile */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white'}`}>
                    <User className="w-6 h-6" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium truncate max-w-[140px]">
                      {currentUser?.email}
                    </p>
                    <p className={`text-xs ${highContrast ? 'text-gray-200' : 'text-gray-400'}`}>Student</p>
                  </div>
                </div>
              </div>
              
              {/* Navigation links */}
              <nav className="flex-1 px-4 py-4 space-y-1">
                {navLinks.map((link) => {
                  const isActive = link.to && location.pathname === link.to;
                  const commonClasses = `group flex items-center px-4 py-3 text-base font-medium rounded-md ${
                    isActive
                      ? (highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white')
                      : (highContrast ? 'text-white hover:bg-gray-900' : 'text-gray-200 hover:bg-gray-700')
                  } transition-colors duration-200 w-full text-left`;

                  if (typeof link.onClick === 'function') { // Note: Changed from "function" to 'function' for consistency, but original was already correct type-wise
                    return (
                      <button
                        key={link.text}
                        onClick={link.onClick}
                        className={commonClasses}
                        onMouseEnter={() => handleNavLinkHover(link.text)}
                        aria-label={link.text}
                      >
                        {link.icon}
                        <span className="ml-4">{link.text}</span>
                      </button>
                    );
                  } else {
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={commonClasses}
                        onMouseEnter={() => handleNavLinkHover(link.text)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {link.icon}
                        <span className="ml-4">{link.text}</span>
                      </Link>
                    );
                  }
                })}
              </nav>
              
              {/* Sidebar footer with logout and accessibility controls */}
              <div className="px-4 py-4 border-t border-gray-700 space-y-4">
                <div className="flex justify-between items-center">
                  <button 
                    onClick={toggleUiTts}
                    className={`p-2 rounded-md flex items-center ${uiTtsEnabled ? highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white' : highContrast ? 'bg-gray-900 text-white' : 'bg-gray-700 text-gray-200'}`} 
                    aria-label={uiTtsEnabled ? 'Disable UI text-to-speech' : 'Enable UI text-to-speech'}
                    aria-pressed={uiTtsEnabled}
                    onMouseEnter={() => handleNavLinkHover(uiTtsEnabled ? 'Disable UI text-to-speech' : 'Enable UI text-to-speech')}
                  >
                    <Headphones className="w-5 h-5" />
                    <span className="ml-2 text-sm">
                      {uiTtsEnabled ? 'TTS ON' : 'TTS OFF'}
                    </span>
                  </button>
                  
                  <button
                    onClick={toggleHighContrast}
                    className={`p-2 rounded-md flex items-center ${highContrast ? 'bg-white text-black' : 'bg-gray-700 text-gray-200'}`}
                    aria-label={highContrast ? 'Disable high contrast' : 'Enable high contrast'}
                    aria-pressed={highContrast}
                    onMouseEnter={() => handleNavLinkHover(highContrast ? 'Disable high contrast' : 'Enable high contrast')}
                  >
                    {highContrast ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    <span className="ml-2 text-sm">
                      {highContrast ? 'High contrast' : 'Normal contrast'}
                    </span>
                  </button>
                </div>
                
                <button
                  onClick={handleLogout}
                  className={`w-full group flex items-center px-4 py-3 text-base font-medium rounded-md ${
                    highContrast 
                      ? 'text-white bg-gray-900 hover:bg-gray-800' 
                      : 'text-gray-200 bg-gray-700 hover:bg-gray-600'
                  } transition-colors duration-200`}
                  onMouseEnter={() => handleNavLinkHover('Sign out')}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="ml-4">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content area - takes remaining width */}
        <div className="flex-1 overflow-auto">
          <main className="h-full">
            {/* Content container with proper padding */}
              <div className="h-full py-2 px-4">
                <Outlet />
              </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
