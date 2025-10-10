/**
 * DictationPanel Component
 * 
 * Main dictation interface with microphone button, real-time transcript display,
 * and auto-pause countdown timer.
 */

import React, { useEffect, useRef } from 'react';
import { Mic, Square, Settings, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useOnDemandTTSPlayer } from '../../hooks/useOnDemandTTSPlayer';

interface DictationPanelProps {
  transcript: string;
  interimTranscript?: string;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onSettingsClick?: () => void;
  autoPauseEnabled?: boolean;
  pauseCountdown?: number | null;
  disabled?: boolean;
}

const DictationPanel: React.FC<DictationPanelProps> = ({
  transcript,
  interimTranscript = '',
  isRecording,
  onStart,
  onStop,
  onSettingsClick,
  autoPauseEnabled = false,
  pauseCountdown = null,
  disabled = false,
}) => {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const wordCount = transcript.split(/\s+/).filter(word => word.length > 0).length;
  
  // TTS hook for reading the transcript aloud
  const { playText, stopAudio, status: ttsStatus } = useOnDemandTTSPlayer();

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);
  
  // TTS click handler
  const handlePlayTranscript = () => {
    if (ttsStatus === 'playing' || ttsStatus === 'loading') {
      stopAudio();
    } else if (transcript.trim()) {
      playText(transcript);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className={`w-6 h-6 ${isRecording ? 'text-red-600' : 'text-blue-600'}`} />
          <h2 className="text-xl font-semibold text-gray-800">
            {isRecording ? 'Listening...' : 'Speak Your Thoughts'}
          </h2>
          {isRecording && (
            <span className="text-sm text-gray-600">({wordCount} words)</span>
          )}
        </div>
        
        {/* Auto-pause indicator */}
        {isRecording && autoPauseEnabled && pauseCountdown === null && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>⏱️</span>
            <span>Auto-pause enabled</span>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
        {!isRecording && !transcript ? (
          // Idle state
          <>
            <button
              onClick={onStart}
              disabled={disabled}
              className="w-32 h-32 rounded-full bg-green-500 hover:bg-green-600 
                       flex items-center justify-center
                       shadow-lg hover:shadow-xl
                       transition-all duration-200
                       disabled:bg-gray-400 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-4 focus:ring-green-300"
              aria-label="Start Dictating"
            >
              <Mic className="w-16 h-16 text-white" />
            </button>
            <p className="text-lg font-medium text-gray-700">Start Dictating</p>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Speak freely. Don't worry about organization.
            </p>
          </>
        ) : (
          // Recording or has transcript
          <>
            {isRecording && (
              <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                <Mic className="w-12 h-12 text-white" />
              </div>
            )}
            
            {/* Transcript display */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Transcript</span>
                
                {/* TTS Speaker Button */}
                {transcript && (
                  <button
                    onClick={handlePlayTranscript}
                    disabled={!transcript.trim() || isRecording}
                    className="p-2 rounded-full hover:bg-gray-100 
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-colors duration-200
                               focus:outline-none focus:ring-2 focus:ring-blue-300"
                    title={ttsStatus === 'playing' ? "Stop reading transcript" : "Listen to transcript"}
                    aria-label={ttsStatus === 'playing' ? "Stop audio" : "Play transcript audio"}
                  >
                    {ttsStatus === 'loading' ? (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    ) : ttsStatus === 'playing' ? (
                      <VolumeX className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                )}
              </div>
              
              <div
                ref={transcriptRef}
                className="w-full min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-white rounded-md border border-gray-300"
                role="log"
                aria-live="polite"
                aria-label="Transcript"
              >
                {transcript && (
                  <p className="text-lg text-gray-900 whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
                    {transcript}
                  </p>
                )}
                {interimTranscript && (
                  <p className="text-base text-gray-500 italic whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
                    {interimTranscript}
                  </p>
                )}
                {!transcript && !interimTranscript && (
                  <p className="text-gray-400 italic">Your speech will appear here...</p>
                )}
              </div>
            </div>

            {/* Auto-pause countdown */}
            {pauseCountdown !== null && pauseCountdown > 0 && (
              <div className="w-full p-4 bg-yellow-50 border-2 border-yellow-300 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-800">
                    Pause detected: Auto-stopping in {pauseCountdown.toFixed(1)}s
                  </span>
                </div>
                <div className="w-full bg-yellow-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-600 h-full transition-all duration-100"
                    style={{ width: `${(pauseCountdown / 3) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-yellow-700 mt-1">(Resume speaking to cancel)</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {isRecording && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={onStop}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg
                     shadow-md hover:shadow-lg
                     transition-all duration-200
                     focus:outline-none focus:ring-4 focus:ring-red-300
                     flex items-center gap-2"
            aria-label="Stop Dictating"
          >
            <Square className="w-5 h-5" />
            Stop {pauseCountdown !== null ? 'Now' : 'Dictating'}
          </button>
          
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg
                       transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-gray-300
                       flex items-center gap-2"
              aria-label="Dictation Settings"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DictationPanel;
