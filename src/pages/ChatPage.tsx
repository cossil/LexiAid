import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { useAccessibility } from '../contexts/AccessibilityContext';
import apiService from '../services/api';
import GeminiChatInterface from '../components/GeminiChatInterface';
import { ChatMessage } from '../types/document';

// Assuming ChatApiResponse is also used by the audio endpoint for consistency.
interface ChatApiResponse {
  agent_response?: string;
  thread_id?: string;
  is_quiz?: boolean;
  options?: string[];
  quiz_complete?: boolean;
  quiz_cancelled?: boolean;
  error_detail?: string;
  audio_content_base64?: string | null;
  timepoints?: Array<{ mark_name: string; time_seconds: number }> | null;
  transcript?: string; // Added for audio responses
}

const ChatPage: React.FC = () => {
  useAccessibility();
  const location = useLocation();
  const navigate = useNavigate();
  const chatResetToken = (location.state as { chatResetToken?: string } | null)?.chatResetToken;

  const documentIdFromUrl = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('document') || undefined;
  }, [location.search]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [threadId, setThreadId] = useState<string | undefined>(() => {
    const stored = localStorage.getItem('active_chat_thread_id');
    return stored || undefined;
  });
  const [document, setDocument] = useState<{ id: string; name: string } | null>(null);
  const [isQuiz, setIsQuiz] = useState<boolean>(false);
  const quizInitializationAttempted = useRef(false);
  const lastNavigationSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const navigationSignature = `${location.key || 'initial'}:${chatResetToken ?? 'none'}`;
    if (lastNavigationSignatureRef.current === navigationSignature) {
      return; // Avoid duplicate resets when React StrictMode replays effects
    }

    lastNavigationSignatureRef.current = navigationSignature;

    // Soft reset when navigating (even to the same path) so chat UI becomes primary again
    setIsQuiz(false);
    quizInitializationAttempted.current = false;
  }, [location.key, chatResetToken]);

  useEffect(() => {
    if (threadId) {
      localStorage.setItem('active_chat_thread_id', threadId);
    }
  }, [threadId]);

  useEffect(() => {
    const restoreHistory = async () => {
      if (threadId && messages.length === 0) {
        setIsLoading(true);
        try {
          const historyMessages = await apiService.getChatHistory(threadId);
          
          if (historyMessages && historyMessages.length > 0) {
            const restoredMessages: ChatMessage[] = historyMessages.map((msg, index) => ({
              id: `history-${index}-${Date.now()}`,
              text: msg.content,
              sender: msg.type === 'human' ? 'user' : 'agent',
              timestamp: new Date().toISOString(),
              thread_id: threadId,
              document_id: documentIdFromUrl
            }));
            setMessages(restoredMessages);
          }
        } catch (error) {
          console.error('Failed to restore history:', error);
          localStorage.removeItem('active_chat_thread_id');
          setThreadId(undefined);
        } finally {
          setIsLoading(false);
        }
      }
    };

    restoreHistory();
  }, [threadId, documentIdFromUrl]);

  useEffect(() => {
    const fetchDocumentDetails = () => {
      if (documentIdFromUrl) {
        try {
          setDocument({ id: documentIdFromUrl, name: `Document ${documentIdFromUrl.substring(0, 8)}...` });
        } catch (error) {
          console.error('Error setting document details:', error);
          setDocument(null);
        }
      } else {
        setDocument(null);
      }
    };
    fetchDocumentDetails();
  }, [documentIdFromUrl]);

  const handleStartQuiz = useCallback(async () => {
    if (!documentIdFromUrl) {
      toast.error("A document must be loaded to start a quiz.");
      return;
    }
    if (quizInitializationAttempted.current) return;

    setIsLoading(true);
    setIsQuiz(true);
    quizInitializationAttempted.current = true;

    try {
      const response: ChatApiResponse = await apiService.chat({
        query: '/start_quiz',
        documentId: documentIdFromUrl,
        threadId: undefined,
        mode: 'quiz'
      });

      if (response.thread_id) {
        setThreadId(response.thread_id);
      }

      const aiResponse: ChatMessage = {
        id: `ai-quiz-start-${Date.now()}`,
        text: response.agent_response || 'Starting quiz...',
        sender: 'agent',
        timestamp: new Date().toISOString(),
        isQuizQuestion: response.is_quiz || false,
        options: response.options || undefined,
        document_id: documentIdFromUrl,
        thread_id: response.thread_id,
        audio_content_base64: response.audio_content_base64 || null,
        timepoints: response.timepoints || undefined,
      };

      setMessages(prevMessages => [...prevMessages, aiResponse]);
    } catch (error: any) {
      console.error('Error starting quiz:', error);
      toast.error(error.message || 'Failed to start quiz.');
      setIsQuiz(false);
      quizInitializationAttempted.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [documentIdFromUrl]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const shouldStartQuiz = searchParams.get('start_quiz') === 'true';

    if (shouldStartQuiz && documentIdFromUrl && !quizInitializationAttempted.current) {
      handleStartQuiz();
    }
  }, [location.search, documentIdFromUrl, handleStartQuiz]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    const userMessageId = `user-text-${Date.now()}`;
    const userMsgObject: ChatMessage = {
      id: userMessageId,
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
      isQuizQuestion: isQuiz,
      isPending: true,
      document_id: documentIdFromUrl || undefined,
      thread_id: threadId || undefined,
    };

    setMessages(prevMessages => [...prevMessages, userMsgObject]);
    setIsLoading(true);

    try {
      const modeToSend: 'general_chat' | 'quiz' = isQuiz ? 'quiz' : 'general_chat';

      const response: ChatApiResponse = await apiService.chat({
        query: messageText,
        documentId: documentIdFromUrl || undefined,
        threadId: threadId || undefined,
        mode: modeToSend
      });

      if (response.thread_id && !threadId) {
        setThreadId(response.thread_id);
      }

      setMessages(prev => {
        // First, map over the previous messages to update the user's message.
        const updatedMessages = prev.map(m =>
          m.id === userMessageId ? { ...m, isPending: false, isError: false, thread_id: response.thread_id || threadId } : m
        );

        // Then, create the new AI message.
        const aiResponse: ChatMessage = {
          id: `ai-text-response-${Date.now()}`,
          text: response.agent_response || 'Sorry, I could not process that.', // Use 'agent_response' field as per existing ChatApiResponse
          sender: 'agent',
          timestamp: new Date().toISOString(),
          isQuizQuestion: response.is_quiz || false,
          audio_content_base64: response.audio_content_base64 || null,
          timepoints: response.timepoints || undefined,
          options: response.options || undefined,
          document_id: documentIdFromUrl || undefined,
          thread_id: response.thread_id || threadId || undefined,
        };

        // Return the new array containing both the updated user message and the new AI message.
        return [...updatedMessages, aiResponse];
      });

      if (response.is_quiz) {
        setIsQuiz(true);
      } else if (response.quiz_complete || response.quiz_cancelled) {
        setIsQuiz(false);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message.');
      setMessages(prev => prev.map(m => m.id === userMessageId ? { ...m, isPending: false, isError: true } : m));
    } finally {
      setIsLoading(false);
    }
  }, [documentIdFromUrl, threadId, isQuiz]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm py-4 px-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-4"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isQuiz ? 'Quiz Mode' : 'Chat with AI Tutor'}
          </h1>
          {documentIdFromUrl && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Document: {document ? document.name : `ID: ${documentIdFromUrl.substring(0, 8)}...`}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <GeminiChatInterface
          messages={messages}
          isSendingMessage={isLoading}
          onSendMessage={handleSendMessage}
          onStartQuiz={handleStartQuiz}
          currentDocumentId={documentIdFromUrl}
          currentThreadId={threadId}
        />
      </div>
    </div>
  );
};

export default ChatPage;
