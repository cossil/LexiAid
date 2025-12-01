/**
 * AnswerFormulationPage Component
 * 
 * Main orchestrator for the Answer Formulation feature.
 * Manages the complete workflow from dictation through refinement to finalization.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import useAnswerFormulation from '../hooks/useAnswerFormulation';

// Import all sub-components
import QuestionInput from '../components/answer-formulation/QuestionInput';
import DictationPanel from '../components/answer-formulation/DictationPanel';
import RefinementPanel from '../components/answer-formulation/RefinementPanel';
import VoiceEditMode from '../components/answer-formulation/VoiceEditMode';
import ManualEditMode from '../components/answer-formulation/ManualEditMode';
import FinalizedAnswer from '../components/answer-formulation/FinalizedAnswer';
import AutoPauseSettings from '../components/answer-formulation/AutoPauseSettings';
import GuidedPractice from '../components/answer-formulation/GuidedPractice';
import AutoPauseTip from '../components/answer-formulation/AutoPauseTip';

type EditMode = 'none' | 'voice' | 'manual';

const AnswerFormulationPage: React.FC = () => {
  const { userPreferences, updateUserPreferences } = useAuth();
  const { speakText, uiTtsEnabled } = useAccessibility();
  
  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };
  
  // Main state management hook
  const {
    question,
    setQuestion,
    transcript,
    refinedAnswer,
    updateRefinedAnswer,
    status,
    sessionId,
    fidelityScore,
    iterationCount,
    error,
    autoPauseEnabled,
    setAutoPauseEnabled,
    pauseDuration,
    setPauseDuration,
    pauseCountdown,
    startDictation,
    stopDictation,
    refineAnswer,
    editAnswer,
    finalizeAnswer,
    reset,
    updateManualTranscript,
    interimTranscript,
  } = useAnswerFormulation();

  // Local UI state
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAutoPauseTip, setShowAutoPauseTip] = useState(false);

  // Check if user needs onboarding
  useEffect(() => {
    const hasCompletedOnboarding = userPreferences?.answerFormulationOnboardingCompleted ?? false;
    setShowOnboarding(!hasCompletedOnboarding);
  }, [userPreferences]);

  // Check if we should show auto-pause tip
  useEffect(() => {
    const sessionsCompleted = userPreferences?.answerFormulationSessionsCompleted ?? 0;
    const tipDismissed = userPreferences?.answerFormulationAutoPauseSuggestionDismissed ?? false;
    
    // Show tip after 3rd session if auto-pause not enabled and not dismissed
    if (sessionsCompleted === 3 && !autoPauseEnabled && !tipDismissed && status === 'finalized') {
      setShowAutoPauseTip(true);
    }
  }, [userPreferences, autoPauseEnabled, status]);

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Update preferences but don't block on errors
    updateUserPreferences({ answerFormulationOnboardingCompleted: true }).catch((err) => {
      console.warn('Failed to save onboarding preference:', err);
    });
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    // Update preferences but don't block on errors
    updateUserPreferences({ answerFormulationOnboardingCompleted: true }).catch((err) => {
      console.warn('Failed to save onboarding preference:', err);
    });
  };

  // Handle auto-pause tip
  const handleTryAutoPause = () => {
    setShowAutoPauseTip(false);
    setShowSettings(true);
    updateUserPreferences({ answerFormulationAutoPauseSuggestionDismissed: true }).catch((err) => {
      console.warn('Failed to save auto-pause preference:', err);
    });
  };

  const handleDismissTip = () => {
    setShowAutoPauseTip(false);
    updateUserPreferences({ answerFormulationAutoPauseSuggestionDismissed: true }).catch((err) => {
      console.warn('Failed to save auto-pause preference:', err);
    });
  };

  // Handle settings
  const handleSettingsSave = () => {
    setShowSettings(false);
  };

  const handleSettingsCancel = () => {
    setShowSettings(false);
  };

  // Handle refinement panel actions
  const handleEditWithVoice = () => {
    setEditMode('voice');
  };

  const handleEditManually = () => {
    setEditMode('manual');
  };

  const handleDoneEditing = () => {
    setEditMode('none');
  };

  const handleManualEditUpdate = (newAnswer: string) => {
    // Update the refined answer with manual edits
    updateRefinedAnswer(newAnswer);
  };

  // Handle finalized answer actions
  const handleCopy = () => {
    console.log('Answer copied to clipboard');
  };

  const handleDownload = () => {
    console.log('Answer downloaded');
  };

  const handleStartNew = () => {
    reset();
    setEditMode('none');
  };

  // Calculate word count
  const wordCount = refinedAnswer 
    ? refinedAnswer.split(/\s+/).filter(word => word.length > 0).length 
    : 0;

  // Show onboarding for first-time users
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <GuidedPractice
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      </div>
    );
  }

  // Show settings modal
  if (showSettings) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <AutoPauseSettings
            enabled={autoPauseEnabled}
            duration={pauseDuration}
            onEnabledChange={setAutoPauseEnabled}
            onDurationChange={setPauseDuration}
            onSave={handleSettingsSave}
            onCancel={handleSettingsCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold text-gray-900 mb-2"
            onMouseEnter={() => handleHover('Answer Formulation')}
          >
            Answer Formulation
          </h1>
          <p 
            className="text-lg text-gray-600"
            onMouseEnter={() => handleHover('Transform your spoken thoughts into clear, well-written answers')}
          >
            Transform your spoken thoughts into clear, well-written answers
          </p>
        </div>

        {/* Auto-Pause Tip (contextual) */}
        {showAutoPauseTip && (
          <AutoPauseTip
            onTryAutoPause={handleTryAutoPause}
            onDismiss={handleDismissTip}
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <p className="text-red-800 font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Main Content - Conditional Rendering Based on Status */}
        
        {/* Finalized State */}
        {status === 'finalized' && refinedAnswer && (
          <FinalizedAnswer
            answer={refinedAnswer}
            wordCount={wordCount}
            iterationCount={iterationCount}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onStartNew={handleStartNew}
          />
        )}

        {/* Editing States */}
        {(status === 'refined' || status === 'editing') && editMode === 'voice' && refinedAnswer && (
          <VoiceEditMode
            refinedAnswer={refinedAnswer}
            onEditCommand={editAnswer}
            onDone={handleDoneEditing}
            isProcessing={status === 'editing'}
          />
        )}

        {(status === 'refined' || status === 'editing') && editMode === 'manual' && refinedAnswer && (
          <ManualEditMode
            initialAnswer={refinedAnswer}
            onUpdate={handleManualEditUpdate}
            onDone={handleDoneEditing}
          />
        )}

        {/* Refinement/Review State */}
        {(status === 'idle' || status === 'recording' || status === 'refining' || status === 'refined' || status === 'editing') && 
         editMode === 'none' && (
          <>
            {/* Question Input */}
            <QuestionInput
              value={question}
              onChange={setQuestion}
              disabled={status === 'recording' || status === 'refining' || status === 'editing'}
            />

            {/* Dictation Panel */}
            {(status === 'idle' || status === 'recording') && (
              <DictationPanel
                transcript={transcript}
                interimTranscript={interimTranscript}
                isRecording={status === 'recording'}
                onStart={startDictation}
                onStop={stopDictation}
                onTranscriptChange={updateManualTranscript}
                onSettingsClick={() => setShowSettings(true)}
                autoPauseEnabled={autoPauseEnabled}
                pauseCountdown={pauseCountdown}
              />
            )}

            {/* Refinement Panel */}
            {transcript && (status === 'idle' || status === 'refining' || status === 'refined' || status === 'editing') && (
              <RefinementPanel
                originalTranscript={transcript}
                refinedAnswer={refinedAnswer}
                status={status === 'refining' ? 'refining' : status === 'editing' ? 'editing' : 'refined'}
                onRefine={refineAnswer}
                onFinalize={finalizeAnswer}
                onEditWithVoice={handleEditWithVoice}
                onEditManually={handleEditManually}
                onStartOver={handleStartNew}
              />
            )}
          </>
        )}

        {/* Session Info (Debug - can be removed in production) */}
        {sessionId && (
          <div className="text-xs text-gray-400 text-center">
            Session ID: {sessionId} | Status: {status} | Iterations: {iterationCount}
            {fidelityScore !== null && ` | Fidelity: ${fidelityScore.toFixed(2)}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerFormulationPage;
