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

  const documentIdFromUrl = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('document') || undefined;
  }, [location.search]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [document, setDocument] = useState<{ id: string; name: string } | null>(null);
  const [isQuiz, setIsQuiz] = useState<boolean>(false);
  const quizInitializationAttempted = useRef(false);

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
        threadId: undefined
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

  const handleAudioSend = useCallback((audioBlob: Blob, transcript?: string) => {
    const userMessageId = `user-audio-${Date.now()}`;
    const userMessageText = transcript || 'Processing audio input...';
    const userMsgObject: ChatMessage = {
      id: userMessageId,
      text: userMessageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
      isQuizQuestion: isQuiz,
      isPending: true,
      document_id: documentIdFromUrl || undefined,
      thread_id: threadId || undefined,
    };

    setMessages(prev => [...prev, userMsgObject]);
    setIsLoading(true);

    const sendAudioAsync = async () => {
      try {
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');
        if (documentIdFromUrl) {
          formData.append('document_id', documentIdFromUrl);
        }
        if (threadId) {
          formData.append('thread_id', threadId);
        }
        if (transcript) {
          formData.append('transcript', transcript); // Send transcript if available
        }

        // Use apiService.uploadAudioMessage which is expected to handle FormData
        // The response type from uploadAudioMessage might be different from ChatApiResponse,
        // so we'll call it rawApiResponse and then map its fields.
        const rawApiResponse = await apiService.uploadAudioMessage(formData /*, { sttProcessingMode: 'direct_send' } // Optional: if API needs mode */);

        if (rawApiResponse.error) {
          throw new Error(rawApiResponse.error);
        }

        if (rawApiResponse.thread_id && !threadId) {
          setThreadId(rawApiResponse.thread_id);
        }

        // Update the user message: set isPending to false and use the final transcript from response if available
        const confirmedUserText = rawApiResponse.transcript || userMessageText;
        setMessages(prev => prev.map(m =>
          m.id === userMessageId ? { ...m, isPending: false, text: confirmedUserText, thread_id: rawApiResponse.thread_id || threadId } : m
        ));

        const aiMessageText = rawApiResponse.response || rawApiResponse.text || "Sorry, I couldn't process that.";
        const aiResponse: ChatMessage = {
          id: `ai-audio-response-${Date.now()}`,
          text: aiMessageText, // Mapped from rawApiResponse.response or rawApiResponse.text
          sender: 'agent',
          timestamp: new Date().toISOString(),
          isQuizQuestion: rawApiResponse.quiz_active || false, // Mapped from rawApiResponse.quiz_active
          // options: rawApiResponse.options || undefined, // uploadAudioMessage might not return options
          document_id: documentIdFromUrl || undefined,
          thread_id: rawApiResponse.thread_id || threadId || undefined,
          // audio_content_base64: rawApiResponse.audio_content_base64 || null, // uploadAudioMessage might not return this
        };
        setMessages(prev => [...prev, aiResponse]);

        if (rawApiResponse.quiz_active) {
          setIsQuiz(true);
        }

      } catch (error: any) {
        console.error('Error sending audio message:', error);
        toast.error(error.message || 'Failed to send audio message.');
        setMessages(prev => prev.map(m => m.id === userMessageId ? { ...m, isPending: false, isError: true, text: userMessageText } : m));
      } finally {
        setIsLoading(false);
      }
    };

    sendAudioAsync().catch(err => {
      // Catch errors from the async IIFE if not handled internally, though internal handling is preferred.
      console.error("Error in sendAudioAsync execution:", err);
      // Ensure loading is false and user message reflects error if not already done
      setIsLoading(false);
      setMessages(prev => prev.map(m => 
        m.id === userMessageId && m.isPending ? { ...m, isPending: false, isError: true, text: userMessageText } : m
      ));
    });

  }, [documentIdFromUrl, threadId, isQuiz, setMessages, setIsLoading, setThreadId, setIsQuiz, toast]);

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
      const response: ChatApiResponse = await apiService.chat({
        query: messageText,
        documentId: documentIdFromUrl || undefined,
        threadId: threadId || undefined
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
          onAudioSend={handleAudioSend}
          onAudioError={(errMsg) => toast.error(errMsg)}
          onStartQuiz={handleStartQuiz}
          currentDocumentId={documentIdFromUrl}
          currentThreadId={threadId}
        />
      </div>
    </div>
  );
};

export default ChatPage;
