/**
 * VoiceEditMode Component
 * 
 * Interface for applying voice-based edits to the refined answer.
 * Shows edit examples, voice command button, and highlights recent changes.
 */

import React, { useState, useEffect } from 'react';
import { Mic, Check, Undo, ChevronDown, ChevronUp, Square, Volume2, VolumeX, Loader2 } from 'lucide-react';
import useRealtimeStt from '../../hooks/useRealtimeStt';
import { useOnDemandTTSPlayer } from '../../hooks/useOnDemandTTSPlayer';

interface VoiceEditModeProps {
  refinedAnswer: string;
  onEditCommand: (command: string) => void;
  onDone: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  isProcessing?: boolean;
  recentEdit?: {
    before: string;
    after: string;
    timestamp: number;
  } | null;
}

const VoiceEditMode: React.FC<VoiceEditModeProps> = ({
  refinedAnswer,
  onEditCommand,
  onDone,
  onUndo,
  canUndo = false,
  isProcessing = false,
  recentEdit = null,
}) => {
  const [showExamples, setShowExamples] = useState(true);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  
  // Use STT hook for voice command capture
  const { startDictation, stopDictation, transcript, status } = useRealtimeStt();
  
  // TTS hook for reading the refined answer aloud
  const { playText, stopAudio, status: ttsStatus } = useOnDemandTTSPlayer();
  
  const isRecording = status === 'dictating';
  const editCommandTranscript = transcript.final + transcript.interim;
  
  // TTS click handler
  const handlePlayRefinedAnswer = () => {
    if (ttsStatus === 'playing' || ttsStatus === 'loading') {
      stopAudio();
    } else if (refinedAnswer.trim()) {
      playText(refinedAnswer);
    }
  };

  // Highlight recent changes for 3 seconds
  useEffect(() => {
    if (recentEdit && recentEdit.after !== recentEdit.before) {
      setHighlightedText(recentEdit.after);
      
      const timer = setTimeout(() => {
        setHighlightedText(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [recentEdit]);

  const handleStartVoiceCommand = async () => {
    await startDictation();
  };

  const handleStopVoiceCommand = () => {
    stopDictation();
    // Submit the command after a short delay to ensure transcript is captured
    setTimeout(() => {
      const command = (transcript.final + transcript.interim).trim();
      if (command) {
        onEditCommand(command);
      }
    }, 500);
  };

  const editExamples = [
    "Change 'upset' to 'angry'",
    "Rephrase the second sentence",
    "Add 'in 1773' after 'Boston Tea Party'",
    "Remove the word 'very'",
    "Move the sentence about taxes to the end",
  ];

  // Helper to highlight text in the answer
  const renderAnswerWithHighlight = () => {
    if (!highlightedText || !refinedAnswer.includes(highlightedText)) {
      return refinedAnswer;
    }

    const parts = refinedAnswer.split(highlightedText);
    return (
      <>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className="bg-yellow-200 px-1 rounded animate-pulse">
                {highlightedText}
              </span>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Mic className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          Edit Your Answer with Voice
        </h2>
      </div>

      {/* Refined Answer Display */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Refined Answer</h3>
          
          {/* TTS Speaker Button */}
          {refinedAnswer && (
            <button
              onClick={handlePlayRefinedAnswer}
              disabled={!refinedAnswer.trim() || isRecording}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 
                         text-blue-700 rounded-md transition-colors duration-200
                         disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Listen to refined answer"
            >
              {ttsStatus === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : ttsStatus === 'playing' ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {ttsStatus === 'playing' ? 'Playing...' : 'Listen'}
            </button>
          )}
        </div>
        
        <div className="p-4 bg-white rounded-md border-2 border-gray-300 min-h-[150px] max-h-[300px] overflow-y-auto">
          <p className="text-lg text-gray-900 whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
            {renderAnswerWithHighlight()}
          </p>
        </div>
        {highlightedText && (
          <p className="text-xs text-yellow-700 mt-1 italic">
            ↑ Recent change highlighted (fades in 3 seconds)
          </p>
        )}
      </div>

      {/* Voice Command Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">Say your edit command</h3>
          </div>
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            {showExamples ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide examples
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show examples
              </>
            )}
          </button>
        </div>

        {/* Edit Examples */}
        {showExamples && (
          <div className="mb-4 p-3 bg-white rounded-md border border-blue-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Examples:</p>
            <ul className="space-y-1">
              {editExamples.map((example, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span className="italic">"{example}"</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Real-time Transcript Display */}
        {isRecording && editCommandTranscript && (
          <div className="mb-4 p-3 bg-white rounded-md border-2 border-blue-400">
            <p className="text-xs font-semibold text-gray-700 mb-1">Your command:</p>
            <p className="text-base text-gray-900 italic">"{editCommandTranscript}"</p>
          </div>
        )}

        {/* Voice Command Button */}
        {!isRecording ? (
          <button
            onClick={handleStartVoiceCommand}
            disabled={isProcessing}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                     shadow-md hover:shadow-lg
                     transition-all duration-200
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-4 focus:ring-blue-300
                     flex items-center justify-center gap-2"
          >
            <Mic className="w-5 h-5" />
            {isProcessing ? 'Applying edit...' : 'Start Voice Command'}
          </button>
        ) : (
          <button
            onClick={handleStopVoiceCommand}
            className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg
                     shadow-md hover:shadow-lg
                     transition-all duration-200
                     focus:outline-none focus:ring-4 focus:ring-red-300
                     flex items-center justify-center gap-2 animate-pulse"
          >
            <Square className="w-5 h-5" />
            Stop & Apply Command
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onDone}
          disabled={isProcessing}
          className="flex-1 min-w-[200px] px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg
                   shadow-md hover:shadow-lg
                   transition-all duration-200
                   disabled:bg-gray-400 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-4 focus:ring-green-300
                   flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Done Editing
        </button>

        {onUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo || isProcessing}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg
                     transition-all duration-200
                     disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-4 focus:ring-gray-300
                     flex items-center gap-2"
          >
            <Undo className="w-5 h-5" />
            Undo Last Edit
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-gray-500 text-center mt-4">
        Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> to exit edit mode
      </p>
    </div>
  );
};

export default VoiceEditMode;
