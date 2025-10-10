import { useState, useRef, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused';
type Timepoint = { mark_name: string; time_seconds: number };

export const useOnDemandTTSPlayer = () => {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activeTimepoint, setActiveTimepoint] = useState<Timepoint | null>(null);
  const [wordTimepoints, setWordTimepoints] = useState<Timepoint[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekToTimeRef = useRef<number | null>(null);
  const lastHighlightedTimepointRef = useRef<Timepoint | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setStatus('idle');
    setActiveTimepoint(null);
    setWordTimepoints([]);
    seekToTimeRef.current = null;
    lastHighlightedTimepointRef.current = null;
  }, []);

  const playText = useCallback(async (text: string) => {
    switch (status) {
      case 'playing':
        audioRef.current?.pause();
        setStatus('paused');
        return;
      case 'paused':
        audioRef.current?.play();
        setStatus('playing');
        return;
      case 'loading':
        return;
      case 'idle':
        break;
    }

    setStatus('loading');
    setError(null);

    try {
      const { audioContent, timepoints } = await apiService.synthesizeText(text);

      if (!audioContent) {
        throw new Error('No audio content received from TTS service');
      }
      setWordTimepoints(timepoints || []);

      const audioBlob = await fetch(`data:audio/mpeg;base64,${audioContent}` ).then(res => res.blob());
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        let currentWordTimepoint: Timepoint | null = null;
        for (const tp of timepoints) {
          if (audio.currentTime >= tp.time_seconds) {
            currentWordTimepoint = tp;
          } else {
            break;
          }
        }
        if (currentWordTimepoint && lastHighlightedTimepointRef.current?.mark_name !== currentWordTimepoint.mark_name) {
          setActiveTimepoint(currentWordTimepoint);
          lastHighlightedTimepointRef.current = currentWordTimepoint;
        }
      };

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        stopAudio();
      };

      audio.onerror = () => {
        console.error('On-demand audio playback error');
        setError('Failed to play audio');
        URL.revokeObjectURL(audioUrl);
        stopAudio();
      };

      if (seekToTimeRef.current !== null) {
        audio.currentTime = seekToTimeRef.current;
        seekToTimeRef.current = null;
      }

      await audio.play();
      setStatus('playing');

    } catch (err) {
      console.error('Error in playText:', err);
      setError(err instanceof Error ? err.message : String(err));
      stopAudio();
    }
  }, [status, stopAudio]);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  const seekAndPlay = useCallback((timeInSeconds: number, text: string) => {
    if (audioRef.current && (status === 'playing' || status === 'paused')) {
      audioRef.current.currentTime = timeInSeconds;
      if (status === 'paused') {
        audioRef.current.play();
        setStatus('playing');
      }
    } else if (status === 'idle') {
      seekToTimeRef.current = timeInSeconds;
      playText(text);
    }
  }, [status, playText]);

  return { playText, stopAudio, seekAndPlay, status, error, activeTimepoint, wordTimepoints };
};
