import { useState, useRef, useEffect, useCallback } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: (options?: { onChunk?: (chunk: Blob) => void }) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  clearAudio: () => void;
  hasAudio: boolean;
}

const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const onChunkRef = useRef<((chunk: Blob) => void) | null>(null);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const startRecording = useCallback(async (options?: { onChunk?: (chunk: Blob) => void }) => {
    try {
      setError(null);
      audioChunksRef.current = [];
      onChunkRef.current = options?.onChunk || null;

      // Request access to the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      
      // Create a new MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Collect audio data when available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          if (onChunkRef.current) {
            onChunkRef.current(event.data);
          }
          // Still collect chunks for the final blob, in case it's needed.
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle when recording stops
      mediaRecorder.onstop = () => {
        // Stop all tracks in the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      // Start recording with 1-second chunks
      mediaRecorder.start(1000);
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please ensure you have granted microphone permissions.');
      setIsRecording(false);
      
      // Clean up any partial stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      // Use ref for mediaRecorder check to avoid dependency on isRecording if possible, 
      // but keeping isRecording for logic consistency with state
      if (!mediaRecorderRef.current || !isRecording) {
        console.log('No active recording to stop');
        resolve(null);
        return;
      }
      
      console.log('Stopping media recorder...');
      
      // Set up a one-time handler for the stop event
      const onStop = () => {
        console.log('MediaRecorder onstop event fired');
        
        // Create a blob from the recorded chunks
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: 'audio/webm;codecs=opus' 
          });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          console.log('Audio blob created, size:', audioBlob.size, 'bytes');
          
          // Update state
          setAudioBlob(audioBlob);
          setAudioUrl(audioUrl);
          
          // Clean up the media recorder
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current = null;
          }
          
          // Resolve with the audio blob
          resolve(audioBlob);
        } else {
          console.warn('No audio data was recorded');
          setError('No audio data was recorded.');
          
          // Clean up
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current = null;
          }
          
          resolve(null);
        }
        
        // Update recording state
        setIsRecording(false);
      };
      
      // Set the onstop handler
      mediaRecorderRef.current.onstop = onStop;
      
      try {
        // Stop all tracks in the stream first
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        // Then stop the media recorder
        if (mediaRecorderRef.current.state === 'recording') {
          console.log('Calling MediaRecorder.stop()');
          mediaRecorderRef.current.stop();
        } else {
          console.log('MediaRecorder not in recording state, state:', mediaRecorderRef.current.state);
          // If not recording, just clean up
          onStop();
        }
      } catch (err) {
        console.error('Error stopping recording:', err);
        setError('Failed to stop recording. Please try again.');
        
        // Clean up
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          mediaRecorderRef.current = null;
        }
        
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [isRecording]); // Depends on isRecording state

  const clearAudio = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    audioChunksRef.current = [];
  }, [audioUrl]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    audioBlob,
    audioUrl,
    clearAudio,
    hasAudio: !!audioBlob,
  };
};

export default useAudioRecorder;
