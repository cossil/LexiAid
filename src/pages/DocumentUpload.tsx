import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  File, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Info,
  FileText,
  Loader
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import axios from 'axios';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  'application/pdf': <FileText className="text-red-400" />,
  'image/png': <File className="text-blue-400" />,
  'image/jpeg': <File className="text-blue-400" />,
  'text/plain': <File className="text-gray-400" />,
  'application/msword': <FileText className="text-blue-400" />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FileText className="text-blue-400" />
};

const MIME_TYPE_NAMES: Record<string, string> = {
  'application/pdf': 'PDF Document',
  'image/png': 'PNG Image',
  'image/jpeg': 'JPEG Image',
  'text/plain': 'Text File',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document'
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

interface FileWithPreview extends File {
  preview?: string;
}

const DocumentUpload: React.FC = () => {
  const { currentUser } = useAuth();
  const { speakText, uiTtsEnabled, highContrast } = useAccessibility();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [error, setError] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [documentName, setDocumentName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Function to handle TTS for interactive elements
  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    // Validate file type and size
    const newFile = acceptedFiles[0];
    
    if (!ALLOWED_TYPES.includes(newFile.type)) {
      setError(`File type not supported. Please upload a PDF, image, or document file.`);
      return;
    }
    
    if (newFile.size > MAX_FILE_SIZE) {
      setError(`File is too large. Maximum file size is 15MB.`);
      return;
    }
    
    // Clear any previous errors
    setError('');
    
    // Set document name based on file name (without extension)
    const fileName = newFile.name.split('.').slice(0, -1).join('.');
    setDocumentName(fileName);
    
    // Add file to state
    setFiles([newFile]);
    
    // Create preview for images
    if (newFile.type.startsWith('image/')) {
      const fileWithPreview = Object.assign(newFile, {
        preview: URL.createObjectURL(newFile)
      });
      setFiles([fileWithPreview]);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDrop(Array.from(e.dataTransfer.files));
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onDrop(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setDocumentName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select a file to upload');
      return;
    }

    if (!documentName.trim()) {
      setError('Please enter a document name');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('name', documentName);

    try {
      // Determine API URL from environment variable or default
      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8081'; 
      const url = `${apiUrl}/api/documents/upload`; // Ensure '/upload' is present

      console.log('Attempting to POST to URL:', url); // Debugging line

      // Get user's Firebase ID token
      const token = await currentUser?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          );
          setUploadProgress(progress);
        }
      });

      // Handle success
      setUploadSuccess(true);
      
      // Navigate to document detail page after 1.5 seconds
      setTimeout(() => {
        navigate(`/dashboard/documents/${response.data.document.id}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 
        className={`text-3xl font-bold mb-6 ${highContrast ? 'text-white' : 'text-white'}`}
        onMouseEnter={() => handleHover('Upload Document')}
      >
        Upload Document
      </h1>
      
      <div className={`mb-6 p-4 rounded-lg ${highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-800/60'}`}>
        <div className="flex items-start">
          <Info className={`mr-3 h-5 w-5 flex-shrink-0 ${highContrast ? 'text-white' : 'text-blue-400'}`} />
          <div>
            <h2 className={`text-lg font-medium ${highContrast ? 'text-white' : 'text-white'} mb-2`}>
              Document Processing with AI Tutor
            </h2>
            <ul className={`list-disc list-inside space-y-1 ${highContrast ? 'text-gray-200' : 'text-gray-300'}`}>
              <li>Upload any document: PDF, image with text, Word document, or text file</li>
              <li>AI Tutor will process the text content, making it accessible for your learning</li>
              <li>Once processed, you can read, get summaries, and ask questions about the material</li>
              <li>Maximum file size: 15MB</li>
            </ul>
          </div>
        </div>
      </div>
      
      {error && (
        <div 
          className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center">
            <AlertCircle className={`h-5 w-5 ${highContrast ? 'text-white' : 'text-red-400'} mr-2`} aria-hidden="true" />
            <p className={`${highContrast ? 'text-white' : 'text-red-300'}`}>{error}</p>
          </div>
        </div>
      )}
      
      {uploadSuccess ? (
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <CheckCircle className={`h-16 w-16 mb-4 ${highContrast ? 'text-white' : 'text-green-500'}`} aria-hidden="true" />
          <h2 className={`text-xl font-bold mb-2 ${highContrast ? 'text-white' : 'text-white'}`}>Upload Successful!</h2>
          <p className={`mb-6 ${highContrast ? 'text-gray-200' : 'text-gray-300'}`}>
            Your document is being processed. You'll be redirected shortly...
          </p>
        </div>
      ) : (
        <>
          {/* File upload area */}
          <div 
            className={`mb-6 border-2 border-dashed rounded-lg p-10 text-center ${
              highContrast 
                ? 'border-white hover:border-gray-300 bg-gray-900' 
                : 'border-gray-600 hover:border-blue-500 bg-gray-800/30'
            } transition-colors duration-200 cursor-pointer`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            onMouseEnter={() => handleHover('Drag and drop your file here, or click to browse')}
            role="button"
            aria-label="Upload document area"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
              onChange={handleFileInputChange}
              aria-hidden="true"
            />
            
            {files.length === 0 ? (
              <div className="space-y-3">
                <Upload className={`mx-auto h-12 w-12 ${highContrast ? 'text-white' : 'text-blue-400'}`} aria-hidden="true" />
                <h3 className={`text-lg font-medium ${highContrast ? 'text-white' : 'text-white'}`}>
                  Drag and drop your file here
                </h3>
                <p className={`${highContrast ? 'text-gray-300' : 'text-gray-400'}`}>
                  or <span className={`${highContrast ? 'text-white underline' : 'text-blue-400'}`}>browse</span> to upload
                </p>
                <p className={`text-sm ${highContrast ? 'text-gray-400' : 'text-gray-500'}`}>
                  Supported formats: PDF, PNG, JPG, TXT, DOC, DOCX
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center">
                  {files[0].type.startsWith('image/') && files[0].preview ? (
                    <img 
                      src={files[0].preview} 
                      alt="Document preview" 
                      className="h-32 object-contain rounded border border-gray-700"
                    />
                  ) : (
                    <div className={`h-16 w-16 flex items-center justify-center rounded-full ${highContrast ? 'bg-white' : 'bg-gray-700'}`}>
                      {FILE_TYPE_ICONS[files[0].type] || <File className={highContrast ? 'text-black' : 'text-gray-300'} />}
                    </div>
                  )}
                </div>
                <h3 className={`text-lg font-medium ${highContrast ? 'text-white' : 'text-white'}`}>
                  {files[0].name}
                </h3>
                <p className={`text-sm ${highContrast ? 'text-gray-300' : 'text-gray-400'}`}>
                  {MIME_TYPE_NAMES[files[0].type] || 'Document'} • {(files[0].size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className={`inline-flex items-center px-3 py-1 rounded ${
                    highContrast 
                      ? 'bg-white text-black hover:bg-gray-200' 
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  } text-sm transition-colors duration-200`}
                  aria-label="Remove file"
                  onMouseEnter={() => handleHover('Remove file')}
                >
                  <X className="h-4 w-4 mr-1" aria-hidden="true" />
                  Remove
                </button>
              </div>
            )}
          </div>
          
          {/* Document name input */}
          <div className="mb-8">
            <label 
              htmlFor="document-name" 
              className={`block text-sm font-medium mb-2 ${highContrast ? 'text-white' : 'text-gray-300'}`}
            >
              Document Name
            </label>
            <input
              type="text"
              id="document-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className={`block w-full px-4 py-3 rounded-md ${
                highContrast 
                  ? 'bg-gray-900 text-white border border-white focus:border-blue-500' 
                  : 'bg-gray-700 text-white border border-gray-600 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter a name for your document"
              aria-required="true"
              disabled={isUploading}
            />
            <p className={`mt-1 text-sm ${highContrast ? 'text-gray-300' : 'text-gray-400'}`}>
              This name will help you identify the document later
            </p>
          </div>
          
          {/* Upload progress */}
          {isUploading && (
            <div className="mb-6">
              <div className="flex justify-between mb-1">
                <span className={`text-sm ${highContrast ? 'text-white' : 'text-gray-300'}`}>
                  Uploading...
                </span>
                <span className={`text-sm ${highContrast ? 'text-white' : 'text-gray-300'}`}>
                  {uploadProgress}%
                </span>
              </div>
              <div className={`w-full h-2 bg-gray-700 rounded-full overflow-hidden`}>
                <div 
                  className={`h-full ${highContrast ? 'bg-white' : 'bg-blue-500'} transition-all duration-300 ease-in-out`}
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={`px-4 py-2 rounded-md ${
                highContrast 
                  ? 'bg-gray-900 text-white border border-white hover:bg-gray-800' 
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              } font-medium transition-colors duration-200`}
              disabled={isUploading}
              onMouseEnter={() => handleHover('Cancel')}
            >
              Cancel
            </button>
            
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
              className={`px-6 py-2 rounded-md ${
                highContrast 
                  ? 'bg-white text-black hover:bg-gray-200 disabled:bg-gray-500 disabled:text-gray-800' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-500/50 disabled:text-gray-300'
              } font-medium transition-colors duration-200 flex items-center`}
              onMouseEnter={() => handleHover(isUploading ? 'Uploading...' : 'Upload Document')}
            >
              {isUploading ? (
                <>
                  <Loader className="animate-spin h-5 w-5 mr-2" aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" aria-hidden="true" />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentUpload;
