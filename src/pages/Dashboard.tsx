import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  MessageSquare,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import axios from 'axios';

// Define interfaces for type safety
interface Document {
  id: string;
  title: string;
  uploadedAt: Date;
  lastAccessed: Date;
  pageCount: number;
  processingStatus: string;
}

interface UserProfile {
  displayName: string;
  uid: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { speakText, uiTtsEnabled, highContrast } = useAccessibility();
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Function to handle TTS for interactive elements
  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  // Fetch user's recent documents - using backend API for consistency with DocumentsList
  useEffect(() => {
    const fetchRecentDocuments = async () => {
      if (!currentUser) return;

      setLoading(true);
      try {
        // Get user's Firebase ID token
        const token = await currentUser.getIdToken();
        
        if (!token) {
          throw new Error('Authentication token not available');
        }

        // Get the backend API URL from environment variables
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
        
        // Fetch documents from the backend API
        const response = await axios.get(`${apiUrl}/api/documents`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        // Convert the API response format to our Document interface
        const apiDocuments = response.data.data || [];
        const documents: Document[] = apiDocuments
          .map((doc: any) => ({
            id: doc.id,
            title: doc.name || 'Untitled Document',
            uploadedAt: new Date(doc.created_at),
            lastAccessed: new Date(doc.updated_at || doc.created_at),
            pageCount: doc.page_count || 0,
            processingStatus: doc.processing_status || 'completed'
          }))
          // Sort by lastAccessed in descending order
          .sort((a: Document, b: Document) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
          // Limit to 4 most recent documents
          .slice(0, 4);
        
        setRecentDocuments(documents);
        console.log('Recent documents loaded:', documents.length);
      } catch (error) {
        console.error('Error fetching recent documents:', error);
      }
      setLoading(false);
    };
    
    fetchRecentDocuments();
  }, [currentUser]);

  // Fetch user profile data from Firestore
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) return;
      
      try {
        // Get user's Firebase ID token
        const token = await currentUser.getIdToken();
        
        if (!token) {
          throw new Error('Authentication token not available');
        }

        // Get the backend API URL from environment variables
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
        
        // Fetch user profile from the backend API
        console.log('[Dashboard] Fetching user profile data from backend');
        const response = await axios.get(`${apiUrl}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(error => {
          console.log('[Dashboard] User profile API not available, using Firebase Auth profile instead:', error);
          // If the backend API fails, we'll use the Firebase Auth user data
          return { data: null };
        });
        
        if (response.data?.data) {
          // Backend API returned user profile
          const profileData = response.data.data;
          setUserProfile({
            displayName: profileData.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
            uid: profileData.uid,
            email: profileData.email
          });
          console.log('[Dashboard] User profile loaded from backend API');
        } else {
          // Use Firebase Auth user data as fallback
          setUserProfile({
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
            uid: currentUser.uid,
            email: currentUser.email || ''
          });
          console.log('[Dashboard] Using Firebase Auth profile data as fallback');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback to Firebase Auth user data
        setUserProfile({
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
          uid: currentUser.uid,
          email: currentUser.email || ''
        });
      }
    };
    
    fetchUserProfile();
  }, [currentUser]);

  // Format date to human-readable format
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="pb-12">
      {/* Welcome header */}
      <div className={`mb-8 ${highContrast ? 'border-b border-white pb-6' : 'pb-6'}`}>
        <h1 className={`text-3xl font-bold ${highContrast ? 'text-white' : 'text-white'} mb-2`}
          onMouseEnter={() => handleHover(`Welcome back, ${userProfile?.displayName || 'Student'}`)}
        >
          Welcome back, {userProfile?.displayName || currentUser?.displayName || 'Student'}
        </h1>
        <p className={`${highContrast ? 'text-gray-200' : 'text-gray-300'}`}
          onMouseEnter={() => handleHover('Continue your learning journey with AI Tutor')}
        >
          Continue your learning journey with AI Tutor
        </p>
      </div>
      
      {/* Quick Actions */}
      <section className="mb-10" aria-labelledby="quick-actions-heading">
        <h2 
          id="quick-actions-heading" 
          className={`text-xl font-semibold mb-4 ${highContrast ? 'text-white' : 'text-white'}`}
          onMouseEnter={() => handleHover('Quick Actions')}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Upload Document */}
          <Link 
            to="/dashboard/upload" 
            className={`flex flex-col items-center justify-center p-6 rounded-lg ${
              highContrast 
                ? 'bg-gray-900 border border-white hover:bg-gray-800' 
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } transition-colors duration-200`}
            onMouseEnter={() => handleHover('Upload Document')}
          >
            <Upload className={`h-10 w-10 mb-3 ${highContrast ? 'text-white' : 'text-blue-400'}`} aria-hidden="true" />
            <span className={`text-lg font-medium ${highContrast ? 'text-white' : 'text-white'}`}>
              Upload Document
            </span>
          </Link>
          
          {/* Chat with AI Tutor */}
          <Link 
            to="/dashboard/chat" 
            className={`flex flex-col items-center justify-center p-6 rounded-lg ${
              highContrast 
                ? 'bg-gray-900 border border-white hover:bg-gray-800' 
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } transition-colors duration-200`}
            onMouseEnter={() => handleHover('Chat with AI Tutor')}
          >
            <MessageSquare className={`h-10 w-10 mb-3 ${highContrast ? 'text-white' : 'text-purple-400'}`} aria-hidden="true" />
            <span className={`text-lg font-medium ${highContrast ? 'text-white' : 'text-white'}`}>
              Chat with AI Tutor
            </span>
          </Link>
          
        </div>
      </section>
      
      {/* Recent Documents */}
      <section className="mb-10" aria-labelledby="recent-documents-heading">
        <div className="flex justify-between items-center mb-4">
          <h2 
            id="recent-documents-heading" 
            className={`text-xl font-semibold ${highContrast ? 'text-white' : 'text-white'}`}
            onMouseEnter={() => handleHover('Recent Documents')}
          >
            Recent Documents
          </h2>
          
          <Link 
            to="/dashboard/documents" 
            className={`flex items-center text-sm font-medium ${
              highContrast ? 'text-white hover:underline' : 'text-blue-400 hover:text-blue-300'
            }`}
            onMouseEnter={() => handleHover('View all documents')}
          >
            View all
            <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
          </Link>
        </div>
        
        {loading ? (
          <div className={`rounded-lg ${highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-800/50'} p-6 flex justify-center`}>
            <div className="animate-spin h-8 w-8 border-2 border-t-transparent rounded-full border-white"></div>
          </div>
        ) : recentDocuments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentDocuments.map((doc) => (
              <Link 
                key={doc.id} 
                to={`/dashboard/documents/${doc.id}`}
                className={`block rounded-lg p-5 ${
                  highContrast 
                    ? 'bg-gray-900 border border-white hover:bg-gray-800' 
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                } transition-colors duration-200`}
                onMouseEnter={() => handleHover(doc.title)}
              >
                <div className="flex items-start mb-3">
                  <FileText className={`h-6 w-6 mr-2 flex-shrink-0 ${highContrast ? 'text-white' : 'text-blue-400'}`} aria-hidden="true" />
                  <h3 className={`text-base font-medium truncate ${highContrast ? 'text-white' : 'text-white'}`}>
                    {doc.title}
                  </h3>
                </div>
                
                <div className={`flex items-center text-xs ${highContrast ? 'text-gray-200' : 'text-gray-400'}`}>
                  <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />
                  <span>Last accessed: {formatDate(doc.lastAccessed)}</span>
                </div>
                
                <div className="mt-2 flex items-center justify-between">
                  <span className={`text-xs ${highContrast ? 'text-gray-200' : 'text-gray-400'}`}>
                    {doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}
                  </span>
                  
                  {doc.processingStatus === 'pending' && (
                    <span className="text-xs bg-yellow-700/30 text-yellow-300 px-2 py-1 rounded">
                      Processing
                    </span>
                  )}
                  
                  {doc.processingStatus === 'completed' && (
                    <span className="text-xs bg-green-700/30 text-green-300 px-2 py-1 rounded">
                      Ready
                    </span>
                  )}
                  
                  {doc.processingStatus === 'error' && (
                    <span className="text-xs bg-red-700/30 text-red-300 px-2 py-1 rounded">
                      Error
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={`rounded-lg ${highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-800/50'} p-8 text-center`}>
            <p className={`mb-4 ${highContrast ? 'text-white' : 'text-gray-300'}`}>
              You haven't uploaded any documents yet.
            </p>
            <Link 
              to="/dashboard/upload" 
              className={`inline-flex items-center px-4 py-2 rounded-md ${
                highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'
              } font-medium transition-colors duration-200`}
              onMouseEnter={() => handleHover('Upload your first document')}
            >
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              Upload your first document
            </Link>
          </div>
        )}
      </section>
      
      {/* No additional sections beyond recent documents to keep layout clean */}
    </div>
  );
};

export default Dashboard;
