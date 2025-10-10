import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Mic, Loader2, Send } from 'lucide-react';
import useAudioRecorder from '../hooks/useAudioRecorder';
import apiService from '../services/api';
import AudioReview from './AudioReview';

interface MicrophoneButtonProps {
  onRecordingComplete: (audioBlob: Blob, transcript?: string) => void;
  onError: (message: string) => void;
  onDirectSend?: (audioBlob: Blob) => void;
  disabled?: boolean;
  className?: string;
  documentId?: string;
  threadId?: string;
}

interface RecordingState {
  status: 'idle' | 'requesting_permission' | 'recording' | 'processing' | 'review';
  error?: string;
}

const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  onRecordingComplete,
  onError,
  onDirectSend,
  disabled = false,
  className = '',
  documentId,
  threadId,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>({ status: 'idle' });
  const [showReview, setShowReview] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isStopping, setIsStopping] = useState(false); // New state for managing stop operation
  const audioBlobRef = useRef<Blob | null>(null);
  const audioUrlRef = useRef<string>('');
  const permissionGranted = useRef<boolean>(false);
  
  // Helper to update state and log changes
  const setStateWithLog = useCallback((newState: Partial<RecordingState>) => {
    console.log('State transition:', { from: recordingState.status, to: newState.status });
    setRecordingState(prev => ({ ...prev, ...newState }));
  }, [recordingState.status]);

  const {
    isRecording,
    startRecording,
    stopRecording,
    error,
    audioBlob,
    audioUrl,
    clearAudio,
    hasAudio,
  } = useAudioRecorder();
  
  // Handle errors from the audio recorder
  useEffect(() => {
    if (error) {
      console.error('Audio recorder error:', error);
      onError(error);
      setStateWithLog({ status: 'idle', error: error });
      clearAudio();
    }
  }, [error, onError, clearAudio, setStateWithLog]);

  // Synchronize component state with audio recorder and manage UI transitions
  useEffect(() => {
    const currentStatus = recordingState.status;
    const currentAudioBlob = audioBlob; // from useAudioRecorder hook
    const currentHasAudio = hasAudio;   // from useAudioRecorder hook
    const currentIsStopping = isStopping;

    console.log('Effect Update:', {
        status: currentStatus,
        isStopping: currentIsStopping,
        hasAudio: currentHasAudio,
        showControlsVal: showControls, // current value of showControls state
        audioBlobPresent: !!currentAudioBlob,
        audioUrlPresent: !!audioUrl,
    });

    // Update local refs for direct use if needed elsewhere (e.g., in review component)
    audioBlobRef.current = currentAudioBlob;
    audioUrlRef.current = audioUrl || '';

    if (currentStatus === 'processing' && !currentIsStopping) {
        // This block runs when the stopRecording() async operation has just completed.
        if (currentAudioBlob && currentHasAudio) {
            console.log('[Effect] Action: Processing finished, audio found. Show controls, go to idle.');
            setShowControls(true);
            setStateWithLog({ status: 'idle' });
        } else {
            console.log('[Effect] Action: Processing finished, NO audio. Hide controls, go to idle.');
            setShowControls(false);
            setStateWithLog({ status: 'idle' });
            // Consider calling onError('Failed to capture audio after recording.');
        }
    } else if (currentStatus === 'idle') {
        // This block ensures consistency when in the idle state.
        if (currentAudioBlob && currentHasAudio) {
            if (!showControls) {
                console.log('[Effect] Action: Idle, audio present, but controls hidden. Showing controls.');
                setShowControls(true); // Corrective action: show controls if audio exists
            }
        } else {
            if (showControls) {
                console.log('[Effect] Action: Idle, NO audio, but controls shown. Hiding controls.');
                setShowControls(false); // Corrective action: hide controls if no audio
            }
        }
    } else if (currentStatus === 'recording' || currentStatus === 'requesting_permission') {
        // During these active phases, controls should definitely be hidden.
        if (showControls) {
            console.log('[Effect] Action: Active phase (recording/permission/stopping), but controls shown. Hiding controls.');
            setShowControls(false);
        }
    }
  // Dependencies: React to changes from the audio hook, local status, stopping flag, and showControls for self-correction.
  }, [audioBlob, hasAudio, audioUrl, recordingState.status, isStopping, showControls, setStateWithLog /*, onError */]);

  const transcribeAudio = useCallback(async (blob: Blob) => {
    if (!blob) {
      console.error('[transcribeAudio] No blob provided to transcribe.');
      onError('Cannot transcribe, no audio data found.');
      return;
    }

    console.log('[transcribeAudio] Initiating transcription for review mode...');
    setStateWithLog({ status: 'processing' });

    try {
      const formData = new FormData();
      formData.append('audio_file', blob, 'recording.webm'); // filename is optional but good practice

      if (documentId) {
        formData.append('document_id', documentId);
        console.log('[transcribeAudio] Appended document_id to FormData:', documentId);
      }
      if (threadId) {
        formData.append('thread_id', threadId);
        console.log('[transcribeAudio] Appended thread_id to FormData:', threadId);
      }

      console.log('[transcribeAudio] Calling apiService.uploadAudioMessage with FormData and options:', { sttProcessingMode: 'review' });
      const response = await apiService.uploadAudioMessage(
        formData,
        { sttProcessingMode: 'review' } // Pass options object as the second argument
      );
      console.log('[transcribeAudio] API response received:', response);

      if (response.error) {
        console.error('[transcribeAudio] API returned an error:', response.error);
        onError(`Transcription failed: ${response.error}`);
        setTranscript('');
      } else if (response && typeof response.transcript === 'string') {
        console.log('[transcribeAudio] Transcription successful. Transcript:', response.transcript);
        setTranscript(response.transcript);
      } else {
        console.warn('[transcribeAudio] Transcription response did not contain expected transcript string. Response:', response);
        setTranscript('');
        onError('Transcription completed, but no valid text was returned.');
      }
    } catch (err) {
      console.error('[transcribeAudio] Exception during transcription API call:', err);
      onError(`Error transcribing audio: ${err instanceof Error ? err.message : String(err)}`);
      setTranscript('');
    } finally {
      console.log('[transcribeAudio] Transcription attempt finished. Setting status to review.');
      setStateWithLog({ status: 'review' });
    }
  }, [documentId, threadId, onError, setStateWithLog]);

  // Reset the component to initial state
  const resetState = useCallback(() => {
    console.log('Resetting MicrophoneButton state');
    
    // Clear any ongoing operations
    if (recordingState.status === 'recording') {
      console.log('Stopping active recording during reset');
      stopRecording().catch(err => {
        console.error('Error stopping recording during reset:', err);
      });
    }
    
    // Reset all state variables
    setShowReview(false);
    setShowControls(false);
    setTranscript('');
    
    // Clear audio references and revoke object URLs
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = '';
    }
    
    audioBlobRef.current = null;
    
    // Clear audio from the recorder hook
    clearAudio();
    
    // Reset to idle state
    setStateWithLog({ status: 'idle' });
    
    console.log('MicrophoneButton state reset complete');
  }, [clearAudio, recordingState.status, setStateWithLog, stopRecording]);

  const handleAudioReview = useCallback(async () => {
    console.log('[handleAudioReview] CLICKED - Function Entry Point'); // Diagnostic log
    if (!audioBlobRef.current) {
      onError('No audio to review.');
      console.error('[handleAudioReview] No audio blob available to review.');
      return;
    }
    console.log('[handleAudioReview] Initiating audio review. Setting showReview=true.');
    setShowReview(true); 
    console.log('[handleAudioReview] Calling transcribeAudio...');
    await transcribeAudio(audioBlobRef.current);
  }, [onError, transcribeAudio]);

  const handleSendTranscript = useCallback((text: string) => {
    if (!text.trim() || !audioBlobRef.current) return;
    onRecordingComplete(audioBlobRef.current, text);
    resetState();
  }, [onRecordingComplete, resetState]);

  const handleDirectSend = useCallback(async () => {
    if (!audioBlobRef.current) return;

    console.log('Initiating direct send');
    setStateWithLog({ status: 'processing' });
    
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlobRef.current, 'recording.webm');
      if (documentId) formData.append('document_id', documentId);
      if (threadId) formData.append('thread_id', threadId);
      
      // For direct send, we want the full processing
      const response = await apiService.uploadAudioMessage(formData, {
        sttProcessingMode: 'direct_send'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      console.log('Direct send successful');
      
      // Call the appropriate callback based on what's available
      if (onDirectSend) {
        await onDirectSend(audioBlobRef.current!);
      } else if (onRecordingComplete) {
        await onRecordingComplete(audioBlobRef.current!, response.text);
      }

      resetState();
    } catch (error) {
      console.error('Error sending audio:', error);
      onError('Failed to send audio. Please try again.');
      setStateWithLog({ status: 'idle' });
    }
  }, [documentId, onDirectSend, onError, onRecordingComplete, resetState, threadId, setStateWithLog]);

  const handleRecordClick = useCallback(async () => {
    console.log('Record button clicked, current state:', recordingState.status);
    
    // Prevent multiple clicks while processing
    if (recordingState.status === 'processing' || recordingState.status === 'requesting_permission') {
      console.log('Operation already in progress, ignoring click');
      return;
    }
    
    // Handle stop recording
    if (isRecording) {
      console.log('Stopping recording');
      try {
        // Set processing state before stopping
        setStateWithLog({ status: 'processing' });
        setIsStopping(true);
        
        // Stop the recording
        try {
          await stopRecording(); // This promise resolves when the hook has processed the stop
        } finally {
          setIsStopping(false); // Signal that stopRecording attempt has finished
        }
        
        // Note: The useEffect will now handle UI updates based on isStopping and audioBlob availability.
        
      } catch (err) {
        console.error('Error stopping recording:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to stop recording';
        onError(errorMsg);
        setStateWithLog({ status: 'idle' });
        clearAudio();
      }
    } 
    // Handle start recording
    else {
      console.log('Starting recording');
      try {
        // Reset any previous state
        setShowReview(false);
        setShowControls(false);
        setTranscript('');
        clearAudio();
        
        // Request permission if we haven't already
        if (!permissionGranted.current) {
          console.log('Requesting microphone permission...');
          setStateWithLog({ status: 'requesting_permission' });
          
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000
              }
            });
            // Stop all tracks immediately after getting permission
            stream.getTracks().forEach(track => track.stop());
            permissionGranted.current = true;
            console.log('Microphone permission granted');
          } catch (err) {
            console.error('Microphone permission denied:', err);
            throw new Error('Microphone access was denied. Please allow microphone access to record audio.');
          }
        }
        
        // Start the actual recording
        console.log('Starting recording...');
        setStateWithLog({ status: 'recording' });
        await startRecording();
        console.log('Recording started successfully');
        
      } catch (err) {
        console.error('Error starting recording:', err);
        const errorMsg = err instanceof Error ? err.message : 'Could not access microphone';
        onError(errorMsg);
        setStateWithLog({ status: 'idle' });
        clearAudio();
      }
    }
  }, [isRecording, startRecording, stopRecording, onError, clearAudio, recordingState.status, setStateWithLog]);

  // Show review interface
  if (showReview && audioBlobRef.current && audioUrlRef.current) {
    console.log('[renderButtonContent] Rendering AudioReview. Props:', {
      audioBlobExists: !!audioBlobRef.current,
      audioUrl: audioUrlRef.current,
      transcriptToPass: transcript,
      isProcessing: recordingState.status === 'processing',
      currentStatus: recordingState.status
    });
    return (
      <AudioReview
        audioBlob={audioBlobRef.current}
        audioUrl={audioUrlRef.current}
        transcript={transcript}
        isProcessing={recordingState.status === 'processing'}
        onSend={handleSendTranscript}
        onReRecord={resetState}
        onClose={resetState}
      />
    );
  }

  // Show action buttons after recording
  if (showControls && audioBlobRef.current) {
    console.log('Rendering post-recording controls');
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          type="button"
          onClick={resetState}
          className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          aria-label="Cancel recording"
          disabled={recordingState.status === 'processing'}
          title="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={handleAudioReview}
          className="p-2 rounded-full text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          aria-label="Review and send"
          disabled={recordingState.status === 'processing'}
          title="Review & Send"
        >
          {recordingState.status === 'processing' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Check className="h-5 w-5" />
          )}
        </button>
        
        {onDirectSend && (
          <button
            type="button"
            onClick={handleDirectSend}
            className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            disabled={recordingState.status === 'processing'}
            title="Send Directly"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="ml-2 text-xs text-gray-500">
            {audioBlobRef.current ? `${Math.round(audioBlobRef.current.size / 1024)} KB` : 'No audio'}
          </div>
        )}
      </div>
    );
  }

  // Render the appropriate UI based on the current state
  const renderButtonContent = () => {
    console.log('Rendering button content, state:', recordingState.status);
    
    // Show review interface if we have audio and are in review mode
    if (showReview && audioBlobRef.current && audioUrlRef.current) {
      console.log('[renderButtonContent] Rendering AudioReview. Props:', {
        audioBlobExists: !!audioBlobRef.current,
        audioUrl: audioUrlRef.current,
        transcriptToPass: transcript,
        isProcessing: recordingState.status === 'processing', // This is for AudioReview's internal loader
        currentMicrophoneButtonStatus: recordingState.status // For clarity on MicrophoneButton's state
      });
      return (
        <AudioReview
          audioBlob={audioBlobRef.current}
          audioUrl={audioUrlRef.current}
          transcript={transcript}
          isProcessing={recordingState.status === 'processing'}
          onSend={handleSendTranscript}
          onReRecord={resetState}
          onClose={resetState}
        />
      );
    }
    
    // Show action buttons after recording
    if (showControls && audioBlobRef.current) {
      console.log('Rendering post-recording controls (from renderButtonContent)');
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
          <button
            type="button"
            onClick={resetState}
            className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            aria-label="Cancel recording"
            disabled={recordingState.status === 'processing'}
            title="Cancel"
          >
            <X className="h-5 w-5" />
          </button>
          
          <button
            type="button"
            onClick={handleAudioReview}
            className="p-2 rounded-full text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            aria-label="Review and send"
            disabled={recordingState.status === 'processing'}
            title="Review & Send"
          >
            {recordingState.status === 'processing' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
          </button>
          
          {onDirectSend && (
            <button
              type="button"
              onClick={handleDirectSend}
              className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              disabled={recordingState.status === 'processing'}
              title="Send Directly"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
          
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="ml-2 text-xs text-gray-500">
              {audioBlobRef.current ? `${Math.round(audioBlobRef.current.size / 1024)} KB` : 'No audio'}
            </div>
          )}
        </div>
      );
    }

    // Show recording button in all other cases
    const isProcessing = recordingState.status === 'processing' || recordingState.status === 'requesting_permission';
    const isActive = recordingState.status === 'recording';
    
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleRecordClick}
          disabled={disabled || isProcessing}
          className={`p-2 rounded-full transition-colors ${
            isActive
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${className}`}
          aria-label={isActive ? 'Stop recording' : 'Start recording'}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isActive ? (
            <div className="h-5 w-5 rounded-sm bg-white" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
        
        {/* Recording indicator dot */}
        {isActive && (
          <div className="absolute -top-2 -right-2 flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full">
            ●
          </div>
        )}
        
        {/* Status indicator for debugging */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
            {recordingState.status}
          </div>
        )}
      </div>
    );
  };

  return renderButtonContent();
};

export default MicrophoneButton;
