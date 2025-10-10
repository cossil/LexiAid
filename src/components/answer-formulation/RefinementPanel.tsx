/**
 * RefinementPanel Component
 * 
 * Displays original transcript and refined answer side-by-side (or stacked on mobile).
 * Includes action buttons for finalizing, editing with voice, or editing manually.
 */

import React from 'react';
import { Sparkles, Volume2, VolumeX, Loader2, Check, Mic, Edit3, RotateCcw } from 'lucide-react';
import { useOnDemandTTSPlayer } from '../../hooks/useOnDemandTTSPlayer';

interface RefinementPanelProps {
  originalTranscript: string;
  refinedAnswer: string | null;
  status: 'refining' | 'refined' | 'editing';
  onRefine?: () => void;
  onFinalize: () => void;
  onEditWithVoice: () => void;
  onEditManually: () => void;
  onStartOver?: () => void;
  // Removed deprecated props: onPlayAudio, isPlayingAudio (now handled internally)
}

const RefinementPanel: React.FC<RefinementPanelProps> = ({
  originalTranscript,
  refinedAnswer,
  status,
  onRefine,
  onFinalize,
  onEditWithVoice,
  onEditManually,
  onStartOver,
}) => {
  const isRefining = status === 'refining';
  const isEditing = status === 'editing';
  
  // Separate TTS players for original transcript and refined answer
  const { 
    playText: playOriginal, 
    stopAudio: stopOriginal, 
    status: originalStatus 
  } = useOnDemandTTSPlayer();

  const { 
    playText: playRefined, 
    stopAudio: stopRefined, 
    status: refinedStatus 
  } = useOnDemandTTSPlayer();
  
  // TTS click handlers
  const handlePlayOriginal = () => {
    // Stop refined audio if playing
    if (refinedStatus === 'playing' || refinedStatus === 'loading') {
      stopRefined();
    }
    
    // Toggle original audio
    if (originalStatus === 'playing' || originalStatus === 'loading') {
      stopOriginal();
    } else if (originalTranscript.trim()) {
      playOriginal(originalTranscript);
    }
  };

  const handlePlayRefined = () => {
    // Stop original audio if playing
    if (originalStatus === 'playing' || originalStatus === 'loading') {
      stopOriginal();
    }
    
    // Toggle refined audio
    if (refinedStatus === 'playing' || refinedStatus === 'loading') {
      stopRefined();
    } else if (refinedAnswer?.trim()) {
      playRefined(refinedAnswer);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          {refinedAnswer ? 'Review Your Answer' : 'Ready to Refine'}
        </h2>
      </div>

      {/* Side-by-side panels (stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Original Transcript Panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Your Spoken Thoughts (Original)</h3>
            
            {/* TTS Speaker Button for Original Transcript */}
            {originalTranscript && (
              <button
                onClick={handlePlayOriginal}
                disabled={!originalTranscript.trim()}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 
                           text-blue-700 rounded-md transition-colors duration-200
                           disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Listen to original transcript"
              >
                {originalStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : originalStatus === 'playing' ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                {originalStatus === 'playing' ? 'Playing...' : 'Listen'}
              </button>
            )}
          </div>
          <div className="flex-1 p-4 bg-gray-50 rounded-md border border-gray-300 min-h-[200px] max-h-[400px] overflow-y-auto">
            <p className="text-base text-gray-700 whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
              {originalTranscript}
            </p>
          </div>
        </div>

        {/* Refined Answer Panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Refined Answer</h3>
            
            {/* TTS Speaker Button for Refined Answer */}
            {refinedAnswer && (
              <button
                onClick={handlePlayRefined}
                disabled={!refinedAnswer.trim()}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 
                           text-blue-700 rounded-md transition-colors duration-200
                           disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Listen to refined answer"
              >
                {refinedStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : refinedStatus === 'playing' ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
                {refinedStatus === 'playing' ? 'Playing...' : 'Listen'}
              </button>
            )}
          </div>
          <div className="flex-1 p-4 bg-white rounded-md border-2 border-gray-300 min-h-[200px] max-h-[400px] overflow-y-auto">
            {isRefining ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 font-medium">Refining your answer...</p>
                <p className="text-sm text-gray-500">This may take a few seconds</p>
              </div>
            ) : isEditing ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 font-medium">Applying your edit...</p>
              </div>
            ) : refinedAnswer ? (
              <p className="text-lg text-gray-900 whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
                {refinedAnswer}
              </p>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 italic text-center">
                  Click "Refine My Answer" to transform your spoken thoughts into clear writing
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!refinedAnswer && !isRefining ? (
        // Show refine button if no refined answer yet
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onRefine}
            disabled={!originalTranscript.trim()}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg rounded-lg
                     shadow-md hover:shadow-lg
                     transition-all duration-200
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-4 focus:ring-purple-300
                     flex items-center gap-2"
          >
            <Sparkles className="w-6 h-6" />
            Refine My Answer
          </button>
          {onStartOver && (
            <button
              onClick={onStartOver}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium
                       transition-colors duration-200
                       focus:outline-none focus:underline
                       flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Start Over
            </button>
          )}
        </div>
      ) : refinedAnswer && !isRefining && !isEditing ? (
        // Show action buttons after refinement
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-900 mb-2">What would you like to do?</p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onFinalize}
                className="flex-1 min-w-[200px] px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg
                         shadow-md hover:shadow-lg
                         transition-all duration-200
                         focus:outline-none focus:ring-4 focus:ring-green-300
                         flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Finalize Answer
              </button>
              
              <button
                onClick={onEditWithVoice}
                className="flex-1 min-w-[200px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                         shadow-md hover:shadow-lg
                         transition-all duration-200
                         focus:outline-none focus:ring-4 focus:ring-blue-300
                         flex items-center justify-center gap-2"
              >
                <Mic className="w-5 h-5" />
                Edit with Voice
              </button>
              
              <button
                onClick={onEditManually}
                className="flex-1 min-w-[200px] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg
                         shadow-md hover:shadow-lg
                         transition-all duration-200
                         focus:outline-none focus:ring-4 focus:ring-indigo-300
                         flex items-center justify-center gap-2"
              >
                <Edit3 className="w-5 h-5" />
                Edit Manually
              </button>
            </div>
          </div>
          
          {onStartOver && (
            <div className="flex justify-center">
              <button
                onClick={onStartOver}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium
                         transition-colors duration-200
                         focus:outline-none focus:underline
                         flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default RefinementPanel;
