/**
 * AutoPauseTip Component
 * 
 * Contextual suggestion banner that appears after users complete 3 sessions.
 * Suggests the auto-pause feature to experienced users in a non-intrusive way.
 */

import React, { useEffect, useState } from 'react';
import { Lightbulb, Settings, X } from 'lucide-react';

interface AutoPauseTipProps {
  onTryAutoPause: () => void;
  onDismiss: () => void;
  autoHideDuration?: number; // milliseconds, default 30000 (30 seconds)
}

const AutoPauseTip: React.FC<AutoPauseTipProps> = ({
  onTryAutoPause,
  onDismiss,
  autoHideDuration = 30000,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismiss after specified duration
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 300); // Match animation duration
  };

  const handleTryAutoPause = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onTryAutoPause();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`w-full max-w-3xl mx-auto mb-6 transition-all duration-300 ${
        isExiting ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'
      }`}
    >
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg shadow-md p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              💡 Pro Tip: Work Hands-Free
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              You can enable <strong>"Auto-Pause"</strong> in settings to automatically stop dictating when you pause speaking. 
              No need to click the stop button!
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTryAutoPause}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md
                         shadow-sm hover:shadow-md
                         transition-all duration-200
                         focus:outline-none focus:ring-4 focus:ring-blue-300
                         flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Try Auto-Pause
              </button>

              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-medium text-sm rounded-md
                         border border-gray-300
                         transition-all duration-200
                         focus:outline-none focus:ring-4 focus:ring-gray-300"
              >
                No Thanks
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-md
                     transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Dismiss tip"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-dismiss indicator */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <div className="flex-1 bg-gray-200 rounded-full h-1 overflow-hidden">
            <div
              className="bg-blue-400 h-full rounded-full transition-all"
              style={{
                animation: `shrink ${autoHideDuration}ms linear`,
                width: '100%',
              }}
            />
          </div>
          <span className="whitespace-nowrap">Auto-dismisses in {autoHideDuration / 1000}s</span>
        </div>
      </div>

      {/* CSS for shrink animation */}
      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default AutoPauseTip;
