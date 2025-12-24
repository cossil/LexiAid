/**
 * GuidedPractice Component
 * 
 * Interactive onboarding tutorial that guides users through the complete
 * answer formulation workflow in a safe, sandboxed practice environment.
 */

import React, { useState } from 'react';
import { GraduationCap, Play, SkipForward, Mic, Sparkles, Volume2, Edit3, Check, Rocket } from 'lucide-react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface GuidedPracticeProps {
  onComplete: () => void;
  onSkip: () => void;
}

const GuidedPractice: React.FC<GuidedPracticeProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [practiceTranscript, setPracticeTranscript] = useState('');
  const [practiceRefinedAnswer, setPracticeRefinedAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const { speakText, uiTtsEnabled } = useAccessibility();

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  const sampleQuestion = "What makes a good friend?";
  const exampleMessyTranscript = "Um, a good friend is someone who like listens and is there when you need them and stuff.";
  const exampleRefinedAnswer = "A good friend is someone who listens and is there when you need them.";

  // Step 0: Welcome
  const renderWelcome = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <GraduationCap className="w-20 h-20 text-blue-600 animate-bounce" />
      </div>
      <h1 
        className="text-3xl font-bold text-gray-800"
        onMouseEnter={() => handleHover('Welcome to Answer Formulation!')}
        onClick={() => handleHover('Welcome to Answer Formulation!')}
      >
        Welcome to Answer Formulation!
      </h1>
      <p 
        className="text-lg text-gray-600 max-w-2xl mx-auto"
        onMouseEnter={() => handleHover('This tool helps you turn your spoken thoughts into clear, well-written answers.')}
        onClick={() => handleHover('This tool helps you turn your spoken thoughts into clear, well-written answers.')}
      >
        This tool helps you turn your spoken thoughts into clear, well-written answers.
      </p>
      <p 
        className="text-base text-gray-600"
        onMouseEnter={() => handleHover('Let\'s practice together with a sample question.')}
        onClick={() => handleHover('Let\'s practice together with a sample question.')}
      >
        Let's practice together with a sample question.
      </p>
      <div className="flex gap-4 justify-center pt-4">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-lg
                   shadow-md hover:shadow-lg transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-blue-300
                   flex items-center gap-2"
          onMouseEnter={() => handleHover('Start Practice')}
        >
          <Play className="w-6 h-6" />
          Start Practice
        </button>
        <button
          onClick={onSkip}
          className="px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg
                   transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-gray-300
                   flex items-center gap-2"
          onMouseEnter={() => handleHover('Skip to Feature')}
        >
          <SkipForward className="w-5 h-5" />
          Skip to Feature
        </button>
      </div>
    </div>
  );

  // Step 1: Sample Question
  const renderSampleQuestion = () => (
    <div className="space-y-6">
      <h2 
        className="text-2xl font-bold text-gray-800"
        onMouseEnter={() => handleHover('Your Practice Question')}
        onClick={() => handleHover('Your Practice Question')}
      >
        Your Practice Question
      </h2>
      <div className="p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <p 
          className="text-xl text-gray-800 font-medium italic"
          onMouseEnter={() => handleHover(sampleQuestion)}
          onClick={() => handleHover(sampleQuestion)}
        >
          "{sampleQuestion}"
        </p>
      </div>
      <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md">
        <p 
          className="text-sm text-yellow-800 flex items-start gap-2"
          onMouseEnter={() => handleHover('This is just for practice. Your answer won\'t be saved.')}
          onClick={() => handleHover('This is just for practice. Your answer won\'t be saved.')}
        >
          <span className="text-lg">💡</span>
          <span>This is just for practice. Your answer won't be saved.</span>
        </p>
      </div>
      <div className="flex justify-center pt-4">
        <button
          onClick={() => setCurrentStep(2)}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                   shadow-md hover:shadow-lg transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-blue-300"
          onMouseEnter={() => handleHover('Continue')}
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Step 2: Guided Dictation
  const renderGuidedDictation = () => (
    <div className="space-y-6">
      <h2 
        className="text-2xl font-bold text-gray-800"
        onMouseEnter={() => handleHover('Step 1: Speak Your Thoughts')}
        onClick={() => handleHover('Step 1: Speak Your Thoughts')}
      >
        Step 1: Speak Your Thoughts
      </h2>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p 
          className="text-sm text-blue-900 mb-2"
          onMouseEnter={() => handleHover('Tip: Don\'t worry about being perfect! Just speak naturally.')}
          onClick={() => handleHover('Tip: Don\'t worry about being perfect! Just speak naturally.')}
        >
          <strong>💬 Tip:</strong> Don't worry about being perfect! Just speak naturally.
        </p>
        <p 
          className="text-sm text-blue-800 italic"
          onMouseEnter={() => handleHover('For example: "Um, a good friend is someone who, like, listens to you and is there when you need them..."')}
          onClick={() => handleHover('For example: "Um, a good friend is someone who, like, listens to you and is there when you need them..."')}
        >
          For example: "Um, a good friend is someone who, like, listens to you and is there when you need them..."
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 p-8 bg-gray-50 rounded-lg border-2 border-gray-200">
        {!isRecording && !practiceTranscript ? (
          <>
            <button
              onClick={() => {
                setIsRecording(true);
                // Simulate recording
                setTimeout(() => {
                  setIsRecording(false);
                  setPracticeTranscript(exampleMessyTranscript);
                }, 3000);
              }}
              className="w-32 h-32 rounded-full bg-green-500 hover:bg-green-600 
                       flex items-center justify-center shadow-lg hover:shadow-xl
                       transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-300"
              onMouseEnter={() => handleHover('Start Dictating')}
            >
              <Mic className="w-16 h-16 text-white" />
            </button>
            <p 
              className="text-lg font-medium text-gray-700"
              onMouseEnter={() => handleHover('Start Dictating')}
              onClick={() => handleHover('Start Dictating')}
            >
              Start Dictating
            </p>
          </>
        ) : isRecording ? (
          <>
            <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <Mic className="w-12 h-12 text-white" />
            </div>
            <p 
              className="text-lg font-medium text-gray-700"
              onMouseEnter={() => handleHover('Listening...')}
              onClick={() => handleHover('Listening...')}
            >
              Listening...
            </p>
            <p 
              className="text-sm text-gray-500"
              onMouseEnter={() => handleHover('Simulating your speech')}
              onClick={() => handleHover('Simulating your speech')}
            >
              (Simulating your speech)
            </p>
          </>
        ) : (
          <div className="w-full">
            <p 
              className="text-base text-gray-700 p-4 bg-white rounded-md border border-gray-300"
              onMouseEnter={() => handleHover(practiceTranscript)}
              onClick={() => handleHover(practiceTranscript)}
            >
              {practiceTranscript}
            </p>
            <button
              onClick={() => setCurrentStep(3)}
              className="mt-4 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                       shadow-md hover:shadow-lg transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-blue-300"
              onMouseEnter={() => handleHover('Continue')}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Step 3: Guided Refinement
  const renderGuidedRefinement = () => (
    <div className="space-y-6">
      <h2 
        className="text-2xl font-bold text-gray-800"
        onMouseEnter={() => handleHover('Step 2: Refine Your Answer')}
        onClick={() => handleHover('Step 2: Refine Your Answer')}
      >
        Step 2: Refine Your Answer
      </h2>
      
      <div>
        <p 
          className="text-sm font-semibold text-gray-700 mb-2"
          onMouseEnter={() => handleHover('Great! You said:')}
          onClick={() => handleHover('Great! You said:')}
        >
          Great! You said:
        </p>
        <div className="p-4 bg-gray-50 rounded-md border border-gray-300">
          <p 
            className="text-base text-gray-700 italic"
            onMouseEnter={() => handleHover(practiceTranscript)}
            onClick={() => handleHover(practiceTranscript)}
          >
            "{practiceTranscript}"
          </p>
        </div>
      </div>

      {!practiceRefinedAnswer && !isRefining ? (
        <>
          <p 
            className="text-base text-gray-600"
            onMouseEnter={() => handleHover('Now let\'s see how the AI can help organize this.')}
            onClick={() => handleHover('Now let\'s see how the AI can help organize this.')}
          >
            Now let's see how the AI can help organize this.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => {
                setIsRefining(true);
                setTimeout(() => {
                  setIsRefining(false);
                  setPracticeRefinedAnswer(exampleRefinedAnswer);
                }, 2000);
              }}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg rounded-lg
                       shadow-md hover:shadow-lg transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-purple-300
                       flex items-center gap-2"
              onMouseEnter={() => handleHover('Refine My Answer')}
            >
              <Sparkles className="w-6 h-6" />
              Refine My Answer
            </button>
          </div>
        </>
      ) : isRefining ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p 
            className="text-gray-600 font-medium"
            onMouseEnter={() => handleHover('Refining your answer...')}
            onClick={() => handleHover('Refining your answer...')}
          >
            Refining your answer...
          </p>
        </div>
      ) : (
        <>
          <div>
            <p 
              className="text-sm font-semibold text-gray-700 mb-2"
              onMouseEnter={() => handleHover('Here\'s your refined answer:')}
              onClick={() => handleHover('Here\'s your refined answer:')}
            >
              Here's your refined answer:
            </p>
            <div className="p-4 bg-white rounded-md border-2 border-green-300">
              <p 
                className="text-lg text-gray-900 font-medium"
                onMouseEnter={() => handleHover(practiceRefinedAnswer)}
                onClick={() => handleHover(practiceRefinedAnswer)}
              >
                "{practiceRefinedAnswer}"
              </p>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-300 rounded-md">
            <p 
              className="text-sm font-semibold text-green-900 mb-2"
              onMouseEnter={() => handleHover('Notice how it:')}
              onClick={() => handleHover('Notice how it:')}
            >
              Notice how it:
            </p>
            <ul className="space-y-1 text-sm text-green-800">
              <li 
                className="flex items-start gap-2"
                onMouseEnter={() => handleHover('Removed filler words ("um", "like", "and stuff")')}
                onClick={() => handleHover('Removed filler words ("um", "like", "and stuff")')}
              >
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Removed filler words ("um", "like", "and stuff")</span>
              </li>
              <li 
                className="flex items-start gap-2"
                onMouseEnter={() => handleHover('Improved grammar')}
                onClick={() => handleHover('Improved grammar')}
              >
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Improved grammar</span>
              </li>
              <li 
                className="flex items-start gap-2"
                onMouseEnter={() => handleHover('Kept YOUR ideas (nothing added!)')}
                onClick={() => handleHover('Kept YOUR ideas (nothing added!)')}
              >
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Kept YOUR ideas (nothing added!)</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              className="px-6 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg
                       transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300
                       flex items-center gap-2"
              onMouseEnter={() => handleHover('Listen')}
            >
              <Volume2 className="w-5 h-5" />
              Listen
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                       shadow-md hover:shadow-lg transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-blue-300"
              onMouseEnter={() => handleHover('Continue')}
            >
              Continue
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Step 4: Guided Editing
  const renderGuidedEditing = () => (
    <div className="space-y-6">
      <h2 
        className="text-2xl font-bold text-gray-800"
        onMouseEnter={() => handleHover('Step 3: Practice Editing')}
        onClick={() => handleHover('Step 3: Practice Editing')}
      >
        Step 3: Practice Editing
      </h2>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p 
          className="text-sm text-blue-900 mb-2"
          onMouseEnter={() => handleHover('Let\'s try making a change. Say:')}
          onClick={() => handleHover('Let\'s try making a change. Say:')}
        >
          Let's try making a change. Say:
        </p>
        <p 
          className="text-base text-blue-800 font-medium italic"
          onMouseEnter={() => handleHover('"Change \'listens\' to \'really listens\'"')}
          onClick={() => handleHover('"Change \'listens\' to \'really listens\'"')}
        >
          "Change 'listens' to 'really listens'"
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => {
            setPracticeRefinedAnswer("A good friend is someone who really listens and is there when you need them.");
            setTimeout(() => setCurrentStep(5), 1000);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                   shadow-md hover:shadow-lg transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-blue-300
                   flex items-center gap-2"
          onMouseEnter={() => handleHover('Try Voice Command')}
        >
          <Mic className="w-5 h-5" />
          Try Voice Command
        </button>
        <button
          onClick={() => {
            setPracticeRefinedAnswer("A good friend is someone who really listens and is there when you need them.");
            setTimeout(() => setCurrentStep(5), 1000);
          }}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg
                   shadow-md hover:shadow-lg transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-indigo-300
                   flex items-center gap-2"
          onMouseEnter={() => handleHover('Edit Manually')}
        >
          <Edit3 className="w-5 h-5" />
          Edit Manually
        </button>
      </div>

      {practiceRefinedAnswer.includes("really") && (
        <div className="p-4 bg-green-50 border border-green-300 rounded-md animate-fade-in">
          <p 
            className="text-sm text-green-900 mb-2"
            onMouseEnter={() => handleHover('Perfect! The text updated to:')}
            onClick={() => handleHover('Perfect! The text updated to:')}
          >
            <strong>Perfect!</strong> The text updated to:
          </p>
          <p 
            className="text-base text-green-800 font-medium italic"
            onMouseEnter={() => handleHover(practiceRefinedAnswer)}
            onClick={() => handleHover(practiceRefinedAnswer)}
          >
            "{practiceRefinedAnswer}"
          </p>
          <p 
            className="text-sm text-green-700 mt-2"
            onMouseEnter={() => handleHover('You can make as many edits as you want!')}
            onClick={() => handleHover('You can make as many edits as you want!')}
          >
            You can make as many edits as you want!
          </p>
        </div>
      )}
    </div>
  );

  // Step 5: Completion
  const renderCompletion = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
          <Check className="w-16 h-16 text-green-600" />
        </div>
      </div>
      <h1 
        className="text-3xl font-bold text-gray-800"
        onMouseEnter={() => handleHover('You\'re all set!')}
        onClick={() => handleHover('You\'re all set!')}
      >
        🎉 You're all set!
      </h1>
      
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
        <p 
          className="text-sm font-semibold text-blue-900 mb-3"
          onMouseEnter={() => handleHover('You\'ve learned:')}
          onClick={() => handleHover('You\'ve learned:')}
        >
          You've learned:
        </p>
        <ul className="space-y-2 text-left text-sm text-blue-800">
          <li 
            className="flex items-start gap-2"
            onMouseEnter={() => handleHover('How to dictate your thoughts')}
            onClick={() => handleHover('How to dictate your thoughts')}
          >
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
            <span>How to dictate your thoughts</span>
          </li>
          <li 
            className="flex items-start gap-2"
            onMouseEnter={() => handleHover('How the AI refines your words')}
            onClick={() => handleHover('How the AI refines your words')}
          >
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
            <span>How the AI refines your words</span>
          </li>
          <li 
            className="flex items-start gap-2"
            onMouseEnter={() => handleHover('How to edit with voice or keyboard')}
            onClick={() => handleHover('How to edit with voice or keyboard')}
          >
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
            <span>How to edit with voice or keyboard</span>
          </li>
        </ul>
      </div>

      <p 
        className="text-lg text-gray-600"
        onMouseEnter={() => handleHover('Ready to formulate your first real answer?')}
        onClick={() => handleHover('Ready to formulate your first real answer?')}
      >
        Ready to formulate your first real answer?
      </p>

      <button
        onClick={onComplete}
        className="px-10 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg rounded-lg
                 shadow-md hover:shadow-lg transition-all duration-200
                 focus:outline-none focus:ring-4 focus:ring-green-300
                 flex items-center gap-2 mx-auto"
        onMouseEnter={() => handleHover('Start My First Answer')}
      >
        <Rocket className="w-6 h-6" />
        Start My First Answer
      </button>
    </div>
  );

  const steps = [
    renderWelcome,
    renderSampleQuestion,
    renderGuidedDictation,
    renderGuidedRefinement,
    renderGuidedEditing,
    renderCompletion,
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg border-2 border-blue-200 p-8">
      {/* Progress indicator */}
      {currentStep > 0 && currentStep < steps.length - 1 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>Step {currentStep} of 4</span>
            <span>{Math.round((currentStep / 4) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Current step content */}
      <div className="min-h-[400px]">
        {steps[currentStep]()}
      </div>

      {/* Skip button (except on welcome and completion) */}
      {currentStep > 0 && currentStep < steps.length - 1 && (
        <div className="mt-6 text-center">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip tutorial
          </button>
        </div>
      )}
    </div>
  );
};

export default GuidedPractice;
