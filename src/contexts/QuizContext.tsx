import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import apiService from '../services/api';
import { toast } from 'react-hot-toast';

interface QuizContextType {
  quizThreadId: string | null;
  startQuizSession: (threadId: string) => void;
  cancelQuizSession: () => Promise<void>;
  isCancelling: boolean;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [quizThreadId, setQuizThreadId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const startQuizSession = (threadId: string) => {
    setQuizThreadId(threadId);
  };

  const cancelQuizSession = useCallback(async () => {
    if (!quizThreadId) return;

    setIsCancelling(true);
    try {
      await apiService.cancelQuiz(quizThreadId);
      toast.success('Quiz session ended.');
      setQuizThreadId(null);
    } catch (error) {
      console.error('Failed to cancel quiz session:', error);
      toast.error('Could not end the quiz session. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  }, [quizThreadId]);

  const value = {
    quizThreadId,
    startQuizSession,
    cancelQuizSession,
    isCancelling,
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
};

export const useQuiz = (): QuizContextType => {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};

export default QuizProvider;
