/**
 * DictationPanel Component
 * 
 * Main dictation interface with microphone button, real-time transcript display,
 * and auto-pause countdown timer.
 */

import React, { useEffect, useRef } from 'react';
import { Mic, Settings, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useTTSPlayer } from '../../hooks/useTTSPlayer';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { HighlightedTextBlock } from '../shared/HighlightedTextBlock';

interface DictationPanelProps {
  transcript: string;
  interimTranscript?: string;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onTranscriptChange: (text: string) => void;
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
  onTranscriptChange,
  onSettingsClick,
  autoPauseEnabled = false,
  pauseCountdown = null,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { speakText, uiTtsEnabled } = useAccessibility();

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };
  
  // TTS hook for reading the transcript aloud
  const {
    playAudio,
    stopAudio,
    status: ttsStatus,
    activeTimepoint,
    wordTimepoints,
    seekAndPlay,
  } = useTTSPlayer(null);

  const isReading = ttsStatus === 'playing' || ttsStatus === 'loading' || ttsStatus === 'paused';

  // Auto-scroll textarea to bottom when transcript updates and user is not manually editing (roughly)
  useEffect(() => {
    if (textareaRef.current && isRecording) {
       textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [transcript, isRecording]);
  
  // TTS click handler
  const handleReadAloud = () => {
    if (!transcript.trim()) {
      return;
    }

    if (isReading) {
      stopAudio();
    } else {
      playAudio({ text: transcript });
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <h2 
                className="text-xl font-semibold text-gray-800"
                onMouseEnter={() => handleHover('Draft Answer')}
            >
                Draft Answer
            </h2>
        </div>
        
        {/* Auto-pause indicator (Compact) */}
        {isRecording && autoPauseEnabled && pauseCountdown === null && (
          <div 
            className="flex items-center gap-2 text-sm text-gray-500"
            onMouseEnter={() => handleHover('Auto-pause active')}
          >
            <span>⏱️ Auto-pause active</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="relative mb-4">
        {isReading ? (
            <div 
            className="min-h-[200px] max-h-[400px] w-full rounded-lg border border-blue-200 bg-blue-50 p-4 overflow-y-auto"
            aria-live="polite"
            >
            <HighlightedTextBlock
                text={transcript}
                wordTimepoints={wordTimepoints}
                activeTimepoint={activeTimepoint}
                onWordClick={seekAndPlay}
                className="text-lg text-gray-800"
            />
            </div>
        ) : (
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    className="w-full min-h-[200px] max-h-[400px] p-4 text-lg text-gray-800 bg-white rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-y transition-all"
                    placeholder="Start typing or press the microphone to dictate..."
                    value={transcript}
                    onChange={(e) => onTranscriptChange(e.target.value)}
                    disabled={disabled}
                    onMouseEnter={() => handleHover('Type or dictate your answer here')}
                />
            </div>
        )}
        
        {/* Interim text (Ghost text) */}
        {!isReading && interimTranscript && (
            <div className="mt-2 p-2 text-gray-500 italic bg-gray-50 rounded border border-gray-100 animate-pulse">
                <span className="font-semibold text-xs uppercase tracking-wider text-gray-400 mr-2">Hearing:</span>
                {interimTranscript}
            </div>
        )}
      </div>

      {/* Auto-pause countdown (Prominent when active) */}
      {pauseCountdown !== null && pauseCountdown > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3 animate-pulse">
            <span className="text-xl">⏱️</span>
            <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                    Pause detected. Stopping in {pauseCountdown.toFixed(1)}s...
                </p>
                <div className="w-full bg-yellow-200 rounded-full h-1.5 mt-1">
                    <div
                    className="bg-yellow-600 h-full transition-all duration-100"
                    style={{ width: `${(pauseCountdown / 3) * 100}%` }}
                    />
                </div>
            </div>
            <button 
                onClick={onStart}
                className="text-xs font-semibold text-yellow-700 underline"
            >
                Resume Speaking
            </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex items-center justify-between gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
        
        {/* Main Actions */}
        <div className="flex items-center gap-3">
            {/* Record Button */}
            <button
                onClick={isRecording ? onStop : onStart}
                disabled={disabled || isReading}
                className={`
                    relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold shadow-sm transition-all
                    ${isRecording 
                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 border border-transparent'
                    }
                    ${(disabled || isReading) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title={isRecording ? "Stop Dictation" : "Start Dictation"}
            >
                {isRecording ? (
                    <>
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        Stop
                    </>
                ) : (
                    <>
                        <Mic className="w-5 h-5" />
                        Dictate
                    </>
                )}
            </button>

            {/* Read Aloud Button */}
            <button
                onClick={handleReadAloud}
                disabled={!transcript.trim() || isRecording}
                className={`
                    flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all
                    ${isReading 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }
                    ${(!transcript.trim() || isRecording) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title={isReading ? "Stop Reading" : "Read Aloud"}
            >
                {ttsStatus === 'loading' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : isReading ? (
                    <VolumeX className="w-5 h-5" />
                ) : (
                    <Volume2 className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">{isReading ? 'Stop' : 'Read Aloud'}</span>
            </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center gap-2">
             {/* Word Count (Subtle) */}
             <span className="text-xs text-gray-400 hidden sm:inline-block mr-2">
                {transcript.split(/\s+/).filter(w => w.length > 0).length} words
            </span>

            {onSettingsClick && (
                <button
                    onClick={onSettingsClick}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                    title="Dictation Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default DictationPanel;
