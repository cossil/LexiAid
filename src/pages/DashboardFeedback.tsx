import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import DictationInput from '../components/feedback/DictationInput';
import { apiService } from '../services/api';
import { useTTSPlayer } from '../hooks/useTTSPlayer';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { HighlightedTextBlock } from '../components/shared/HighlightedTextBlock';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'accessibility', label: 'Accessibility Issue' },
  { value: 'other', label: 'Other' },
];

const getReadableBrowserInfo = (): string => {
  const ua = window.navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // OS Detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Browser Detection (Order matters significantly due to UA spoofing)
  if (ua.includes("Firefox")) {
    browser = "Firefox";
  } else if (ua.includes("SamsungBrowser")) {
    browser = "Samsung Internet";
  } else if (ua.includes("Opera") || ua.includes("OPR")) {
    browser = "Opera";
  } else if (ua.includes("Edg")) { // Edge (Chromium)
    browser = "Edge";
  } else if (ua.includes("Chrome")) {
    browser = "Chrome";
  } else if (ua.includes("Safari")) {
    browser = "Safari";
  }

  return `${browser} on ${os}`;
};

const DashboardFeedback: React.FC = () => {
  const [type, setType] = useState(FEEDBACK_TYPES[0].value);
  const [description, setDescription] = useState('');
  const [browserInfo, setBrowserInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const { speakText, uiTtsEnabled } = useAccessibility();

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  const handleSelectHover = () => {
    const currentLabel = FEEDBACK_TYPES.find(t => t.value === type)?.label || type;
    handleHover(`Feedback Type: ${currentLabel}`);
  };

  const handleTextareaHover = () => {
    if (!description.trim()) {
      handleHover("Start typing or use the microphone below to dictate your report...");
    } else {
      handleHover("Description field");
    }
  };

  const {
    playAudio,
    stopAudio,
    status: ttsStatus,
    activeTimepoint,
    wordTimepoints,
    seekAndPlay,
  } = useTTSPlayer(null);

  useEffect(() => {
    setBrowserInfo(getReadableBrowserInfo());
  }, []);

  const isSubmitDisabled = useMemo(() => {
    return submitting || description.trim().length === 0;
  }, [submitting, description]);

  const isPlaying = ttsStatus === 'playing' || ttsStatus === 'loading' || ttsStatus === 'paused';

  const handleDictation = useCallback((textFragment: string) => {
    setDescription((prev) => {
      if (!prev) {
        return textFragment;
      }
      return `${prev.trimEnd()} ${textFragment}`;
    });
  }, []);

  const handleReadAloud = useCallback(() => {
    if (isPlaying) {
      stopAudio();
    } else {
      if (description.trim()) {
        playAudio({ text: description });
      }
    }
  }, [isPlaying, stopAudio, description, playAudio]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessId(null);

    try {
      const response = await apiService.submitFeedback({
        type,
        description: description.trim(),
        browserInfo,
      });
      setSuccessId(response.feedback_id);
      setDescription('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }, [browserInfo, description, isSubmitDisabled, type]);

  return (
    <div className="mx-auto max-w-4xl py-10">
      <header>
        <p 
          className="text-sm uppercase tracking-[0.3em] text-blue-400"
          onMouseEnter={() => handleHover('Voice-friendly feedback')}
          onClick={() => handleHover('Voice-friendly feedback')}
        >
          Voice-friendly feedback
        </p>
        <h1 
          className="mt-2 text-4xl font-semibold text-white"
          onMouseEnter={() => handleHover('Send Feedback')}
          onClick={() => handleHover('Send Feedback')}
        >
          Send Feedback
        </h1>
        <p 
          className="mt-3 max-w-2xl text-lg text-gray-300"
          onMouseEnter={() => handleHover('Dictate or type accessibility issues, bugs, or suggestions. We review every submission directly from Firebase Console.')}
          onClick={() => handleHover('Dictate or type accessibility issues, bugs, or suggestions. We review every submission directly from Firebase Console.')}
        >
          Dictate or type accessibility issues, bugs, or suggestions. We review every submission directly from Firebase Console.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span 
              className="text-sm font-medium text-gray-300"
              onMouseEnter={() => handleHover('Feedback Type')}
              onClick={() => handleHover('Feedback Type')}
            >
              Feedback Type
            </span>
            <select
              className="rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-3 text-gray-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-800"
              value={type}
              onChange={(event) => setType(event.target.value)}
              onMouseEnter={handleSelectHover}
            >
              {FEEDBACK_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <span 
              className="text-sm font-medium text-gray-300"
              onMouseEnter={() => handleHover('Browser Details')}
              onClick={() => handleHover('Browser Details')}
            >
              Browser Details
            </span>
            <p 
              className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-sm text-gray-400"
              onMouseEnter={() => handleHover(browserInfo || 'Collecting browser info…')}
              onClick={() => handleHover(browserInfo || 'Collecting browser info…')}
            >
              {browserInfo || 'Collecting browser info…'}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
             <div>
                <label 
                  htmlFor="feedback-description" 
                  className="text-sm font-medium text-gray-300"
                  onMouseEnter={() => handleHover('Description')}
                  onClick={() => handleHover('Description')}
                >
                  Description
                </label>
                <p 
                  className="text-sm text-gray-500"
                  onMouseEnter={() => handleHover('Explain what happened, what you expected, and any assistive tech involved.')}
                  onClick={() => handleHover('Explain what happened, what you expected, and any assistive tech involved.')}
                >
                  Explain what happened, what you expected, and any assistive tech involved.
                </p>
             </div>
             
             {/* Read Aloud Button */}
             <div onMouseEnter={() => handleHover(isPlaying ? 'Stop Reading' : 'Read Aloud')}>
               <button
                  type="button"
                  onClick={handleReadAloud}
                  disabled={!description.trim()}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    !description.trim() 
                      ? 'text-gray-600 cursor-not-allowed' 
                      : isPlaying 
                        ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
                        : 'text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
                  }`}
               >
                  {ttsStatus === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                  {isPlaying ? 'Stop Reading' : 'Read Aloud'}
               </button>
             </div>
          </div>
          
          <div className="space-y-3">
            {isPlaying ? (
              <div 
                className="min-h-[220px] w-full rounded-2xl border border-blue-500/50 bg-slate-900 p-5 text-base text-white shadow-inner overflow-y-auto"
                aria-live="polite"
              >
                <HighlightedTextBlock
                  text={description}
                  wordTimepoints={wordTimepoints}
                  activeTimepoint={activeTimepoint}
                  onWordClick={seekAndPlay}
                  className="text-white" 
                  theme="dark"
                />
              </div>
            ) : (
              <textarea
                id="feedback-description"
                className="min-h-[220px] w-full rounded-2xl border border-gray-600 bg-slate-900 p-5 text-base text-white placeholder-gray-400 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onMouseEnter={handleTextareaHover}
                placeholder="Start typing or use the microphone below to dictate your report..."
              />
            )}
            
            <DictationInput 
              onTranscript={handleDictation} 
              className="w-full"
              disabled={isPlaying} // Disable dictation while reading aloud to prevent confusion
            />
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        )}

        {successId && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Thanks! Your feedback was received. Reference ID: <span className="font-mono">{successId}</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div onMouseEnter={() => handleHover(submitting ? 'Sending…' : 'Submit Feedback')}>
            <button
              type="submit"
              disabled={isSubmitDisabled || isPlaying}
              className="inline-flex items-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {submitting ? 'Sending…' : 'Submit Feedback'}
            </button>
          </div>
          <span 
            className="text-xs text-gray-500"
            onMouseEnter={() => handleHover('Submissions are private to the LexiAid team and reviewed weekly.')}
            onClick={() => handleHover('Submissions are private to the LexiAid team and reviewed weekly.')}
          >
            Submissions are private to the LexiAid team and reviewed weekly.
          </span>
        </div>
      </form>
    </div>
  );
};

export default DashboardFeedback;
