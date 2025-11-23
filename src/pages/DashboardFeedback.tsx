import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DictationInput from '../components/feedback/DictationInput';
import { apiService } from '../services/api';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'accessibility', label: 'Accessibility Issue' },
  { value: 'other', label: 'Other' },
];

const DashboardFeedback: React.FC = () => {
  const [type, setType] = useState(FEEDBACK_TYPES[0].value);
  const [description, setDescription] = useState('');
  const [browserInfo, setBrowserInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setBrowserInfo(window.navigator.userAgent);
  }, []);

  const isSubmitDisabled = useMemo(() => {
    return submitting || description.trim().length === 0;
  }, [submitting, description]);

  const handleDictation = useCallback((textFragment: string) => {
    setDescription((prev) => {
      if (!prev) {
        return textFragment;
      }
      return `${prev.trimEnd()} ${textFragment}`;
    });
  }, []);

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
        <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Voice-friendly feedback</p>
        <h1 className="mt-2 text-4xl font-semibold text-white">Send Feedback</h1>
        <p className="mt-3 max-w-2xl text-lg text-gray-300">
          Dictate or type accessibility issues, bugs, or suggestions. We review every submission directly from Firebase Console.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-300">Feedback Type</span>
            <select
              className="rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-3 text-gray-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-800"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {FEEDBACK_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-300">Browser Details</span>
            <p className="rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-sm text-gray-400">
              {browserInfo || 'Collecting browser info…'}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="feedback-description" className="text-sm font-medium text-gray-300">
            Description
          </label>
          <p className="text-sm text-gray-500">Explain what happened, what you expected, and any assistive tech involved.</p>
          <textarea
            id="feedback-description"
            className="mt-3 min-h-[220px] w-full rounded-2xl border border-gray-700 bg-gray-900/80 p-5 text-base text-gray-100 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-800"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Start typing or use the microphone to dictate your report…"
          />
          <div className="mt-4">
            <DictationInput onTranscript={handleDictation} />
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
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex items-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {submitting ? 'Sending…' : 'Submit Feedback'}
          </button>
          <span className="text-xs text-gray-500">
            Submissions are private to the LexiAid team and reviewed weekly.
          </span>
        </div>
      </form>
    </div>
  );
};

export default DashboardFeedback;
