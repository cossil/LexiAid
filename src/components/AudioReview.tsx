import React, { useRef, useState, useEffect } from 'react';
import { Check, X, Mic, Play, Pause, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AudioReviewProps {
  // audioBlob is used by the parent component for sending to the server
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  audioBlob?: Blob;
  audioUrl: string;
  onSend: (transcript: string) => void;
  onReRecord: () => void;
  onClose: () => void;
  transcript?: string;
  isProcessing?: boolean;
}

const AudioReview: React.FC<AudioReviewProps> = ({
  audioBlob,
  audioUrl,
  onSend,
  onReRecord,
  onClose,
  transcript = '',
  isProcessing = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Update edited transcript when transcript prop changes
  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Error playing audio');
      });
    }
    setIsPlaying(!isPlaying);
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle seeking
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(1, pos)) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format time (seconds to MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Handle send
  const handleSend = () => {
    onSend(editedTranscript.trim());
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Review Your Recording
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Audio Player */}
        <div className="mb-4">
          <div className="flex items-center justify-center mb-2">
            <button
              onClick={togglePlayPause}
              className="p-3 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-800/50"
              disabled={isProcessing}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </button>
          </div>
          <div ref={progressBarRef} onClick={handleSeek} className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 cursor-pointer">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Transcript */}
        <div className="mb-4">
          <label
            htmlFor="transcript"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Transcript
          </label>
          <textarea
            id="transcript"
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:bg-gray-700 dark:text-white"
            rows={4}
            placeholder="Review and edit your transcript..."
            disabled={isProcessing}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onReRecord}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isProcessing}
          >
            <Mic className="-ml-1 mr-2 h-4 w-4" />
            Re-record
          </button>
          <div className="space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isProcessing || !editedTranscript.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                <>
                  <Check className="-ml-1 mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
};

export default AudioReview;
