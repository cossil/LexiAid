import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { Book, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const { speakText, uiTtsEnabled } = useAccessibility();
  const navigate = useNavigate();
  
  // Function to handle text-to-speech on hover/focus
  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error: any) {
      setError('Failed to sign in with Google.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-gray-800/50 rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-8">
          <Book className="h-12 w-12 text-blue-400" aria-hidden="true" />
        </div>
        <h2 
          className="text-center text-3xl font-extrabold text-white mb-6"
          onMouseEnter={() => handleHover('Sign in to AI Tutor')}
        >
          Sign in to AI Tutor
        </h2>
        
        {error && (
          <div 
            className="bg-red-500/20 border border-red-500 rounded-md p-4 mb-6" 
            role="alert"
            onMouseEnter={() => handleHover(`Error: ${error}`)}
          >
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" aria-hidden="true" />
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
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
                onFocus={() => handleHover('Email address field')}
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => handleHover('Password field')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
                aria-required="true"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                onFocus={() => handleHover('Remember me checkbox')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
              />
              <label 
                htmlFor="remember-me" 
                className="ml-2 block text-sm text-gray-300"
                onMouseEnter={() => handleHover('Remember me')}
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link 
                to="/auth/reset-password" 
                className="font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                onMouseEnter={() => handleHover('Forgot your password?')}
                onFocus={() => handleHover('Forgot your password?')}
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => handleHover(loading ? 'Signing in...' : 'Sign in')}
              onFocus={() => handleHover(loading ? 'Signing in...' : 'Sign in')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium transition-colors duration-200"
              aria-label="Sign in to your account"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {loading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-opacity-60 border-t-transparent rounded-full" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-blue-400 group-hover:text-blue-300" aria-hidden="true" />
                )}
              </span>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span 
                className="px-2 bg-gray-800 text-gray-400"
                onMouseEnter={() => handleHover('Or continue with')}
              >
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              onMouseEnter={() => handleHover('Sign in with Google')}
              onFocus={() => handleHover('Sign in with Google')}
              className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200"
              aria-label="Sign in with Google"
            >
              <span className="flex items-center">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.798-1.677-4.202-2.701-6.735-2.701-5.539 0-10.032 4.493-10.032 10.032s4.493 10.032 10.032 10.032c8.445 0 10.154-7.889 9.321-11.731h-9.321z" />
                </svg>
                Sign in with Google
              </span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-400">
            <span onMouseEnter={() => handleHover('Don\'t have an account?')}>Don't have an account?{' '}</span>
            <Link 
              to="/auth/signup" 
              className="font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onMouseEnter={() => handleHover('Sign up')}
              onFocus={() => handleHover('Sign up')}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
