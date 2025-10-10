import { useState, useRef, useCallback } from 'react';
import useAudioRecorder from './useAudioRecorder';

export type SttStatus = 'idle' | 'requesting_permission' | 'dictating' | 'review' | 'connecting';

interface Transcript {
  final: string;
  interim: string;
}

interface UseRealtimeSttReturn {
  status: SttStatus;
  transcript: Transcript;
  error: string | null;
  startDictation: () => Promise<void>;
  stopDictation: () => void;
  stopAndPlay: () => string;
  rerecord: () => Promise<void>;
  cancelDictation: () => void;
  updateTranscript: (newText: string) => void;
}

const useRealtimeStt = (): UseRealtimeSttReturn => {
  const [status, setStatus] = useState<SttStatus>('idle');
  const [transcript, setTranscript] = useState<Transcript>({ final: '', interim: '' });
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const manualStopRef = useRef<boolean>(false);
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();

  const connectWebSocket = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // The WebSocket URL should be derived from the backend URL, handling ws/wss protocols.
      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';
      const wsUrl = backendApiUrl.replace(/^http/, 'ws') + '/api/stt/stream';
      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established.');
        setStatus('dictating');
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.is_final) {
            setTranscript(prev => ({ final: prev.final + data.transcript + ' ', interim: '' }));
          } else {
            setTranscript(prev => ({ ...prev, interim: data.transcript }));
          }
        } catch (e) {
          console.error('Failed to parse STT message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error during dictation.');
        setStatus('idle');
        reject(err);
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        // Only auto-transition if this wasn't a manual stop
        if (!manualStopRef.current && status === 'dictating') {
            setStatus('review'); // Move to review when connection closes during dictation
        }
        manualStopRef.current = false; // Reset for next session
      };
    });
  }, [status]);

  const startDictation = useCallback(async () => {
    setError(null);
    setTranscript({ final: '', interim: '' });
    setStatus('connecting');
    try {
      await connectWebSocket();
      await startRecording({ onChunk: (chunk) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(chunk);
        }
      }});
    } catch (err) {
      console.error('Failed to start dictation:', err);
      setError('Could not start microphone. Please check permissions.');
      setStatus('idle');
      if (wsRef.current) {
        wsRef.current.close();
      }
    }
  }, [connectWebSocket, startRecording]);

  const stopDictation = useCallback(() => {
    // Guard against multiple calls - make idempotent
    if (status !== 'dictating') {
      console.warn('stopDictation called but not in dictating state, current status:', status);
      return;
    }
    
    manualStopRef.current = true;
    
    if (isRecording) {
      stopRecording();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    setStatus('review');
  }, [status, isRecording, stopRecording]);

  const cancelDictation = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    setTranscript({ final: '', interim: '' });
    setStatus('idle');
  }, [isRecording, stopRecording]);

  const stopAndPlay = useCallback((): string => {
    // Guard against multiple calls
    if (status !== 'dictating') {
      console.warn('stopAndPlay called but not in dictating state, current status:', status);
      return '';
    }
    
    manualStopRef.current = true;
    
    // Stop recording
    if (isRecording) {
      stopRecording();
    }
    
    // Close WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    // Transition to review state
    setStatus('review');
    
    // Return the current transcript for immediate playback
    const currentTranscript = `${transcript.final}${transcript.interim}`.trim();
    console.log('stopAndPlay: returning transcript of length', currentTranscript.length);
    return currentTranscript;
  }, [status, isRecording, stopRecording, transcript]);

  const rerecord = useCallback(async () => {
    await startDictation();
  }, [startDictation]);

  const updateTranscript = useCallback((newText: string) => {
    if (status === 'review' || status === 'idle') {
      setTranscript({ final: newText, interim: '' });
      // If clearing the transcript (empty string), reset to idle
      if (newText === '' && status === 'review') {
        setStatus('idle');
      }
    }
  }, [status]);

  return {
    status,
    transcript,
    error,
    startDictation,
    stopDictation,
    stopAndPlay,
    rerecord,
    cancelDictation,
    updateTranscript,
  };
};

export default useRealtimeStt;
