import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { Book, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

const SignUp: React.FC = () => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const { speakText, uiTtsEnabled } = useAccessibility();
  const navigate = useNavigate();
  
  // Handle TTS for interactive elements
  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };
  
  // Navigate to dashboard after successful signup
  useEffect(() => {
    let timer: number;
    if (success) {
      console.log('[SignUp] Success detected, scheduling navigation');
      timer = window.setTimeout(() => {
        console.log('[SignUp] Navigation timer fired, redirecting to dashboard');
        navigate('/dashboard');
      }, 1500);
    }
    return () => {
      if (timer) {
        console.log('[SignUp] Clearing navigation timer');
        clearTimeout(timer);
      }
    };
  }, [success, navigate]);

  // Debug component renders
  console.log('[SignUp] Render state:', { loading, success, error });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[SignUp] Form submitted');
    
    // Form validation
    if (!displayName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      console.log('[SignUp] Validation failed: empty fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      console.log('[SignUp] Validation failed: passwords mismatch');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      console.log('[SignUp] Validation failed: password too short');
      return;
    }
    
    console.log('[SignUp] Validation passed, proceeding with signup');
    
    // Reset form state
    setError('');
    setLoading(true);
    setSuccess(false); // Explicitly reset success state
    
    try {
      console.log('[SignUp] Calling Firebase signUp...');
      const result = await signUp(email, password, displayName);
      console.log('[SignUp] Firebase signUp returned:', result);
      
      if (result.partial) {
        // Partial success - Auth worked but Firestore failed
        console.log('[SignUp] Partial success - user created but Firestore failed');
        // Show warning but treat as success for UX purposes
        setTimeout(() => {
          setError(result.error || 'Account created but user profile setup was incomplete.');
          setSuccess(true); // Still consider it a success for navigation purposes
          setLoading(false);
        }, 0);
      } else {
        // Complete success
        console.log('[SignUp] Complete success');
        setTimeout(() => {
          setSuccess(true);
          setLoading(false);
          setError('');
        }, 0);
      }
    } catch (error: any) {
      console.error('[SignUp] Firebase signUp failed:', error);
      
      let errorMessage = 'Failed to create an account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      }
      
      // Update state to error after a short timeout to avoid batching issues
      setTimeout(() => {
        setError(errorMessage);
        setSuccess(false);
        setLoading(false);
        console.log('[SignUp] Error state set');
      }, 0);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-gray-800/50 rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-8">
          <Book 
            className="h-12 w-12 text-blue-400" 
            aria-hidden="true" 
            onMouseEnter={() => handleHover('AI Tutor logo')}
          />
        </div>
        <h2 
          className="text-center text-3xl font-extrabold text-white mb-6"
          onMouseEnter={() => handleHover('Create your account')}
        >
          Create your account
        </h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-md p-4 mb-6" role="alert">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" aria-hidden="true" />
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label 
              htmlFor="displayName" 
              className="block text-sm font-medium text-gray-300"
              onMouseEnter={() => handleHover('Full name')}
            >
              Full name
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
                aria-required="true"
              />
            </div>
          </div>
          
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-300"
              onMouseEnter={() => handleHover('Email address')}
            >
              Email address
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address"
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-300"
              onMouseEnter={() => handleHover('Password')}
            >
              Password
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password (min. 6 characters)"
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-medium text-gray-300"
              onMouseEnter={() => handleHover('Confirm password')}
            >
              Confirm password
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm password"
                aria-required="true"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium transition-colors duration-200"
              aria-label="Create your account"
              onMouseEnter={() => handleHover(loading ? 'Creating account...' : success ? 'Account created!' : 'Sign up')}
            >
              {loading && !success ? (
                <div className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-opacity-60 border-t-transparent rounded-full" />
                </div>
              ) : success ? (
                <div className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
              ) : null}
              {loading && !success ? 'Creating account...' : success ? 'Account created!' : 'Sign up'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p 
            className="text-sm text-gray-400"
            onMouseEnter={() => handleHover('Already have an account?')}
          >
            Already have an account?{' '}
            <Link 
              to="/auth/signin" 
              className="font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onMouseEnter={() => handleHover('Sign in')}
            >
              Sign in
            </Link>
          </p>
        </div>
        
        <div className="mt-6 text-center">
          <p 
            className="text-xs text-gray-500"
            onMouseEnter={() => handleHover('By signing up, you agree to our Terms of Service and Privacy Policy')}
          >
            By signing up, you agree to our{' '}
            <Link 
              to="/terms" 
              className="text-blue-400 hover:text-blue-300"
              onMouseEnter={() => handleHover('Terms of Service')}
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link 
              to="/privacy" 
              className="text-blue-400 hover:text-blue-300"
              onMouseEnter={() => handleHover('Privacy Policy')}
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
