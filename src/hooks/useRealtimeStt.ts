import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
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

  // Track active state via ref to avoid stale closures in cleanup
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  // Keep a ref to stopRecording to avoid effect re-execution when function reference changes
  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // Cleanup on unmount to prevent memory leaks and locked microphone
  useEffect(() => {
    return () => {
      // Close WebSocket if still connected
      if (wsRef.current) {
        try {
          wsRef.current.close();
          console.log('WebSocket closed on unmount');
        } catch (e) {
          console.warn('Error closing WebSocket on unmount:', e);
        }
        wsRef.current = null;
      }

      // Stop recording if active (useAudioRecorder handles track cleanup)
      if (isRecordingRef.current) {
        stopRecordingRef.current();
        console.log('Recording stopped on unmount');
      }
    };
  }, []); // Empty dependency array ensures this ONLY runs on unmount

  const resolveBackendOrigin = () => {
    const fallback = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
    const rawBase = import.meta.env.VITE_BACKEND_API_URL || fallback;
    try {
      const base = new URL(rawBase);
      return `${base.protocol}//${base.host}`;
    } catch (error) {
      console.error('Failed to parse backend URL, falling back to page origin:', error);
      return fallback;
    }
  };

  const connectWebSocket = useCallback(() => {
    return new Promise<void>(async (resolve, reject) => {
      // --- WebSocket Authentication ---
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.error('WebSocket auth failed: No user logged in.');
        setError('User not authenticated. Please log in.');
        setStatus('idle');
        reject(new Error('User not authenticated'));
        return;
      }

      let idToken: string;
      try {
        idToken = await user.getIdToken();
      } catch (tokenError) {
        console.error('Failed to get Firebase token:', tokenError);
        setError('Failed to authenticate. Please try again.');
        setStatus('idle');
        reject(tokenError);
        return;
      }
      // --- End WebSocket Authentication ---

      // Derive WebSocket origin carefully so environments with "/api" suffixes still work.
      const backendOrigin = resolveBackendOrigin();
      const wsProtocol = backendOrigin.startsWith('https') ? 'wss' : backendOrigin.startsWith('http') ? 'ws' : undefined;
      const normalizedOrigin = backendOrigin.replace(/^https?/, wsProtocol || 'ws');
      const wsUrl = `${normalizedOrigin}/ws/stt/stream?token=${encodeURIComponent(idToken)}`;
      console.log('Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=[REDACTED]'));

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
        // Suppress error if we are in the process of stopping (review state or manual stop flag)
        if (manualStopRef.current || status === 'review') {
          console.log('Suppressing WebSocket error during manual stop:', err);
          return;
        }
        console.error('WebSocket error:', err);
        setError('Connection error during dictation.');
        setStatus('idle');
        reject(err);
      };

      ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);

        // Handle authentication failure (custom close code 4001)
        if (event.code === 4001) {
          console.error('WebSocket auth rejected:', event.reason);
          setError('Authentication failed. Please log in again.');
          setStatus('idle');
          manualStopRef.current = true; // Prevent auto-transition
          return;
        }

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
      await startRecording({
        onChunk: (chunk) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            return;
          }

          chunk.arrayBuffer()
            .then((buffer) => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.send(buffer);
                } catch (e) {
                  console.warn('Socket send failed (likely closing):', e);
                }
              }
            })
            .catch((err) => {
              console.error('Failed to stream audio chunk to STT socket:', err);
            });
        }
      });
    } catch (err) {
      console.error('Failed to start dictation:', err);
      setError('Could not start microphone. Please check permissions.');
      setStatus('idle');
      if (wsRef.current) {
        wsRef.current.close();
      }
    }
  }, [connectWebSocket, startRecording]);

  const closeSocket = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (error) {
        console.error('Failed to close STT socket:', error);
      }
      wsRef.current = null;
    }
  };

  const stopStreaming = useCallback((nextStatus: SttStatus, clearTranscript = false) => {
    manualStopRef.current = true;

    const finalize = () => {
      if (clearTranscript) {
        setTranscript({ final: '', interim: '' });
      }
      setStatus(nextStatus);

      // Delay socket closure to allow final audio chunk to flush
      setTimeout(() => {
        closeSocket();
      }, 500);
    };

    const stopPromise = isRecording ? stopRecording() : Promise.resolve(null);
    stopPromise
      .catch((err) => {
        console.error('Failed to fully stop recorder:', err);
      })
      .finally(finalize);
  }, [isRecording, stopRecording]);

  const stopDictation = useCallback(() => {
    if (status !== 'dictating' && status !== 'connecting' && status !== 'requesting_permission') {
      console.warn('stopDictation called but not in an active state, current status:', status);
      return;
    }

    stopStreaming('review');
  }, [status, stopStreaming]);

  const cancelDictation = useCallback(() => {
    stopStreaming('idle', true);
  }, [stopStreaming]);

  const stopAndPlay = useCallback((): string => {
    // Guard against multiple calls
    if (status !== 'dictating') {
      console.warn('stopAndPlay called but not in dictating state, current status:', status);
      return '';
    }

    // Return the current transcript for immediate playback
    const currentTranscript = `${transcript.final}${transcript.interim}`.trim();
    console.log('stopAndPlay: returning transcript of length', currentTranscript.length);
    stopStreaming('review');
    return currentTranscript;
  }, [status, stopStreaming, transcript]);

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
