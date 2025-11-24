import React, { useCallback, useEffect, useRef } from 'react';
import { AlertCircle, Loader2, Mic, Square, X } from 'lucide-react';
import useRealtimeStt, { SttStatus } from '../../hooks/useRealtimeStt';

interface DictationInputProps {
  onTranscript: (textFragment: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
}

const statusCopy: Record<SttStatus, string> = {
  idle: 'Ready to capture your thoughts',
  connecting: 'Connecting to microphone…',
  requesting_permission: 'Awaiting microphone permission…',
  dictating: 'Listening…',
  review: 'Dictation paused',
};

const classNames = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

const DictationInput: React.FC<DictationInputProps> = ({ onTranscript, onClear, disabled = false, className }) => {
  const {
    status,
    transcript,
    error,
    startDictation,
    stopDictation,
    cancelDictation,
  } = useRealtimeStt();

  const deliveredLengthRef = useRef(0);

  // Stream transcript to parent
  useEffect(() => {
    const finalText = transcript.final;
    if (!finalText) {
      deliveredLengthRef.current = 0;
      return;
    }

    if (finalText.length <= deliveredLengthRef.current) {
      return;
    }

    const newPortion = finalText.slice(deliveredLengthRef.current);
    deliveredLengthRef.current = finalText.length;
    
    // Pass the new portion including spaces to preserve formatting
    if (newPortion) {
      onTranscript(newPortion);
    }
  }, [transcript.final, onTranscript]);

  // Handle interim results if needed, but typically we append final. 
  // If we want streaming interim results to appear in the textarea, we might need a different approach 
  // or just wait for final. The previous implementation only sent 'trimmedPortion'.
  // To make it feel "streaming", waiting for final is safer for simple appending. 
  // If we want real-time character-by-character feedback in the textarea, we'd need to handle interim replacement.
  // For now, sticking to the previous logic of sending finalized chunks is robust.
  
  const handleStart = useCallback(async () => {
    if (disabled) return;
    deliveredLengthRef.current = 0;
    await startDictation();
  }, [disabled, startDictation]);

  const handleStop = useCallback(() => {
    stopDictation();
  }, [stopDictation]);

  const handleClear = useCallback(() => {
    deliveredLengthRef.current = 0;
    cancelDictation();
    onClear?.();
  }, [cancelDictation, onClear]);

  const isRecording = status === 'dictating';
  const isBusy = status === 'connecting' || status === 'requesting_permission';

  return (
    <div className={classNames('flex flex-col gap-4', className)}>
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
        
        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className={classNames(
            'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            isRecording ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-gray-800 text-gray-400'
          )}>
            {isRecording ? <Mic className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </div>
          
          <div className="flex flex-col">
            <span className={classNames(
              "text-sm font-medium",
              isRecording ? "text-rose-400" : "text-gray-300"
            )}>
              {isRecording ? 'Recording...' : 'Dictation'}
            </span>
            <span className="text-xs text-gray-500">{statusCopy[status]}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRecording ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <Square className="h-4 w-4 fill-current" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={disabled || isBusy}
              className={classNames(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                disabled || isBusy 
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-500"
              )}
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              {isBusy ? 'Connecting...' : 'Start Dictation'}
            </button>
          )}

          <button
            type="button"
            onClick={handleClear}
            title="Clear Dictation Session"
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DictationInput;
