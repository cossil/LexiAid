/**
 * FinalizedAnswer Component
 * 
 * Displays the final, accepted answer with export options.
 * Shows metadata and provides copy, download, and reset actions.
 */

import React, { useState } from 'react';
import { CheckCircle, Copy, Download, RotateCcw, Check } from 'lucide-react';

interface FinalizedAnswerProps {
  answer: string;
  wordCount: number;
  iterationCount: number;
  onCopy: () => void;
  onDownload: () => void;
  onStartNew: () => void;
}

const FinalizedAnswer: React.FC<FinalizedAnswerProps> = ({
  answer,
  wordCount,
  iterationCount,
  onCopy,
  onDownload,
  onStartNew,
}) => {
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      onCopy();
      setShowCopiedToast(true);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowCopiedToast(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try selecting and copying manually.');
    }
  };

  const handleDownload = () => {
    // Create a blob with the answer text
    const blob = new Blob([answer], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `answer-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    URL.revokeObjectURL(url);
    
    onDownload();
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border-2 border-green-200 p-6 relative">
      {/* Success animation header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="animate-bounce">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-800">
          Your Answer is Ready!
        </h2>
      </div>

      {/* Answer display */}
      <div className="mb-6">
        <div className="p-6 bg-white rounded-lg border-2 border-gray-300 shadow-sm">
          <p 
            className="text-lg text-gray-900 whitespace-pre-wrap leading-relaxed select-text"
            style={{ fontFamily: 'OpenDyslexic, sans-serif' }}
          >
            {answer}
          </p>
          
          {/* Metadata */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Word count:</span>
              <span>{wordCount} words</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Refinement iterations:</span>
              <span>{iterationCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-3">What would you like to do?</p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 min-w-[180px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                       shadow-md hover:shadow-lg
                       transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-blue-300
                       flex items-center justify-center gap-2"
            >
              {showCopiedToast ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy to Clipboard
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 min-w-[180px] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg
                       shadow-md hover:shadow-lg
                       transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-indigo-300
                       flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download as Text
            </button>
          </div>
        </div>

        {/* Start new answer */}
        <div className="flex justify-center">
          <button
            onClick={onStartNew}
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg
                     shadow-md hover:shadow-lg
                     transition-all duration-200
                     focus:outline-none focus:ring-4 focus:ring-green-300
                     flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Start New Answer
          </button>
        </div>
      </div>

      {/* Helpful tip */}
      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800 flex items-start gap-2">
          <span className="text-lg">💡</span>
          <span><strong>Tip:</strong> Paste this into your assignment document or save it for later reference.</span>
        </p>
      </div>

      {/* Toast notification */}
      {showCopiedToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg
                      animate-slide-up flex items-center gap-2 z-50">
          <Check className="w-5 h-5" />
          <span className="font-medium">Copied to clipboard!</span>
        </div>
      )}

      {/* Success confetti effect (optional) */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FinalizedAnswer;
