/**
 * GuidedPractice Component
 * 
 * Interactive onboarding tutorial that guides users through the complete
 * answer formulation workflow in a safe, sandboxed practice environment.
 */

import React, { useState } from 'react';
import { GraduationCap, Play, SkipForward, Mic, Sparkles, Volume2, Edit3, Check, Rocket } from 'lucide-react';

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

  const sampleQuestion = "What makes a good friend?";
  const exampleMessyTranscript = "Um, a good friend is someone who like listens and is there when you need them and stuff.";
  const exampleRefinedAnswer = "A good friend is someone who listens and is there when you need them.";

  // Step 0: Welcome
  const renderWelcome = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <GraduationCap className="w-20 h-20 text-blue-600 animate-bounce" />
      </div>
      <h1 className="text-3xl font-bold text-gray-800">
        Welcome to Answer Formulation!
      </h1>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        This tool helps you turn your spoken thoughts into clear, well-written answers.
      </p>
      <p className="text-base text-gray-600">
        Let's practice together with a sample question.
      </p>
      <div className="flex gap-4 justify-center pt-4">
        <button
          onClick={() => setCurrentStep(1)}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-lg
                   shadow-md hover:shadow-lg transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-blue-300
                   flex items-center gap-2"
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
      <h2 className="text-2xl font-bold text-gray-800">Your Practice Question</h2>
      <div className="p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <p className="text-xl text-gray-800 font-medium italic">
          "{sampleQuestion}"
        </p>
      </div>
      <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md">
        <p className="text-sm text-yellow-800 flex items-start gap-2">
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
        >
          Continue
        </button>
      </div>
    </div>
  );

  // Step 2: Guided Dictation
  const renderGuidedDictation = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Step 1: Speak Your Thoughts</h2>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-900 mb-2">
          <strong>💬 Tip:</strong> Don't worry about being perfect! Just speak naturally.
        </p>
        <p className="text-sm text-blue-800 italic">
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
            >
              <Mic className="w-16 h-16 text-white" />
            </button>
            <p className="text-lg font-medium text-gray-700">Start Dictating</p>
          </>
        ) : isRecording ? (
          <>
            <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <Mic className="w-12 h-12 text-white" />
            </div>
            <p className="text-lg font-medium text-gray-700">Listening...</p>
            <p className="text-sm text-gray-500">(Simulating your speech)</p>
          </>
        ) : (
          <div className="w-full">
            <p className="text-base text-gray-700 p-4 bg-white rounded-md border border-gray-300">
              {practiceTranscript}
            </p>
            <button
              onClick={() => setCurrentStep(3)}
              className="mt-4 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                       shadow-md hover:shadow-lg transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-blue-300"
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
      <h2 className="text-2xl font-bold text-gray-800">Step 2: Refine Your Answer</h2>
      
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Great! You said:</p>
        <div className="p-4 bg-gray-50 rounded-md border border-gray-300">
          <p className="text-base text-gray-700 italic">
            "{practiceTranscript}"
          </p>
        </div>
      </div>

      {!practiceRefinedAnswer && !isRefining ? (
        <>
          <p className="text-base text-gray-600">
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
            >
              <Sparkles className="w-6 h-6" />
              Refine My Answer
            </button>
          </div>
        </>
      ) : isRefining ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Refining your answer...</p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Here's your refined answer:</p>
            <div className="p-4 bg-white rounded-md border-2 border-green-300">
              <p className="text-lg text-gray-900 font-medium">
                "{practiceRefinedAnswer}"
              </p>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-300 rounded-md">
            <p className="text-sm font-semibold text-green-900 mb-2">Notice how it:</p>
            <ul className="space-y-1 text-sm text-green-800">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Removed filler words ("um", "like", "and stuff")</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Improved grammar</span>
              </li>
              <li className="flex items-start gap-2">
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
            >
              <Volume2 className="w-5 h-5" />
              Listen
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                       shadow-md hover:shadow-lg transition-all duration-200
                       focus:outline-none focus:ring-4 focus:ring-blue-300"
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
      <h2 className="text-2xl font-bold text-gray-800">Step 3: Practice Editing</h2>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-900 mb-2">
          Let's try making a change. Say:
        </p>
        <p className="text-base text-blue-800 font-medium italic">
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
        >
          <Edit3 className="w-5 h-5" />
          Edit Manually
        </button>
      </div>

      {practiceRefinedAnswer.includes("really") && (
        <div className="p-4 bg-green-50 border border-green-300 rounded-md animate-fade-in">
          <p className="text-sm text-green-900 mb-2">
            <strong>Perfect!</strong> The text updated to:
          </p>
          <p className="text-base text-green-800 font-medium italic">
            "{practiceRefinedAnswer}"
          </p>
          <p className="text-sm text-green-700 mt-2">
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
      <h1 className="text-3xl font-bold text-gray-800">
        🎉 You're all set!
      </h1>
      
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
        <p className="text-sm font-semibold text-blue-900 mb-3">You've learned:</p>
        <ul className="space-y-2 text-left text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
            <span>How to dictate your thoughts</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
            <span>How the AI refines your words</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
            <span>How to edit with voice or keyboard</span>
          </li>
        </ul>
      </div>

      <p className="text-lg text-gray-600">
        Ready to formulate your first real answer?
      </p>

      <button
        onClick={onComplete}
        className="px-10 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg rounded-lg
                 shadow-md hover:shadow-lg transition-all duration-200
                 focus:outline-none focus:ring-4 focus:ring-green-300
                 flex items-center gap-2 mx-auto"
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
