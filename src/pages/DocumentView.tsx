import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ChevronLeft,
  Download, 
  FileText, 
  MessageSquare, 
  StopCircle, 
  Play, 
  Pause,
  Loader2 as Loader,
  Layers,
  Book,
  AlertCircle,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useTTSPlayer } from '../hooks/useTTSPlayer';
import { useDocument } from '../contexts/DocumentContext';
import { SpeakableDocumentContent } from '../components/SpeakableDocumentContent';
import axios from 'axios';

interface DocumentData {
  id: string;
  name: string;
  content: string;
  full_content?: string;
  chunks?: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  file_type: string;
  original_filename: string;
  content_length: number;
}

const DocumentView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, getAuthToken } = useAuth();
  const {
    speakText,
    uiTtsEnabled,
    highContrast,
    toggleUiTts,
  } = useAccessibility();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'read' | 'chat' | 'quiz'>('read');
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineSpacing, setLineSpacing] = useState<number>(1.5);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveDocumentId } = useDocument();

  const { playAudio, stopAudio, seekAndPlay, status, activeTimepoint, wordTimepoints } = useTTSPlayer(
    id || null,
    document?.content || ''
  );

  const getButtonLabel = () => {
    if (status === 'loading') return 'Loading...';
    if (status === 'playing') return 'Pause';
    if (status === 'paused') return 'Resume';
    return 'Read Aloud';
  };

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  useEffect(() => {
    const fetchDocument = async () => {
      if (!currentUser || !id) return;
      setLoading(true);
      setError(null);
      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Authentication token not available');
        const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8081';
        const response = await axios.get(`${apiUrl}/api/documents/${id}?include_content=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setDocument(response.data);
      } catch (error) {
        console.error('Error fetching document:', error);
        setError('Failed to load document. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [currentUser, id, getAuthToken]);

  useEffect(() => {
    if (id) {
      setActiveDocumentId(id);
    }
  }, [id, setActiveDocumentId]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tabQueryParam = queryParams.get('tab');
    if (tabQueryParam === 'quiz') {
      setActiveTab('quiz');
    } else if (tabQueryParam === 'chat') {
      setActiveTab('chat');
    } else if (activeTab !== 'chat' && activeTab !== 'quiz') {
      setActiveTab('read');
    }
  }, [location.search, activeTab]);

  const handleDownload = async () => {
    if (!document) return;
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication token not available');
      const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8081';
      const response = await axios.get(`${apiUrl}/api/documents/${id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.original_filename || 'download';
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document.');
    }
  };

  const renderContent = () => {
    if (!document) return null;
    switch (activeTab) {
      case 'read':
        return (
          <div className="p-4 sm:p-6 lg:p-8" style={{ fontSize: `${fontSize}px`, lineHeight: lineSpacing }}>
            {(status === 'playing' || status === 'paused' || (wordTimepoints && wordTimepoints.length > 0)) ? (
              <SpeakableDocumentContent
                wordTimepoints={wordTimepoints}
                activeTimepoint={activeTimepoint}
                className="text-foreground"
                onWordClick={seekAndPlay}
              />
            ) : (
              <p className="whitespace-pre-wrap font-sans text-foreground">
                {document.content}
              </p>
            )}
          </div>
        );
      case 'chat':
        return (
          <div className="p-6 h-full flex flex-col items-center justify-center">
            <MessageSquare className={`h-16 w-16 mb-4 ${highContrast ? 'text-white' : 'text-blue-400'}`} />
            <h2 
              className={`text-xl font-semibold mb-2 ${highContrast ? 'text-white' : 'text-white'}`}
              onMouseEnter={() => handleHover('Ask Questions')}
            >
              Ask Questions
            </h2>
            <p 
              className={`text-center max-w-lg mb-6 ${highContrast ? 'text-gray-200' : 'text-gray-300'}`}
              onMouseEnter={() => handleHover('Chat with LexiAid about this document to get summaries or explanations.')}
            >
              Chat with LexiAid about this document to get summaries or explanations.
            </p>
            <button
              className={`px-6 py-3 rounded-md ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'} font-medium transition-colors duration-200 flex items-center`}
              onClick={() => navigate(`/dashboard/chat?document=${id}`)}
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Start Chat
            </button>
          </div>
        );
      case 'quiz':
        return (
          <div className="p-6 h-full flex flex-col items-center justify-center">
            <Layers className={`h-16 w-16 mb-4 ${highContrast ? 'text-white' : 'text-green-400'}`} />
            <h2 
              className={`text-xl font-semibold mb-2 ${highContrast ? 'text-white' : 'text-white'}`}
              onMouseEnter={() => handleHover('Test Your Knowledge')}
            >
              Test Your Knowledge
            </h2>
            <p 
              className={`text-center max-w-lg mb-6 ${highContrast ? 'text-gray-200' : 'text-gray-300'}`}
              onMouseEnter={() => handleHover('Generate quizzes based on this document to test your understanding.')}
            >
              Generate quizzes based on this document to test your understanding.
            </p>
            <button
              className={`px-6 py-3 rounded-md ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'} font-medium transition-colors duration-200 flex items-center`}
              onClick={() => navigate(`/dashboard/chat?document=${id}&start_quiz=true`)}
            >
              <Layers className="h-5 w-5 mr-2" />
              Generate Quiz
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader className="h-12 w-12 animate-spin text-blue-500" /></div>;
  if (error) return <div className="flex flex-col justify-center items-center h-screen text-red-500"><AlertCircle className="h-12 w-12 mb-4" /><p>{error}</p><button onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go to Dashboard</button></div>;

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${highContrast ? 'bg-black text-white' : 'bg-gray-900 text-gray-100'} min-h-screen flex flex-col`}>
      <header className="flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/dashboard')} className={`p-2 rounded-full ${highContrast ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} onMouseEnter={() => handleHover('Back to dashboard')}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className={`text-2xl font-bold ${highContrast ? 'text-white' : 'text-white'}`}>{document?.name || 'Document'}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-md ${highContrast ? 'bg-gray-700' : 'bg-gray-600'} text-white`} onMouseEnter={() => handleHover('Accessibility Settings')}> <Settings className="h-5 w-5" /> </button>
            <button onClick={handleDownload} className={`p-2 rounded-md ${highContrast ? 'bg-gray-700' : 'bg-gray-600'} text-white`} onMouseEnter={() => handleHover('Download document')}> <Download className="h-5 w-5" /> </button>
            <button onClick={playAudio} disabled={status === 'loading' || !document?.content} className={`px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-200 ${status === 'loading' ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`} onMouseEnter={() => handleHover(getButtonLabel())}>
              {status === 'loading' ? <Loader className="h-5 w-5 animate-spin" /> : status === 'playing' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              <span className="ml-2">{getButtonLabel()}</span>
            </button>
            {(status === 'playing' || status === 'paused') && (
              <button onClick={stopAudio} className={`px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-200 ${highContrast ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-red-600 text-white hover:bg-red-700'}`} onMouseEnter={() => handleHover('Stop reading')}>
                <StopCircle className="h-5 w-5" />
                <span className="ml-2">Stop</span>
              </button>
            )}
          </div>
        </div>
        {showSettings && (
          <div className={`mb-6 p-4 rounded-lg ${highContrast ? 'bg-gray-800' : 'bg-gray-700'}`}>
            <h2 
              className={`text-lg font-semibold mb-3 ${highContrast ? 'text-white' : 'text-white'}`}
              onMouseEnter={() => handleHover('Reading Settings')}
            >
              Reading Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label 
                  htmlFor="font-size" 
                  className={`block text-sm font-medium mb-1 ${highContrast ? 'text-white' : 'text-gray-300'}`}
                  onMouseEnter={() => handleHover(`Font Size: ${fontSize} pixels`)}
                >
                  Font Size: {fontSize}px
                </label>
                <input id="font-size" type="range" min="12" max="28" step="1" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label 
                  htmlFor="line-spacing" 
                  className={`block text-sm font-medium mb-1 ${highContrast ? 'text-white' : 'text-gray-300'}`}
                  onMouseEnter={() => handleHover(`Line Spacing: ${lineSpacing}`)}
                >
                  Line Spacing: {lineSpacing}
                </label>
                <input id="line-spacing" type="range" min="1" max="3" step="0.1" value={lineSpacing} onChange={(e) => setLineSpacing(Number(e.target.value))} className="w-full" />
              </div>
              <div className="flex items-center">
                <button onClick={toggleUiTts} className={`flex items-center px-4 py-2 rounded-md ${uiTtsEnabled ? (highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white') : (highContrast ? 'bg-gray-900 text-white border border-white' : 'bg-gray-700 text-gray-300')} transition-colors duration-200`}>
                  <Book className="h-5 w-5 mr-2" />
                  {uiTtsEnabled ? 'UI TTS: On' : 'UI TTS: Off'}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8" aria-label="Document navigation">
            <button className={`py-3 px-1 ${activeTab === 'read' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('read')} onMouseEnter={() => handleHover('Read document content')} aria-current={activeTab === 'read' ? 'page' : undefined}><FileText className="h-5 w-5 mr-2 inline-block" />Read</button>
            <button className={`py-3 px-1 ${activeTab === 'chat' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('chat')} onMouseEnter={() => handleHover('Chat with the document')} aria-current={activeTab === 'chat' ? 'page' : undefined}><MessageSquare className="h-5 w-5 mr-2 inline-block" />Chat</button>
            <button className={`py-3 px-1 ${activeTab === 'quiz' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`} onClick={() => setActiveTab('quiz')} onMouseEnter={() => handleHover('Test your knowledge')} aria-current={activeTab === 'quiz' ? 'page' : undefined}><Layers className="h-5 w-5 mr-2 inline-block" />Quiz</button>
          </nav>
        </div>
      </header>
      <main className="flex-grow overflow-auto">
        <div className={`${highContrast ? 'bg-gray-900' : 'bg-gray-800/50'} rounded-lg h-full`}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default DocumentView;