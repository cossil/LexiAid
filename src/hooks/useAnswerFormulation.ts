/**
 * useAnswerFormulation Hook
 * 
 * Main state management hook for the Answer Formulation feature.
 * Handles dictation, refinement, editing, and auto-pause functionality.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/api';
import type { RefineAnswerResponse, EditAnswerResponse } from '../services/api';
import useRealtimeStt from './useRealtimeStt';
import { useAuth } from '../contexts/AuthContext';

// Status types for the answer formulation workflow
export type AnswerFormulationStatus = 
  | 'idle'           // Initial state, no activity
  | 'recording'      // Currently recording audio
  | 'refining'       // AI is refining the transcript
  | 'refined'        // Refinement complete, ready for review/edit
  | 'editing'        // Applying an edit command
  | 'finalized';     // User has finalized the answer

export interface UseAnswerFormulationReturn {
  // Question and transcript state
  question: string;
  setQuestion: (q: string) => void;
  transcript: string;
  refinedAnswer: string | null;
  updateRefinedAnswer: (answer: string) => void;
  
  // Status and session
  status: AnswerFormulationStatus;
  sessionId: string | null;
  fidelityScore: number | null;
  iterationCount: number;
  error: string | null;
  
  // Auto-pause settings
  autoPauseEnabled: boolean;
  setAutoPauseEnabled: (enabled: boolean) => void;
  pauseDuration: number; // in seconds
  setPauseDuration: (duration: number) => void;
  pauseCountdown: number | null; // countdown timer when pause detected
  
  // Actions
  startDictation: () => Promise<void>;
  stopDictation: () => void;
  refineAnswer: () => Promise<void>;
  editAnswer: (command: string) => Promise<void>;
  finalizeAnswer: () => void;
  reset: () => void;
  updateManualTranscript: (text: string) => void;
  interimTranscript: string;
}

export const useAnswerFormulation = (): UseAnswerFormulationReturn => {
  const { userPreferences, updateUserPreferences } = useAuth();
  
  // Question and transcript state
  const [question, setQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [refinedAnswer, setRefinedAnswer] = useState<string | null>(null);
  
  // Status and session state
  const [status, setStatus] = useState<AnswerFormulationStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fidelityScore, setFidelityScore] = useState<number | null>(null);
  const [iterationCount, setIterationCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-pause settings (loaded from user preferences)
  const [autoPauseEnabled, setAutoPauseEnabledState] = useState(
    userPreferences?.answerFormulationAutoPause ?? false
  );
  const [pauseDuration, setPauseDurationState] = useState(
    userPreferences?.answerFormulationPauseDuration ?? 3.0
  );
  const [pauseCountdown, setPauseCountdown] = useState<number | null>(null);
  
  // Persist auto-pause settings to user preferences
  const setAutoPauseEnabled = useCallback((enabled: boolean) => {
    setAutoPauseEnabledState(enabled);
    updateUserPreferences({ answerFormulationAutoPause: enabled });
  }, [updateUserPreferences]);
  
  const setPauseDuration = useCallback((duration: number) => {
    setPauseDurationState(duration);
    updateUserPreferences({ answerFormulationPauseDuration: duration });
  }, [updateUserPreferences]);
  
  // STT integration
  const {
    startDictation: startSTT,
    stopDictation: stopSTT,
    transcript: sttTranscript
  } = useRealtimeStt();
  
  // Auto-pause detection logic
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptLengthRef = useRef(0);
  const deliveredLengthRef = useRef(0);

  // Sync STT transcript to local state (Append Strategy)
  useEffect(() => {
    const final = sttTranscript.final;
    
    // If STT was reset (final is empty or shorter than delivered), reset tracker
    if (final.length < deliveredLengthRef.current) {
      deliveredLengthRef.current = 0;
    }

    // If we have new content
    if (final.length > deliveredLengthRef.current) {
      const newPart = final.slice(deliveredLengthRef.current);
      deliveredLengthRef.current = final.length;
      
      setTranscript(prev => {
        // Add space if needed
        const separator = prev && !prev.endsWith(' ') && !newPart.startsWith(' ') ? ' ' : '';
        return prev + separator + newPart;
      });
    }
  }, [sttTranscript.final]);
  
  useEffect(() => {
    // Only run auto-pause logic when recording and auto-pause is enabled
    if (!autoPauseEnabled || status !== 'recording') {
      // Clear any existing timers
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setPauseCountdown(null);
      return;
    }
    
    // Check if transcript has changed (user is speaking)
    const currentLength = sttTranscript.final.length + sttTranscript.interim.length;
    
    if (currentLength !== lastTranscriptLengthRef.current) {
      // User is speaking, reset timer
      lastTranscriptLengthRef.current = currentLength;
      
      // Clear existing timers
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setPauseCountdown(null);
    } else if (!pauseTimerRef.current && currentLength > 0) {
      // User has paused, start countdown
      let countdown = pauseDuration;
      setPauseCountdown(countdown);
      
      // Update countdown every 100ms for smooth UI
      countdownIntervalRef.current = setInterval(() => {
        countdown -= 0.1;
        setPauseCountdown(Math.max(0, countdown));
      }, 100);
      
      // Set timeout to auto-stop after pause duration
      pauseTimerRef.current = setTimeout(() => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setPauseCountdown(null);
        stopDictation();
      }, pauseDuration * 1000);
    }
  }, [sttTranscript, autoPauseEnabled, status, pauseDuration]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);
  
  // Start dictation
  const startDictation = useCallback(async () => {
    try {
      setStatus('recording');
      setError(null);
      lastTranscriptLengthRef.current = 0;
      deliveredLengthRef.current = 0;
      await startSTT();
    } catch (err) {
      console.error('Failed to start dictation:', err);
      setError('Failed to start dictation. Please check microphone permissions.');
      setStatus('idle');
    }
  }, [startSTT]);
  
  // Stop dictation
  const stopDictation = useCallback(() => {
    setStatus('idle');
    stopSTT();
    
    // Clear pause timers
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setPauseCountdown(null);
  }, [stopSTT]);
  
  // Refine the transcript
  const refineAnswer = useCallback(async () => {
    if (!transcript.trim()) {
      setError('No transcript to refine');
      return;
    }
    
    setStatus('refining');
    setError(null);
    
    try {
      const response: RefineAnswerResponse = await apiService.refineAnswer({
        transcript: transcript.trim(),
        question: question.trim() || undefined,
        session_id: sessionId || undefined,
      });
      
      setRefinedAnswer(response.refined_answer);
      setSessionId(response.session_id);
      setFidelityScore(response.fidelity_score ?? null);
      setIterationCount(response.iteration_count);
      setStatus('refined');
      
      console.log('[useAnswerFormulation] Refinement successful:', {
        session_id: response.session_id,
        iteration: response.iteration_count,
        fidelity_score: response.fidelity_score,
      });
    } catch (err: any) {
      console.error('Failed to refine answer:', err);
      setError(err.response?.data?.error || 'Failed to refine answer. Please try again.');
      setStatus('idle');
    }
  }, [transcript, question, sessionId]);
  
  // Apply an edit command
  const editAnswer = useCallback(async (command: string) => {
    if (!sessionId) {
      setError('No active session to edit');
      return;
    }
    
    if (!command.trim()) {
      setError('No edit command provided');
      return;
    }
    
    console.log('[useAnswerFormulation] Sending edit command:', command);
    console.log('[useAnswerFormulation] Current refined answer before edit:', refinedAnswer?.substring(0, 100));
    
    setStatus('editing');
    setError(null);
    
    try {
      const response: EditAnswerResponse = await apiService.editAnswer({
        session_id: sessionId,
        edit_command: command.trim(),
      });
      
      console.log('[useAnswerFormulation] Edit response received:', {
        session_id: response.session_id,
        iteration: response.iteration_count,
        status: response.status,
        refined_answer_preview: response.refined_answer?.substring(0, 100),
      });
      
      console.log('[useAnswerFormulation] Setting refined answer to:', response.refined_answer?.substring(0, 100));
      setRefinedAnswer(response.refined_answer);
      setIterationCount(response.iteration_count);
      setStatus('refined');
      
      console.log('[useAnswerFormulation] Edit successful - state updated');
    } catch (err: any) {
      console.error('[useAnswerFormulation] Failed to apply edit:', err);
      setError(err.response?.data?.error || 'Failed to apply edit. Please try again.');
      setStatus('refined'); // Return to refined state on error
    }
  }, [sessionId, refinedAnswer]);
  
  // Update refined answer directly (for manual edits)
  const updateRefinedAnswer = useCallback((answer: string) => {
    setRefinedAnswer(answer);
    console.log('[useAnswerFormulation] Refined answer updated manually');
  }, []);
  
  // Finalize the answer
  const finalizeAnswer = useCallback(() => {
    setStatus('finalized');
    
    // Optionally increment session completion count
    if (userPreferences) {
      const currentCount = userPreferences.answerFormulationSessionsCompleted || 0;
      updateUserPreferences({
        answerFormulationSessionsCompleted: currentCount + 1,
      });
    }
    
    console.log('[useAnswerFormulation] Answer finalized');
  }, [userPreferences, updateUserPreferences]);
  
  // Reset the entire state
  const reset = useCallback(() => {
    setQuestion('');
    setTranscript('');
    setRefinedAnswer(null);
    setStatus('idle');
    setSessionId(null);
    setFidelityScore(null);
    setIterationCount(0);
    setError(null);
    setPauseCountdown(null);
    deliveredLengthRef.current = 0;
    
    // Clear any active timers
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    console.log('[useAnswerFormulation] State reset');
  }, []);
  
  return {
    // State
    question,
    setQuestion,
    transcript,
    refinedAnswer,
    updateRefinedAnswer,
    status,
    sessionId,
    fidelityScore,
    iterationCount,
    error,
    
    // Auto-pause settings
    autoPauseEnabled,
    setAutoPauseEnabled,
    pauseDuration,
    setPauseDuration,
    pauseCountdown,
    
    // Actions
    startDictation,
    stopDictation,
    refineAnswer,
    editAnswer,
    finalizeAnswer,
    reset,
    updateManualTranscript: setTranscript,
    interimTranscript: sttTranscript.interim,
  };
};

export default useAnswerFormulation;
