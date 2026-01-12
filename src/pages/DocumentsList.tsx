import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Upload,
  Search,
  ChevronRight,
  Calendar,
  AlertCircle,
  Loader,
  Folder,
  Tag,
  Clock,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import axios from 'axios';

interface Document {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  created_at: string;
  updated_at: string;
  processing_status: string;
  content_length: number;
}

const DocumentsList: React.FC = () => {
  const { currentUser } = useAuth();
  const { speakText, uiTtsEnabled, highContrast } = useAccessibility();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Function to handle TTS for interactive elements
  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  // Fetch documents on component mount
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);

        // Get user's Firebase ID token
        const token = await currentUser.getIdToken();

        if (!token) {
          throw new Error('Authentication token not available');
        }

        // Get the backend API URL from environment variables
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';

        // Fetch documents
        const response = await axios.get(`${apiUrl}/api/documents`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setDocuments(response.data || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
        setError('Failed to load documents. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [currentUser]);

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort documents based on sort criteria
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(sortOrder === 'asc' ? a.created_at : b.created_at).getTime();
      const dateB = new Date(sortOrder === 'asc' ? b.created_at : a.created_at).getTime();
      return dateA - dateB;
    } else if (sortBy === 'name') {
      return sortOrder === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else { // type
      return sortOrder === 'asc'
        ? a.file_type.localeCompare(b.file_type)
        : b.file_type.localeCompare(a.file_type);
    }
  });

  // Format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Get appropriate icon for file type
  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <FileText className={highContrast ? "text-white" : "text-red-400"} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <FileText className={highContrast ? "text-white" : "text-blue-400"} />;
      case 'txt':
        return <FileText className={highContrast ? "text-white" : "text-gray-400"} />;
      case 'doc':
      case 'docx':
        return <FileText className={highContrast ? "text-white" : "text-blue-500"} />;
      default:
        return <FileText className={highContrast ? "text-white" : "text-gray-400"} />;
    }
  };

  // Function to handle delete click
  const handleDeleteClick = (docId: string) => {
    if (uiTtsEnabled) {
      speakText(`Delete document. Confirm action.`);
    }
    setDocumentToDelete(docId);
    setShowDeleteConfirm(true);
  };

  // Function to confirm deletion
  const confirmDelete = async () => {
    if (!documentToDelete || !currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }
      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';

      await axios.delete(`${apiUrl}/api/documents/${documentToDelete}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Update UI
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentToDelete));
      if (uiTtsEnabled) {
        speakText('Document deleted successfully.');
      }
      // Optionally, show a toast notification here
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
      if (uiTtsEnabled) {
        speakText('Failed to delete document.');
      }
      // Optionally, show an error toast notification here
    } finally {
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
    }
  };

  // Function to cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDocumentToDelete(null);
    if (uiTtsEnabled) {
      speakText('Deletion cancelled.');
    }
  };

  // Handle sort change
  const handleSortChange = (criteria: 'date' | 'name' | 'type') => {
    if (sortBy === criteria) {
      // Toggle order if clicking on the same criteria
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new criteria and default to descending for date, ascending for others
      setSortBy(criteria);
      setSortOrder(criteria === 'date' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1
          className={`text-2xl font-bold ${highContrast ? 'text-white' : 'text-white'}`}
          onMouseEnter={() => handleHover('My Documents')}
        >
          My Documents
        </h1>

        <div className="flex space-x-3">
          <Link
            to="/dashboard/upload"
            state={{ initialTab: 'text' }}
            className={`flex items-center px-4 py-2 rounded-md border ${highContrast
                ? 'border-white text-white hover:bg-gray-800'
                : 'border-blue-600 text-blue-400 hover:bg-blue-900/30'
              } transition-colors duration-200`}
            onMouseEnter={() => handleHover('Create a new document from text')}
          >
            <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
            Paste Text
          </Link>

          <Link
            to="/dashboard/upload"
            className={`flex items-center px-4 py-2 rounded-md ${highContrast
                ? 'bg-white text-black hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              } transition-colors duration-200`}
            onMouseEnter={() => handleHover('Upload New Document')}
          >
            <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
            Upload New Document
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <div className={`p-4 mb-6 rounded-lg ${highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-800/50'}`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${highContrast ? 'text-white' : 'text-gray-400'}`} aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 pr-4 py-2 w-full rounded-md ${highContrast
                  ? 'bg-black border border-white text-white placeholder-gray-400'
                  : 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Search documents"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleSortChange('date')}
              className={`px-3 py-2 rounded-md flex items-center ${sortBy === 'date'
                  ? highContrast
                    ? 'bg-white text-black'
                    : 'bg-blue-600 text-white'
                  : highContrast
                    ? 'bg-gray-900 border border-white text-white hover:bg-gray-800'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors duration-200`}
              aria-pressed={sortBy === 'date'}
              onMouseEnter={() => handleHover('Sort by date')}
            >
              <Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
              Date
              {sortBy === 'date' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>

            <button
              onClick={() => handleSortChange('name')}
              className={`px-3 py-2 rounded-md flex items-center ${sortBy === 'name'
                  ? highContrast
                    ? 'bg-white text-black'
                    : 'bg-blue-600 text-white'
                  : highContrast
                    ? 'bg-gray-900 border border-white text-white hover:bg-gray-800'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors duration-200`}
              aria-pressed={sortBy === 'name'}
              onMouseEnter={() => handleHover('Sort by name')}
            >
              <Tag className="h-4 w-4 mr-1" aria-hidden="true" />
              Name
              {sortBy === 'name' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>

            <button
              onClick={() => handleSortChange('type')}
              className={`px-3 py-2 rounded-md flex items-center ${sortBy === 'type'
                  ? highContrast
                    ? 'bg-white text-black'
                    : 'bg-blue-600 text-white'
                  : highContrast
                    ? 'bg-gray-900 border border-white text-white hover:bg-gray-800'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors duration-200`}
              aria-pressed={sortBy === 'type'}
              onMouseEnter={() => handleHover('Sort by file type')}
            >
              <Folder className="h-4 w-4 mr-1" aria-hidden="true" />
              Type
              {sortBy === 'type' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className={`h-12 w-12 animate-spin mb-4 ${highContrast ? 'text-white' : 'text-blue-400'}`} />
          <p className={`text-lg ${highContrast ? 'text-white' : 'text-gray-300'}`}>Loading your documents...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className={`h-12 w-12 mb-4 ${highContrast ? 'text-white' : 'text-red-400'}`} />
          <p className={`text-lg mb-2 ${highContrast ? 'text-white' : 'text-gray-300'}`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 mt-4 rounded-md ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'
              } transition-colors duration-200`}
          >
            Try Again
          </button>
        </div>
      ) : sortedDocuments.length === 0 ? (
        <div className={`rounded-lg ${highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-800/50'} p-8 text-center`}>
          {searchQuery ? (
            <div>
              <p className={`mb-4 ${highContrast ? 'text-white' : 'text-gray-300'}`}>
                No documents match your search query.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className={`px-4 py-2 rounded-md ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                  } transition-colors duration-200`}
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div>
              <p className={`mb-4 ${highContrast ? 'text-white' : 'text-gray-300'}`}>
                You haven't uploaded any documents yet.
              </p>
              <Link
                to="/dashboard/upload"
                className={`inline-flex items-center px-4 py-2 rounded-md ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                  } font-medium transition-colors duration-200`}
                onMouseEnter={() => handleHover('Upload your first document')}
              >
                <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                Upload your first document
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedDocuments.map((doc) => (
            <Link
              key={doc.id}
              to={`/dashboard/documents/${doc.id}`}
              className={`block p-4 rounded-lg ${highContrast
                  ? 'bg-gray-900 border border-white hover:bg-gray-800'
                  : 'bg-gray-800/50 hover:bg-gray-700/50'
                } transition-colors duration-200`}
              onMouseEnter={() => handleHover(doc.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className={`p-3 rounded-md mr-4 ${highContrast ? 'bg-black' : 'bg-gray-700'}`}>
                    {getFileTypeIcon(doc.file_type)}
                  </div>

                  <div>
                    <h2 className={`text-lg font-medium ${highContrast ? 'text-white' : 'text-white'} mb-1`}>
                      {doc.name}
                    </h2>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className={`flex items-center text-xs ${highContrast ? 'text-gray-300' : 'text-gray-400'}`}>
                        <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />
                        {formatDate(doc.created_at)}
                      </span>

                      <span className={`flex items-center text-xs ${highContrast ? 'text-gray-300' : 'text-gray-400'}`}>
                        <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
                        {doc.file_type.toUpperCase()}
                      </span>

                      <span className={`flex items-center text-xs ${highContrast ? 'text-gray-300' : 'text-gray-400'}`}>
                        <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                        {Math.round(doc.content_length / 1000)}K characters
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  {doc.processing_status === 'pending' && (
                    <span className="text-xs bg-yellow-700/30 text-yellow-300 px-2 py-1 rounded mr-2">
                      Processing
                    </span>
                  )}

                  {doc.processing_status === 'completed' && (
                    <span className="text-xs bg-green-700/30 text-green-300 px-2 py-1 rounded mr-2">
                      Ready
                    </span>
                  )}

                  {doc.processing_status === 'error' && (
                    <span className="text-xs bg-red-700/30 text-red-300 px-2 py-1 rounded mr-2">
                      Error
                    </span>
                  )}

                  <ChevronRight
                    className={`h-5 w-5 ${highContrast ? 'text-white' : 'text-gray-400'}`}
                    aria-hidden="true"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault(); // Prevent link navigation
                      e.stopPropagation(); // Stop event bubbling
                      handleDeleteClick(doc.id);
                    }}
                    className={`p-1.5 rounded-full transition-colors duration-200 ${highContrast
                        ? 'text-red-400 hover:bg-red-700 hover:text-white focus:bg-red-700 focus:text-white'
                        : 'text-gray-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-700 dark:hover:text-white focus:bg-red-100 focus:text-red-500'
                      }`}
                    aria-label="Delete document"
                    onMouseEnter={() => handleHover('Delete this document')}
                    title="Delete Document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && documentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={`p-6 rounded-lg shadow-xl w-full max-w-md ${highContrast ? 'bg-black border-2 border-white' : 'bg-gray-800'}`}>
            <h3 className={`text-xl font-semibold mb-4 ${highContrast ? 'text-white' : 'text-white'}`}>Confirm Deletion</h3>
            <p className={`mb-6 ${highContrast ? 'text-gray-200' : 'text-gray-300'}`}>
              Are you sure you want to delete the document: <br />
              <strong className={`font-medium ${highContrast ? 'text-blue-300' : 'text-blue-400'}`}>{documents.find(d => d.id === documentToDelete)?.name || 'this document'}</strong>?
              <br /><br />This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className={`px-4 py-2 rounded-md font-medium ${highContrast
                    ? 'bg-gray-600 text-white hover:bg-gray-500 focus:ring-2 focus:ring-gray-400'
                    : 'bg-gray-600 text-white hover:bg-gray-500 focus:ring-2 focus:ring-gray-500'
                  } transition-colors`}
                onMouseEnter={() => handleHover('Cancel deletion')}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className={`px-4 py-2 rounded-md font-medium ${highContrast
                    ? 'bg-red-500 text-white hover:bg-red-400 focus:ring-2 focus:ring-red-300'
                    : 'bg-red-600 text-white hover:bg-red-500 focus:ring-2 focus:ring-red-500'
                  } transition-colors`}
                onMouseEnter={() => handleHover('Confirm delete document')}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsList;
