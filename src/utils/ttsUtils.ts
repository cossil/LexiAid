import axios from 'axios';

/**
 * Utility functions for text-to-speech operations
 */

/**
 * Options for text-to-speech synthesis
 */
export interface TTSOptions {
  text: string;
  voice_name?: string;
  speaking_rate?: number;
  pitch?: number;
}

/**
 * Result of a text-to-speech synthesis operation
 */
export interface TTSResult {
  audio_data: string; // base64 encoded audio
  audio_format: string;
  metadata: {
    text_length: number;
    audio_size_bytes: number;
    voice_name: string;
    speaking_rate: number;
    pitch: number;
  };
}

/**
 * Available voice data structure
 */
export interface VoiceInfo {
  name: string;
  gender: string;
  natural_sample_rate_hertz: number;
  language_codes: string[];
}

/**
 * Convert text to speech using Google Cloud TTS API
 * 
 * @param options The text and voice options
 * @param apiToken Firebase authentication token
 * @returns Promise resolving to audio data (base64 encoded)
 */
export const synthesizeSpeech = async (
  options: TTSOptions,
  apiToken: string
): Promise<TTSResult> => {
  try {
    // Log the request details for debugging
    console.log('[TTS Utils] Sending TTS request with options:', {
      text: options.text.substring(0, 50) + '...',  // Truncate for logging
      voice_name: options.voice_name,
      speaking_rate: options.speaking_rate,
      pitch: options.pitch
    });

    const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';
    const url = `${apiUrl}/api/tts`;
    console.log('[TTS Utils] API URL:', url);

    const response = await axios.post(
      url,
      options,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status === 'success') {
      console.log('[TTS Utils] TTS API call successful', {
        audio_size: response.data.audio_data?.length || 0,
        format: response.data.audio_format,
        voice: response.data.metadata?.voice_name
      });
      return response.data as TTSResult;
    } else {
      console.error('[TTS Utils] TTS API returned error status:', response.data);
      throw new Error(response.data.message || 'Failed to synthesize speech');
    }
  } catch (error) {
    console.error('[TTS Utils] Error in TTS API call:', error);
    throw error;
  }
};

/**
 * Get available voices for Google Cloud TTS
 * 
 * @param languageCode Optional language code to filter voices
 * @param apiToken Firebase authentication token
 * @returns Promise resolving to array of available voices
 */
export const getAvailableVoices = async (
  languageCode: string | null,
  apiToken: string
): Promise<VoiceInfo[]> => {
  try {
    const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';
    const url = languageCode
      ? `${apiUrl}/api/tts/voices?language_code=${languageCode}`
      : `${apiUrl}/api/tts/voices`;

    const response = await axios.get(
      url,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      }
    );

    if (response.data.status === 'success') {
      return response.data.voices as VoiceInfo[];
    } else {
      throw new Error(response.data.message || 'Failed to retrieve voices');
    }
  } catch (error) {
    console.error('Error retrieving TTS voices:', error);
    throw error;
  }
};

/**
 * Play audio from base64 encoded data
 * 
 * @param audioData Base64 encoded audio data
 * @param format Audio format (default: 'mp3')
 * @returns Audio element that is playing
 */
export const playAudioFromBase64 = (audioData: string, format = 'mp3'): HTMLAudioElement => {
  // Validate input with comprehensive checks
  if (!audioData) {
    console.error('[TTS Utils] No audio data received');
    throw new Error('No audio data received');
  }

  if (audioData.length < 100) {
    console.error('[TTS Utils] Audio data too short, likely invalid. Length:', audioData.length);
    throw new Error('Audio data too short, likely invalid');
  }

  // Basic validation that it's actually base64 data
  if (!/^[A-Za-z0-9+/=]+$/.test(audioData)) {
    console.error('[TTS Utils] Audio data contains invalid base64 characters');
    throw new Error('Invalid base64 audio data format');
  }

  console.log('[TTS Utils] Creating audio element with base64 data, length:', audioData.length);

  // Create audio element
  const audio = new Audio();

  // Add comprehensive event listeners for debugging and playback control
  audio.addEventListener('loadedmetadata', () => {
    console.log('[TTS Utils] Audio metadata loaded, duration:', audio.duration);

    // Only start playing after metadata is loaded to ensure proper duration
    if (audio.duration && !isNaN(audio.duration)) {
      audio.play().catch(err => {
        console.error('[TTS Utils] Error playing audio:', err);
      });
    } else {
      console.error('[TTS Utils] Audio has invalid duration after metadata loaded:', audio.duration);
    }
  });

  audio.addEventListener('play', () => {
    console.log('[TTS Utils] Audio playback started');
  });

  audio.addEventListener('canplaythrough', () => {
    console.log('[TTS Utils] Audio can play through completely, duration:', audio.duration);
  });

  audio.addEventListener('error', (e) => {
    console.error('[TTS Utils] Audio element error:', e);
  });

  // Set source with explicit MIME type for better browser compatibility
  audio.src = `data:audio/${format};base64,${audioData}`;

  // Trigger load to start metadata loading
  audio.load();

  return audio;
};
