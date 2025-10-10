import { useState, useRef, useCallback, useEffect } from 'react';

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused';

import apiService from '../services/api';

export const useTTSPlayer = (documentId: string | null, fullText: string = '') => {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [activeTimepoint, setActiveTimepoint] = useState<any | null>(null);
  const [wordTimepoints, setWordTimepoints] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekToTimeRef = useRef<number | null>(null); // Ref to store pending seek time
  const lastHighlightedTimepointRef = useRef<any | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setStatus('idle');
    setActiveTimepoint(null);
    setWordTimepoints([]);
    seekToTimeRef.current = null; // Reset pending seek
    lastHighlightedTimepointRef.current = null;
  }, []);

  const playAudio = useCallback(async () => {
    switch (status) {
      case 'playing':
        audioRef.current?.pause();
        setStatus('paused');
        break;
      case 'paused':
        audioRef.current?.play();
        setStatus('playing');
        break;
      case 'loading':
        stopAudio();
        break;
      case 'idle':
        setStatus('loading');
        setError(null);
        let audioUrlToRevoke: string | null = null; // Declare here for broader scope

        const playFromUrls = async (audioUrl: string, timepointsUrl: string) => {
          const timepointsResponse = await fetch(timepointsUrl);
          if (!timepointsResponse.ok) throw new Error('Failed to fetch timepoints');
          const timepoints = await timepointsResponse.json();
          setWordTimepoints(timepoints || []);

          const audio = new Audio(audioUrl);
          return { audio, timepoints };
        };

        const playFromOnDemand = async () => {
          if (!fullText) throw new Error('No text provided for on-demand synthesis.');
          const data = await apiService.synthesizeText(fullText);
          const audioContent = data.audioContent;
          const timepoints = data.timepoints;
          setWordTimepoints(timepoints || []);

          if (!audioContent) throw new Error('No audio content received from on-demand TTS service');

          const audioBlob = await fetch(`data:audio/mpeg;base64,${audioContent}`).then(res => res.blob());
          const audioUrl = URL.createObjectURL(audioBlob);
          audioUrlToRevoke = audioUrl; // Store for cleanup
          const audio = new Audio(audioUrl);
          return { audio, timepoints };
        };

        try {
          let audio: HTMLAudioElement;
          let timepoints: any[];

          if (documentId) {
            try {
              console.log(`TTS_DEBUG: Attempting to fetch pre-generated assets for document ${documentId}`);
              const { audio_url, timepoints_url } = await apiService.getTtsAssets(documentId);
              const result = await playFromUrls(audio_url, timepoints_url);
              audio = result.audio;
              timepoints = result.timepoints;
              console.log(`TTS_DEBUG: Successfully loaded pre-generated TTS assets.`);
            } catch (e) {
              console.warn(`TTS_DEBUG: Could not fetch pre-generated assets for document ${documentId}. Falling back to on-demand synthesis.`, e);
              const result = await playFromOnDemand();
              audio = result.audio;
              timepoints = result.timepoints;
            }
          } else {
            console.log(`TTS_DEBUG: No documentId provided. Using on-demand synthesis.`);
            const result = await playFromOnDemand();
            audio = result.audio;
            timepoints = result.timepoints;
          }

          audioRef.current = audio;

          audio.ontimeupdate = () => {
            let currentWordTimepoint = null;
            for (let i = 0; i < timepoints.length; i++) {
              const tp = timepoints[i];
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
            if (audioUrlToRevoke) URL.revokeObjectURL(audioUrlToRevoke);
            stopAudio();
          };

          audio.onerror = (e) => {
            console.error('Audio playback error:', e);
            setError('Failed to play audio');
            if (audioUrlToRevoke) URL.revokeObjectURL(audioUrlToRevoke);
            stopAudio();
          };

          // If there's a pending seek request, apply it now
          if (seekToTimeRef.current !== null) {
            audio.currentTime = seekToTimeRef.current;
            seekToTimeRef.current = null; // Clear the pending seek
          }

          await audio.play();
          setStatus('playing');

        } catch (err) {
          console.error('Error in playAudio:', err);
          setError(err instanceof Error ? err.message : String(err));
          stopAudio();
        }
        break;
    }
  }, [fullText, documentId, status, stopAudio]);

  const seekAndPlay = useCallback((timeInSeconds: number) => {
    if (audioRef.current && (status === 'playing' || status === 'paused')) {
      audioRef.current.currentTime = timeInSeconds;
      if (status === 'paused') {
        audioRef.current.play();
        setStatus('playing');
      }
    } else if (status === 'idle') {
      // If idle, set the seek time and start the regular play flow
      seekToTimeRef.current = timeInSeconds;
      playAudio();
    }
  }, [status, playAudio]);

  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return { playAudio, stopAudio, seekAndPlay, status, error, activeTimepoint, wordTimepoints };
};
