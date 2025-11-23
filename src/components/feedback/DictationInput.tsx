import React, { useCallback, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import useRealtimeStt, { SttStatus } from '../../hooks/useRealtimeStt';

interface DictationInputProps {
  onTranscript: (textFragment: string) => void;
  disabled?: boolean;
  className?: string;
}

const statusCopy: Record<SttStatus, string> = {
  idle: 'Tap to dictate',
  connecting: 'Connecting…',
  requesting_permission: 'Requesting microphone permission…',
  dictating: 'Listening…',
  review: 'Reviewing transcript',
};

const classNames = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(' ');

const DictationInput: React.FC<DictationInputProps> = ({ onTranscript, disabled = false, className }) => {
  const {
    status,
    transcript,
    error,
    startDictation,
    stopDictation,
    cancelDictation,
  } = useRealtimeStt();

  const deliveredLengthRef = useRef(0);

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
    const trimmedPortion = newPortion.trim();

    if (trimmedPortion) {
      onTranscript(trimmedPortion);
    }
  }, [transcript.final, onTranscript]);

  const handleToggle = useCallback(async () => {
    if (disabled) {
      return;
    }

    if (status === 'dictating' || status === 'connecting' || status === 'requesting_permission') {
      stopDictation();
      return;
    }

    deliveredLengthRef.current = 0;
    await startDictation();
  }, [disabled, status, startDictation, stopDictation]);

  const handleCancel = useCallback(() => {
    deliveredLengthRef.current = 0;
    cancelDictation();
  }, [cancelDictation]);

  const isListening = status === 'dictating';
  const isBusy = status === 'connecting' || status === 'requesting_permission';

  return (
    <div className={classNames('rounded-xl border border-gray-800/60 bg-gray-900/60 p-4 text-gray-100 shadow-lg backdrop-blur-xl', className)}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={classNames(
            'relative inline-flex items-center justify-center rounded-full p-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            disabled && 'opacity-40 cursor-not-allowed',
            !disabled && isListening && 'bg-rose-500/90 hover:bg-rose-500',
            !disabled && !isListening && 'bg-blue-600 hover:bg-blue-500'
          )}
          aria-pressed={isListening}
          aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
        >
          {isBusy ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isListening ? (
            <Square className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
          {isListening && (
            <span className="absolute -right-2 -top-2 inline-flex h-4 w-4 animate-ping rounded-full bg-rose-300 opacity-75" aria-hidden />
          )}
        </button>

        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            {statusCopy[status]}
          </p>
          <p className="text-xs text-gray-400">
            {transcript.interim || 'Dictated text will append to your notes.'}
          </p>
        </div>

        {(isListening || transcript.final) && (
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs font-medium text-gray-400 hover:text-gray-200"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DictationInput;
