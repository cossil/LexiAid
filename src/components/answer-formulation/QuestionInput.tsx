/**
 * QuestionInput Component
 * 
 * Large, auto-resizing textarea for entering the assignment question.
 * Helps organize the refined answer based on the question context.
 */

import React, { useEffect, useRef } from 'react';
import { FileQuestion, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useOnDemandTTSPlayer } from '../../hooks/useOnDemandTTSPlayer';

interface QuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const QuestionInput: React.FC<QuestionInputProps> = ({ value, onChange, disabled = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxLength = 500;
  const remainingChars = maxLength - value.length;
  
  // TTS hook for reading the question aloud
  const { playText, stopAudio, status } = useOnDemandTTSPlayer();

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight to fit content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);
  
  // TTS click handler
  const handlePlayQuestion = () => {
    if (status === 'playing' || status === 'loading') {
      stopAudio();
    } else if (value.trim()) {
      playText(value);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <FileQuestion className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          Your Question <span className="text-sm font-normal text-gray-500">(Optional but Recommended)</span>
        </h2>
        
        {/* TTS Speaker Button */}
        <button
          onClick={handlePlayQuestion}
          disabled={!value.trim() || disabled}
          className="ml-auto p-2 rounded-full hover:bg-gray-100 
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-300"
          title={status === 'playing' ? "Stop reading question" : "Listen to question"}
          aria-label={status === 'playing' ? "Stop audio" : "Play question audio"}
        >
          {status === 'loading' ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : status === 'playing' ? (
            <VolumeX className="w-5 h-5 text-blue-600" />
          ) : (
            <Volume2 className="w-5 h-5 text-blue-600" />
          )}
        </button>
      </div>

      {/* Example */}
      <div className="mb-3 text-sm text-gray-600 italic">
        Example: "Explain the causes of the American Revolution"
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        placeholder="Type or paste your assignment question here..."
        aria-label="Enter your assignment question"
        className="w-full min-h-[100px] px-4 py-3 text-lg text-gray-900 bg-white border-2 border-gray-300 rounded-md 
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none
                   placeholder:text-gray-400 placeholder:italic
                   disabled:bg-gray-100 disabled:cursor-not-allowed
                   resize-none overflow-hidden
                   transition-colors duration-200"
        style={{ fontFamily: 'OpenDyslexic, sans-serif' }}
      />

      {/* Character counter and tip */}
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <span className="text-lg">💡</span>
          <span>Tip: Adding your question helps organize your answer</span>
        </div>
        <div className={`text-sm font-medium ${remainingChars < 50 ? 'text-orange-600' : 'text-gray-500'}`}>
          {remainingChars} characters remaining
        </div>
      </div>
    </div>
  );
};

export default QuestionInput;
