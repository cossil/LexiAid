import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Book, Mail, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    try {
      setError('');
      setMessage('');
      setLoading(true);
      await resetPassword(email);
      setMessage('Check your email for password reset instructions');
    } catch (error: any) {
      setError('Failed to reset password. Please check if the email is correct.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-gray-800/50 rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-8">
          <Book className="h-12 w-12 text-blue-400" aria-hidden="true" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white mb-6">
          Reset your password
        </h2>
        <p className="text-center text-gray-300 mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-md p-4 mb-6" role="alert">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" aria-hidden="true" />
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        )}
        
        {message && (
          <div className="bg-green-500/20 border border-green-500 rounded-md p-4 mb-6" role="alert">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2" aria-hidden="true" />
              <span className="text-green-300">{message}</span>
            </div>
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 font-medium transition-colors duration-200"
              aria-label="Send password reset email"
            >
              {loading ? (
                <div className="mr-2 animate-spin h-5 w-5 border-2 border-white border-opacity-60 border-t-transparent rounded-full" />
              ) : null}
              {loading ? 'Sending...' : 'Reset password'}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <Link 
            to="/auth/signin" 
            className="flex items-center justify-center text-sm font-medium text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
