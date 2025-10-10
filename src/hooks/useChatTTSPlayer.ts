import { useState, useRef, useCallback, useEffect } from 'react';

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused';

export const useChatTTSPlayer = () => {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [activeTimepoint, setActiveTimepoint] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekToTimeRef = useRef<number | null>(null);
  const lastHighlightedTimepointRef = useRef<any | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setStatus('idle');
    setActiveTimepoint(null);
    lastHighlightedTimepointRef.current = null;
  }, []);

  const playAudio = useCallback(async (audioContent: string, timepoints: any[]) => {
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
        // If loading, a stop/start is happening, so let it complete.
        return;
      case 'idle':
        // Proceed with loading and playing
        break;
    }

    setStatus('loading');
    try {
      setError(null);

      if (!audioContent) {
        throw new Error('No audio content received to play');
      }

      const audioBlob = await fetch(`data:audio/mpeg;base64,${audioContent}`).then(res => res.blob());
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        let currentWordTimepoint = null;
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

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
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
      console.error('Error in playAudio:', err);
      setError(err instanceof Error ? err.message : String(err));
      stopAudio();
    }
  }, [status, stopAudio]);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  const seekAndPlay = useCallback((timeInSeconds: number) => {
    if (audioRef.current && (status === 'playing' || status === 'paused')) {
      audioRef.current.currentTime = timeInSeconds;
      if (status === 'paused') {
        audioRef.current.play();
        setStatus('playing');
      }
    } else {
      // For this hook, we can't initiate play from idle with just a time,
      // as it needs content. The parent component must call playAudio first.
      console.warn('seekAndPlay called while player was idle. Playback must be active.');
    }
  }, [status]);

  return { playAudio, stopAudio, seekAndPlay, status, error, activeTimepoint };
};
