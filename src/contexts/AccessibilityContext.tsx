import axios from 'axios';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { synthesizeSpeech, playAudioFromBase64, TTSResult } from '../utils/ttsUtils';

// TTS delay options enum (in milliseconds)
export enum TtsDelayOption {
  Off = 0,
  Short = 500,
  Medium = 1000,
  Long = 1500
}

// Interface for Accessibility Context
interface AccessibilityContextType {
  uiTtsEnabled: boolean;
  highContrast: boolean;
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  wordSpacing: number;
  cloudTtsEnabled: boolean;
  ttsDelay: TtsDelayOption;
  toggleUiTts: () => void;
  toggleHighContrast: () => void;
  toggleCloudTts: () => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setLineSpacing: (spacing: number) => void;
  setWordSpacing: (spacing: number) => void;
  setTtsDelay: (delay: TtsDelayOption) => void;
  speakText: (text: string) => void;
  speakLongText: (text: string) => void;
  cancelSpeech: () => void;
  isSpeaking: boolean;
  ttsLoading: boolean;
  audioProgress: number;
}

// Create the context
const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// Provider component
export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userPreferences, updateUserPreferences } = useAuth();
  
  const [uiTtsEnabled, setUiTtsEnabled] = useState(userPreferences.uiTtsEnabled);
  const [highContrast, setHighContrast] = useState(userPreferences.highContrast);
  const [fontSize, setFontSizeState] = useState(userPreferences.fontSize);
  const [fontFamily, setFontFamilyState] = useState(userPreferences.fontFamily);
  const [lineSpacing, setLineSpacingState] = useState(userPreferences.lineSpacing);
  const [wordSpacing, setWordSpacingState] = useState(userPreferences.wordSpacing);
  const [cloudTtsEnabled, setCloudTtsEnabled] = useState(userPreferences.cloudTtsEnabled || false);
  const [ttsDelay, setTtsDelayState] = useState<TtsDelayOption>(userPreferences.ttsDelay || TtsDelayOption.Short);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  
  // Refs for audio elements and cancellation
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelTokenRef = useRef<boolean>(false);
  
  // Timer ref for debouncing speech
  const ttsTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync state with user preferences when they change
  useEffect(() => {
    setUiTtsEnabled(userPreferences.uiTtsEnabled);
    setHighContrast(userPreferences.highContrast);
    setFontSizeState(userPreferences.fontSize);
    setFontFamilyState(userPreferences.fontFamily);
    setLineSpacingState(userPreferences.lineSpacing);
    setWordSpacingState(userPreferences.wordSpacing);
    setCloudTtsEnabled(userPreferences.cloudTtsEnabled || false);
    // Set TTS delay with a default if not provided
    setTtsDelayState(userPreferences.ttsDelay !== undefined ? 
      userPreferences.ttsDelay as TtsDelayOption : 
      TtsDelayOption.Short);
  }, [userPreferences]);
  
  // Function to toggle UI TTS
  const toggleUiTts = async () => {
    const newValue = !uiTtsEnabled;
    setUiTtsEnabled(newValue);
    await updateUserPreferences({ uiTtsEnabled: newValue });
  };
  
  // Function to toggle cloud TTS
  const toggleCloudTts = async () => {
    // Cancel any ongoing speech before toggling
    cancelSpeech();
    
    const newValue = !cloudTtsEnabled;
    console.log('[AccessibilityContext] Toggling cloud TTS:', newValue);
    
    // Update local state immediately for responsive UI
    setCloudTtsEnabled(newValue);
    
    // Persist the preference
    await updateUserPreferences({ cloudTtsEnabled: newValue });
    
    // If enabling cloud TTS, ensure we have a valid voice set
    if (newValue && !userPreferences.cloudTtsVoice) {
      console.log('[AccessibilityContext] Setting default cloud TTS voice');
      // Standard voices are more reliable than Neural voices
      await updateUserPreferences({ cloudTtsVoice: 'en-US-Standard-C' });
    }
    
    // Log confirmation
    console.log('[AccessibilityContext] Cloud TTS is now', newValue ? 'enabled' : 'disabled');
  };
  
  // Function to toggle high contrast mode
  const toggleHighContrast = async () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    await updateUserPreferences({ highContrast: newValue });
  };
  
  // Function to set font size
  const setFontSize = async (size: number) => {
    setFontSizeState(size);
    await updateUserPreferences({ fontSize: size });
  };
  
  // Function to set font family
  const setFontFamily = async (font: string) => {
    setFontFamilyState(font);
    await updateUserPreferences({ fontFamily: font });
  };
  
  // Function to set line spacing
  const setLineSpacing = async (spacing: number) => {
    setLineSpacingState(spacing);
    await updateUserPreferences({ lineSpacing: spacing });
  };
  
  // Function to set word spacing
  const setWordSpacing = async (spacing: number) => {
    setWordSpacingState(spacing);
    await updateUserPreferences({ wordSpacing: spacing });
  };
  
  // Function to set TTS delay
  const setTtsDelay = async (delay: TtsDelayOption) => {
    setTtsDelayState(delay);
    await updateUserPreferences({ ttsDelay: delay });
    console.log(`[AccessibilityContext] TTS delay set to ${delay}ms`);
  };
  
  /**
   * Enhanced speakText function with configurable delay and smarter TTS selection
   * @param text - The text to speak
   * @param options - Optional configuration for this specific speak request
   */
  const speakText = (text: string, options: {
    forcePremium?: boolean;      // Force using premium TTS even for UI elements
    forceBasic?: boolean;        // Force using basic TTS even for premium content
    isDocumentContent?: boolean; // Whether this is document content (preferred for premium TTS)
    ignoreDelay?: boolean;       // Whether to ignore the configured delay
  } = {}) => {
    // Skip if text is empty or TTS is not available
    if (!text || text.trim() === '') {
      console.log('[AccessibilityContext] Empty text provided, skipping TTS');
      return;
    }
    
    // If there's a pending speech timer, clear it to prevent overlapping speech
    if (ttsTimerRef.current) {
      clearTimeout(ttsTimerRef.current);
      ttsTimerRef.current = null;
    }
    
    // Determine if we should use the delay based on options and settings
    const shouldBypassDelay = options.ignoreDelay || ttsDelay === TtsDelayOption.Off;
    
    if (shouldBypassDelay) {
      // Execute speech immediately if delay is bypassed
      executeSpeech(text, options);
      return;
    }
    
    // Otherwise, implement the configurable delay
    console.log(`[AccessibilityContext] Scheduling speech with ${ttsDelay}ms delay`);
    
    // Schedule speech with the configured delay
    ttsTimerRef.current = setTimeout(() => {
      executeSpeech(text, options);
      ttsTimerRef.current = null;
    }, ttsDelay);
  };
  
  /**
   * Actual speech execution after delay (if any)
   * This function intelligently decides which TTS method to use based on:
   * 1. User's preferences (basic vs premium TTS)
   * 2. Content type (UI element vs document content)
   * 3. Override options for specific use cases
   */
  const executeSpeech = (text: string, options: {
    forcePremium?: boolean;
    forceBasic?: boolean;
    isDocumentContent?: boolean;
    ignoreDelay?: boolean;
  } = {}) => {
    console.log('[AccessibilityContext] Executing speech with options:', options);
    
    // Always cancel any ongoing speech before starting new speech
    cancelSpeech();
    
    // Determine which TTS method to use based on options and user preferences
    const useCloudTts = determineUsePremiumTts(options);
    
    if (useCloudTts) {
      console.log('[AccessibilityContext] Using cloud TTS for speech synthesis');
      // Use cloud TTS for better quality
      speakWithCloudTts(text);
    } else if ('speechSynthesis' in window) {
      console.log('[AccessibilityContext] Using browser TTS for speech synthesis');
      // Use browser's built-in TTS
      speakWithBrowserTts(text);
    }
  };
  
  /**
   * Helper function to determine if premium TTS should be used based on:
   * - User preferences (cloudTtsEnabled setting)
   * - Content type (UI elements vs document content)
   * - Override options for specific use cases
   */
  const determineUsePremiumTts = (options: {
    forcePremium?: boolean;
    forceBasic?: boolean;
    isDocumentContent?: boolean;
  } = {}): boolean => {
    // If basic TTS is forced, never use premium
    if (options.forceBasic) {
      return false;
    }
    
    // If premium TTS is forced, always use premium
    if (options.forcePremium) {
      return true;
    }
    
    // For UI elements (non-document content), use basic TTS even if premium is enabled
    // This ensures faster response for UI elements
    if (!options.isDocumentContent && !options.forcePremium) {
      return false;
    }
    
    // Otherwise, respect user's preference for document content
    return cloudTtsEnabled;
  };
  
  // Function to speak text using browser's SpeechSynthesis API
  const speakWithBrowserTts = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('[AccessibilityContext] Speech synthesis not supported in this browser');
      return;
    }
    
    // Skip if no text provided
    if (!text || text.trim() === '') return;
    
    try {
      // Log initialization status
      if (!speechInitializedRef.current) {
        console.log('[AccessibilityContext] Speech requested but browser not yet initialized - waiting for user interaction');
      }
      
      // Cancel any ongoing speech
      cancelSpeech();
      
      // Create a new utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set utterance properties based on user preferences
      utterance.rate = userPreferences.ttsSpeed || 1.0; // Default to 1.0 if not set
      utterance.pitch = userPreferences.ttsPitch || 1.0; // Default to 1.0 if not set
      
      // Get available voices - add a fallback if voices aren't loaded yet
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        console.log('[AccessibilityContext] No voices available yet, using default voice');
      } else {
        // Try to use the preferred voice if available
        const preferredVoice = voices.find(voice => voice.name === userPreferences.ttsVoice);
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }
      
      // Event handlers with improved error handling
      utterance.onstart = () => {
        console.log('[AccessibilityContext] Speech started:', text.substring(0, 20) + (text.length > 20 ? '...' : ''));
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('[AccessibilityContext] Speech ended successfully');
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('[AccessibilityContext] Speech error:', event);
        setIsSpeaking(false);
        
        // If speech fails and we haven't initialized yet, try to initialize now
        if (!speechInitializedRef.current) {
          console.log('[AccessibilityContext] Attempting to initialize speech after error');
          speechInitializedRef.current = true; // Mark as initialized to prevent loops
          
          // Try a silent utterance to prime the system
          try {
            const silentUtterance = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(silentUtterance);
            window.speechSynthesis.cancel();
          } catch (e) {
            console.error('[AccessibilityContext] Failed to initialize speech:', e);
          }
        }
      };
      
      // Speak the text
      // Note: This will work after the first user interaction due to browser autoplay policies
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('[AccessibilityContext] Error in speakWithBrowserTts:', e);
      setIsSpeaking(false);
    }
  };
  
  // Function to speak text using Google Cloud TTS API
  const speakWithCloudTts = async (text: string) => {
    try {
      // Always ensure we're in a clean state before starting
      // Cancel any ongoing speech
      cancelSpeech();
      
      // Mark as loading
      setTtsLoading(true);
      setIsSpeaking(true);
      setAudioProgress(0); // Reset progress
      
      // Reset cancellation token
      cancelTokenRef.current = false;
      
      
      // Force token refresh and get auth token from Firebase
      console.log('[AccessibilityContext] Force refreshing auth token for TTS API call');
      const token = await userPreferences.getAuthToken?.(true) || ''; // Pass true to force refresh
      if (!token) {
        throw new Error('Failed to get a valid authentication token after refresh');
      }
      console.log('[AccessibilityContext] Got refreshed auth token');
      
      // Ensure we use a valid Google Cloud TTS voice that definitely exists
      // Standard voices are more reliable than Neural voices
      let voiceName = userPreferences.cloudTtsVoice || 'en-US-Standard-C';
      
      // Validate voice name format (should be like 'en-US-Standard-C' or 'en-US-Wavenet-A')
      if (!voiceName.match(/^[a-z]{2,5}-[A-Z]{2,5}-(Standard|Neural|Wavenet|Studio)-[A-Z]$/)) {
        console.warn('[AccessibilityContext] Invalid voice name format, falling back to default:', voiceName);
        voiceName = 'en-US-Standard-C'; // Fallback to a known working voice
      }
      
      console.log('[AccessibilityContext] Using cloud TTS voice:', voiceName);
      
      // Set a timeout for the API call to prevent hanging indefinitely
      const apiTimeout = 15000; // 15 seconds
      const apiTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TTS API call timed out')), apiTimeout);
      });
      
      // Call the TTS API with timeout
      const ttsResult = await Promise.race([
        synthesizeSpeech(
          {
            text,
            voice_name: voiceName,
            speaking_rate: userPreferences.ttsSpeed || 1.0,
            pitch: userPreferences.ttsPitch || 0.0
          },
          token
        ),
        apiTimeoutPromise
      ]) as TTSResult;
      
      console.log('[AccessibilityContext] TTS API call successful, received audio data length:', 
        ttsResult.audio_data?.length || 0);
      
      // Verify we have valid audio data
      if (!ttsResult.audio_data || ttsResult.audio_data.length < 100) {
        throw new Error('Received invalid or empty audio data from TTS API');
      }
      
      // If cancelled while API call was in progress, bail out
      if (cancelTokenRef.current) {
        console.log('[AccessibilityContext] TTS was cancelled during API call');
        setTtsLoading(false);
        setIsSpeaking(false);
        return;
      }
      
      try {
        // Create audio from the result
        console.log('[AccessibilityContext] Creating audio element from base64 data');
        const audio = playAudioFromBase64(ttsResult.audio_data, ttsResult.audio_format || 'mp3');
        audioRef.current = audio;
        
        // Set up event handlers for progress tracking
        audio.addEventListener('ended', () => {
          console.log('[AccessibilityContext] Audio playback ended');
          setIsSpeaking(false);
          setAudioProgress(0);
          audioRef.current = null;
        });
        
        audio.addEventListener('timeupdate', () => {
          // Only update progress if we have valid duration and currentTime values
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0 && 
              audio.currentTime >= 0 && !isNaN(audio.currentTime)) {
            const progress = audio.currentTime / audio.duration;
            // Ensure progress is between 0 and 1
            const boundedProgress = Math.max(0, Math.min(1, progress));
            console.log(`[AccessibilityContext] Audio progress: ${Math.round(boundedProgress * 100)}%`,
              `(${audio.currentTime.toFixed(1)}s / ${audio.duration.toFixed(1)}s)`);
            setAudioProgress(boundedProgress);
          } else {
            console.warn('[AccessibilityContext] Invalid audio timing values:', 
              { duration: audio.duration, currentTime: audio.currentTime });
          }
        });
        
        // Handle errors during playback
        audio.addEventListener('error', (e) => {
          console.error('[AccessibilityContext] Audio playback error:', e);
          setIsSpeaking(false);
          setTtsLoading(false);
          setAudioProgress(0);
        });
        
        // Set loading to false once we're ready to play
        audio.addEventListener('canplay', () => {
          console.log('[AccessibilityContext] Audio can play, initial duration:', audio.duration);
          setTtsLoading(false);
        });
        
        // Add an additional check for completely loaded audio
        audio.addEventListener('canplaythrough', () => {
          console.log('[AccessibilityContext] Audio can play through completely, final duration:', audio.duration);
          
          // Force a progress update with current values if we have valid data
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            const progress = audio.currentTime / audio.duration;
            setAudioProgress(Math.max(0, Math.min(1, progress)));
          }
        });
      } catch (audioError) {
        console.error('[AccessibilityContext] Error setting up audio playback:', audioError);
        throw audioError;
      }
    } catch (error) {
      console.error('[AccessibilityContext] Error using cloud TTS:', error);

      // Check if it's a 401 Unauthorized error
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('[AccessibilityContext] TTS API call failed due to authorization (401). Token might be invalid or expired.');
        // Optionally, you could try to log the user out or show a specific message
      }

      // Fallback to browser TTS if Cloud TTS fails for any reason
      console.log('[AccessibilityContext] Falling back to browser TTS due to Cloud TTS error.');
      speakWithBrowserTts(text); // Pass the original text here

      // Reset state
      setTtsLoading(false);
      setIsSpeaking(false); // Will be set true by speakWithBrowserTts if it succeeds
      setAudioProgress(0);
      
      // The following code is now redundant since we're already calling speakWithBrowserTts above
      // Removing to avoid double speech
      if ('speechSynthesis' in window && cloudTtsEnabled) {
        console.log('[AccessibilityContext] Falling back to browser TTS due to cloud TTS error');
        speakWithBrowserTts(text);
      }
    }
  };
  
  /**
   * Enhanced function to speak long text by splitting it into manageable chunks
   * Specifically designed for document content that benefits from premium Cloud TTS
   * Will fall back to basic TTS if premium is not available or for shorter content
   * @param text - The text to speak
   * @param options - Optional configuration for text-to-speech
   */
  const speakLongText = async (text: string, options: {
    forcePremium?: boolean;       // Force using premium TTS even if not enabled
    ignoreDelay?: boolean;        // Skip the configured delay
  } = {}) => {
    // Character limit for TTS API calls (adjust based on actual API limits)
    const CHUNK_SIZE = 3000;
    
    // If text is empty, do nothing
    if (!text || text.trim() === '') {
      console.log('[AccessibilityContext] Empty text provided to speakLongText, skipping TTS');
      return;
    }
    
    // Determine if we should use premium TTS based on settings and options
    const useCloudTts = options.forcePremium || cloudTtsEnabled;
    
    // For shorter text or when cloud TTS is not appropriate, use the enhanced speakText
    if (text.length <= CHUNK_SIZE || !useCloudTts) {
      speakText(text, {
        isDocumentContent: true,      // This is document content
        forcePremium: options.forcePremium, // Respect force premium option
        ignoreDelay: options.ignoreDelay    // Respect delay override
      });
      return;
    }
    
    try {
      // Cancel any ongoing speech
      cancelSpeech();
      
      // Mark as loading
      setTtsLoading(true);
      setIsSpeaking(true);
      
      // Reset cancellation token
      cancelTokenRef.current = false;
      
      // Split text into chunks at sentence boundaries
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      let chunks: string[] = [];
      let currentChunk = '';
      
      // Group sentences into chunks of manageable size
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > CHUNK_SIZE) {
          chunks.push(currentChunk);
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      
      // Add the last chunk if not empty
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // Get auth token
      const token = await userPreferences.getAuthToken?.() || '';
      if (!token) {
        throw new Error('Failed to get authentication token');
      }
      
      // Process each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        // Check if cancelled
        if (cancelTokenRef.current) {
          break;
        }
        
        // Process current chunk
        const ttsResult = await synthesizeSpeech(
          {
            text: chunks[i],
            voice_name: userPreferences.cloudTtsVoice || 'en-US-Neural2-F',
            speaking_rate: userPreferences.ttsSpeed || 1.0,
            pitch: userPreferences.ttsPitch || 0.0
          },
          token
        );
        
        // Play the audio and wait for it to finish
        const audio = playAudioFromBase64(ttsResult.audio_data, ttsResult.audio_format);
        audioRef.current = audio;
        
        // Track progress for the current chunk
        audio.ontimeupdate = () => {
          if (audio.duration) {
            // Calculate overall progress considering chunk position
            const chunkProgress = audio.currentTime / audio.duration;
            const overallProgress = (i + chunkProgress) / chunks.length;
            setAudioProgress(overallProgress);
          }
        };
        
        // Wait for this chunk to finish before processing next chunk
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            resolve();
          };
          
          // Also resolve if cancelled
          const checkCancelled = setInterval(() => {
            if (cancelTokenRef.current) {
              clearInterval(checkCancelled);
              resolve();
            }
          }, 100);
        });
        
        // Break the loop if cancelled
        if (cancelTokenRef.current) {
          break;
        }
      }
      
      // Reset state once complete
      setTtsLoading(false);
      setIsSpeaking(false);
      setAudioProgress(0);
      audioRef.current = null;
      
    } catch (error) {
      console.error('Error processing long text with TTS:', error);
      setTtsLoading(false);
      setIsSpeaking(false);
      
      // Fall back to browser TTS
      if ('speechSynthesis' in window) {
        speakWithBrowserTts(text);
      }
    }
  };
  
  // Function to cancel speech (both browser and cloud TTS)
  const cancelSpeech = () => {
    console.log('[AccessibilityContext] Cancelling all speech');
    
    // Cancel any pending TTS timer to prevent delayed speech
    if (ttsTimerRef.current) {
      console.log('[AccessibilityContext] Clearing pending TTS timer');
      clearTimeout(ttsTimerRef.current);
      ttsTimerRef.current = null;
    }
    
    // Cancel browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Set cancellation token for cloud TTS
    cancelTokenRef.current = true;
    
    // Stop any playing audio
    if (audioRef.current) {
      try {
        // Remove all event listeners to prevent any callbacks
        const audio = audioRef.current;
        audio.onended = null;
        audio.ontimeupdate = null;
        audio.onerror = null;
        audio.oncanplay = null;
        
        // Stop the audio
        audio.pause();
        audio.currentTime = 0; // Reset position
        audio.src = ''; // Clear source
        
        console.log('[AccessibilityContext] Stopped playing audio');
      } catch (e) {
        console.error('[AccessibilityContext] Error stopping audio:', e);
      }
      
      audioRef.current = null;
    }
    
    // Reset state
    setIsSpeaking(false);
    setTtsLoading(false);
    setAudioProgress(0);
  };
  
  // Track if speech has been initialized after user interaction
  const speechInitializedRef = useRef<boolean>(false);
  
  // Initialize voices once on component mount and set up user interaction listener
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices 
      window.speechSynthesis.getVoices();
      
      // Chrome needs this event to load voices
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
      
      // Function to initialize speech synthesis on first user interaction
      // Browser autoplay policies require user interaction before audio can play
      const initSpeechSynthesis = () => {
        if (speechInitializedRef.current) return; // Already initialized
        
        try {
          console.log('[AccessibilityContext] Initializing speech synthesis after user interaction');
          speechInitializedRef.current = true;
          
          // Create and immediately cancel a silent utterance to "prime" the speech system
          // Use a try-catch block to handle any errors that might occur
          const silentUtterance = new SpeechSynthesisUtterance('');
          
          silentUtterance.onerror = (event) => {
            console.log('[AccessibilityContext] Silent utterance error (expected during initialization):', event);
            // Even if there's an error, we still consider speech initialized
            // This is because the browser now knows we're trying to use speech after user interaction
          };
          
          // Just attempting to initialize is enough to signal to the browser
          // that we want to use speech synthesis after user interaction
          window.speechSynthesis.speak(silentUtterance);
          
          // Wait a moment before canceling to allow the browser to process the speech request
          setTimeout(() => {
            try {
              window.speechSynthesis.cancel(); // Cancel the silent utterance
            } catch (e) {
              console.log('[AccessibilityContext] Error canceling speech:', e);
            }
          }, 100);
          
          console.log('[AccessibilityContext] Speech synthesis initialized successfully');
        } catch (e) {
          console.error('[AccessibilityContext] Error initializing speech synthesis:', e);
          // Still mark as initialized since we made the attempt after user interaction
          speechInitializedRef.current = true;
        } finally {
          // Remove event listeners after initialization attempt (whether successful or not)
          document.removeEventListener('click', initSpeechSynthesis);
          document.removeEventListener('keydown', initSpeechSynthesis);
          document.removeEventListener('touchstart', initSpeechSynthesis);
        }
      };
      
      // Add event listeners to detect first user interaction
      document.addEventListener('click', initSpeechSynthesis);
      document.addEventListener('keydown', initSpeechSynthesis);
      document.addEventListener('touchstart', initSpeechSynthesis);
    }
    
    // Cleanup
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  // Provide context value
  return (
    <AccessibilityContext.Provider value={{
      uiTtsEnabled,
      highContrast,
      fontSize,
      fontFamily,
      lineSpacing,
      wordSpacing,
      cloudTtsEnabled,
      ttsDelay,
      toggleUiTts,
      toggleHighContrast,
      toggleCloudTts,
      setFontSize,
      setFontFamily,
      setLineSpacing,
      setWordSpacing,
      setTtsDelay,
      speakText,
      speakLongText,
      cancelSpeech,
      isSpeaking,
      ttsLoading,
      audioProgress
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Custom hook to use accessibility context
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
