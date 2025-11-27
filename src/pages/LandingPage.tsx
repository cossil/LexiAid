import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, Moon, Headphones, ArrowRight, CheckCircle, FileText, MessageSquare } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { SpeakableText } from '../components/SpeakableText';
import Footer from '../components/shared/Footer';

const LandingPage: React.FC = () => {
  const { speakText, uiTtsEnabled, toggleUiTts, toggleHighContrast, highContrast } = useAccessibility();

  // Handle TTS for interactive elements
  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  // Apply high contrast theme if enabled
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
  }, [highContrast]);

  return (
    <div className={highContrast ? "min-h-screen bg-black text-white" : "min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white"}>
      {/* Navigation */}
      <nav className="w-full py-4 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <Book className={highContrast ? "text-white mr-2" : "text-blue-400 mr-2"} size={24} aria-hidden="true" />
          <span className={highContrast ? "text-white font-medium text-xl" : "text-blue-400 font-medium text-xl"}>
            <SpeakableText text="LexiAid" />
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            className={`p-2 rounded-full ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'text-gray-300 hover:bg-gray-800'} transition-colors duration-200`}
            aria-label={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
            aria-pressed={highContrast}
            onClick={toggleHighContrast}
            // No longer need onMouseEnter here as the text content is handled by SpeakableText
          >
            <Moon size={20} />
            {/* Visually hidden text for accessibility and precise TTS targeting */}
            <span className="sr-only">
              {/* Import and use SpeakableText component for precise TTS targeting */}
              {/* This would require importing SpeakableText at the top of the file */}
              {/* <SpeakableText text={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'} /> */}
              {/* For now, using inline implementation until component is fully integrated */}
              <span
                onMouseEnter={() => handleHover(highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode')}
              >
                {highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
              </span>
            </span>
          </button>
          
          <button 
            className={`p-2 rounded-full ${uiTtsEnabled ? highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700' : highContrast ? 'bg-gray-800 text-white hover:bg-gray-700' : 'text-gray-300 hover:bg-gray-800'} transition-colors duration-200`}
            aria-label={uiTtsEnabled ? 'Disable audio support' : 'Enable audio support'}
            aria-pressed={uiTtsEnabled}
            onClick={toggleUiTts}
            onMouseEnter={() => handleHover(uiTtsEnabled ? 'Disable audio support' : 'Enable audio support')}
          >
            <Headphones size={20} />
          </button>
          
          <Link 
            to="/auth/signin" 
            className={`${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 hover:bg-blue-700 text-white'} py-2 px-4 rounded-md transition-colors duration-200`}
            // Remove the onMouseEnter handler from the parent element
            // This prevents TTS from triggering when hovering empty space in the button
          >
            {/* Use SpeakableText component for precise TTS targeting */}
            {/* This ensures TTS only triggers when hovering directly over the text */}
            <SpeakableText 
              text="Sign In" 
              className="inline-block" // Keep text inline within the button
            />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="text-center py-20 px-6 max-w-3xl mx-auto">
        <h1 
          className={`${highContrast ? 'text-white' : 'text-white'} text-4xl sm:text-5xl font-bold mb-4 leading-tight`}
          onMouseEnter={() => handleHover('LexiAid for Students with Dyslexia')}
        >
          LexiAid for Students with Dyslexia
        </h1>
        <p 
          className={`${highContrast ? 'text-gray-100' : 'text-gray-300'} text-lg sm:text-xl leading-relaxed mb-8`}
          onMouseEnter={() => handleHover('An accessible learning platform designed to help students with dyslexia learn more effectively through personalized AI assistance.')}
        >
          An accessible learning platform designed to help students with dyslexia learn more 
          effectively through personalized AI assistance.
        </p>
        <Link 
          to="/auth/signup" 
          className={`inline-flex items-center ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 hover:bg-blue-700 text-white'} py-3 px-8 rounded-md text-lg font-medium transition-all duration-200 transform hover:scale-105`}
          onMouseEnter={() => handleHover('Get Started Now - It\'s Free')}
        >
          Get Started Now - It's Free
          <ArrowRight className="ml-2" size={20} />
        </Link>
      </div>

      {/* Features Section */}
      <div className="w-full max-w-7xl mx-auto px-6 py-16">
        {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
        <h2 className={`${highContrast ? 'text-white' : 'text-white'} text-3xl font-bold text-center mb-12`}>
          <SpeakableText text="Features Designed for Accessibility" />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Accessible Learning */}
          <div className={`${highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-800/50'} rounded-lg p-8 flex flex-col items-center text-center transition-transform duration-300 hover:transform hover:scale-105`}>
            <div className={highContrast ? "text-white mb-6" : "text-blue-400 mb-6"}>
              <Book size={48} aria-hidden="true" />
            </div>
            {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
            <h3 className={`${highContrast ? 'text-white' : 'text-white'} text-xl font-semibold mb-4`}>
              <SpeakableText text="Accessible Learning" />
            </h3>
            <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed`}>
              <SpeakableText text="Customizable text display with dyslexia-friendly options. Integrated text-to-speech for better comprehension." />
            </p>
          </div>
          
          {/* Document Support */}
          <div className={`${highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-800/50'} rounded-lg p-8 flex flex-col items-center text-center transition-transform duration-300 hover:transform hover:scale-105`}>
            <div className={highContrast ? "text-white mb-6" : "text-green-400 mb-6"}>
              <FileText size={48} aria-hidden="true" />
            </div>
            {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
            <h3 className={`${highContrast ? 'text-white' : 'text-white'} text-xl font-semibold mb-4`}>
              <SpeakableText text="Document Support" />
            </h3>
            <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed`}>
              <SpeakableText text="Upload any document for instant help. AI breaks down complex content into manageable parts." />
            </p>
          </div>
          
          {/* AI Conversation */}
          <div className={`${highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-800/50'} rounded-lg p-8 flex flex-col items-center text-center transition-transform duration-300 hover:transform hover:scale-105`}>
            <div className={highContrast ? "text-white mb-6" : "text-purple-400 mb-6"}>
              <MessageSquare size={48} aria-hidden="true" />
            </div>
            {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
            <h3 className={`${highContrast ? 'text-white' : 'text-white'} text-xl font-semibold mb-4`}>
              <SpeakableText text="AI Conversation" />
            </h3>
            <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed`}>
              <SpeakableText text="Talk naturally with your AI Tutor. Get explanations, summaries, and personalized help." />
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className={`${highContrast ? 'bg-gray-900' : 'bg-gray-900/50'} py-16`}>
        <div className="max-w-7xl mx-auto px-6">
          {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
          <h2 className={`${highContrast ? 'text-white' : 'text-white'} text-3xl font-bold text-center mb-12`}>
            <SpeakableText text="How LexiAid Works" />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className={`${highContrast ? 'bg-black border border-white' : 'bg-gray-800/70'} rounded-lg p-6 relative`}>
              <div className={`absolute -top-4 -left-4 w-10 h-10 rounded-full flex items-center justify-center ${highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white'} font-bold text-lg`}>1</div>
              {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
              <h3 className={`${highContrast ? 'text-white' : 'text-white'} text-lg font-semibold mb-3 mt-2`}>
                <SpeakableText text="Upload Your Documents" />
              </h3>
              <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'}`}>
                <SpeakableText text="Simply upload any document you're studying - PDF, Word, or even images with text." />
              </p>
            </div>
            
            {/* Step 2 */}
            <div className={`${highContrast ? 'bg-black border border-white' : 'bg-gray-800/70'} rounded-lg p-6 relative`}>
              <div className={`absolute -top-4 -left-4 w-10 h-10 rounded-full flex items-center justify-center ${highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white'} font-bold text-lg`}>2</div>
              {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
              <h3 className={`${highContrast ? 'text-white' : 'text-white'} text-lg font-semibold mb-3 mt-2`}>
                <SpeakableText text="AI Processes Content" />
              </h3>
              <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'}`}>
                <SpeakableText text="Our AI extracts and analyzes text, making it accessible for your learning style." />
              </p>
            </div>
            
            {/* Step 3 */}
            <div className={`${highContrast ? 'bg-black border border-white' : 'bg-gray-800/70'} rounded-lg p-6 relative`}>
              <div className={`absolute -top-4 -left-4 w-10 h-10 rounded-full flex items-center justify-center ${highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white'} font-bold text-lg`}>3</div>
              {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
              <h3 className={`${highContrast ? 'text-white' : 'text-white'} text-lg font-semibold mb-3 mt-2`}>
                <SpeakableText text="Interact and Learn" />
              </h3>
              <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'}`}>
                <SpeakableText text="Ask questions, get summaries, or take quizzes on the material." />
              </p>
            </div>
            
            {/* Step 4 */}
            <div className={`${highContrast ? 'bg-black border border-white' : 'bg-gray-800/70'} rounded-lg p-6 relative`}>
              <div className={`absolute -top-4 -left-4 w-10 h-10 rounded-full flex items-center justify-center ${highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white'} font-bold text-lg`}>4</div>
              {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
              <h3 className={`${highContrast ? 'text-white' : 'text-white'} text-lg font-semibold mb-3 mt-2`}>
                <SpeakableText text="Track Your Progress" />
              </h3>
              <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'}`}>
                <SpeakableText text="Monitor learning achievements with detailed progress tracking." />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className={`${highContrast ? 'bg-black' : 'bg-blue-600/20'} py-16 px-6`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`${highContrast ? 'text-white' : 'text-white'} text-3xl font-bold mb-6`}>
            <SpeakableText text="Ready to transform your learning experience?" />
          </h2>
          <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'} text-lg mb-8 max-w-2xl mx-auto`}>
            <SpeakableText text="Join thousands of students who are already benefiting from LexiAid's personalized learning assistance." />
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link 
              to="/auth/signup" 
              className={`inline-flex items-center justify-center ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 hover:bg-blue-700 text-white'} py-3 px-6 rounded-md text-lg font-medium transition-colors duration-200`}
              onMouseEnter={() => handleHover('Create Free Account')}
            >
              Create Free Account
              <ArrowRight className="ml-2" size={20} />
            </Link>
            
            <Link 
              to="/auth/signin" 
              className={`inline-flex items-center justify-center ${highContrast ? 'bg-gray-900 text-white border border-white hover:bg-gray-800' : 'bg-gray-800 text-white hover:bg-gray-700'} py-3 px-6 rounded-md text-lg font-medium transition-colors duration-200`}
              onMouseEnter={() => handleHover('Sign In')}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="w-full max-w-7xl mx-auto px-6 py-16">
        <h2 className={`${highContrast ? 'text-white' : 'text-white'} text-3xl font-bold text-center mb-12`}>
          <SpeakableText text="Why Choose LexiAid?" />
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Benefit items */}
          <div 
            className={`flex items-start ${highContrast ? 'text-white' : 'text-white'}`}
          >
            <div className={`flex-shrink-0 ${highContrast ? 'text-white' : 'text-green-400'} mr-4`}>
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">
                <SpeakableText text="Designed specifically for students with dyslexia" />
              </h3>
              <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'}`}>
                <SpeakableText text="Every feature is built with dyslexic students in mind, from font choices to color schemes." />
              </p>
            </div>
          </div>
          
          <div 
            className={`flex items-start ${highContrast ? 'text-white' : 'text-white'}`}
          >
            <div className={`flex-shrink-0 ${highContrast ? 'text-white' : 'text-green-400'} mr-4`}>
              <CheckCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">
                <SpeakableText text="Personalized learning pace" />
              </h3>
              <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'}`}>
                <SpeakableText text="Move at your own speed without pressure, with an AI tutor that adapts to your needs." />
              </p>
            </div>
          </div>
          
          <div className={`flex items-start ${highContrast ? 'text-white' : 'text-white'}`}>
            <div className={`flex-shrink-0 ${highContrast ? 'text-white' : 'text-green-400'} mr-4`}>
              <CheckCircle size={24} />
            </div>
            <div>
              {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
              <h3 className="text-lg font-medium mb-2">
                <SpeakableText text="Multi-sensory learning approach" />
              </h3>
              <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'}`}>
                <SpeakableText text="Combines visual, auditory, and interactive elements to strengthen learning and comprehension." />
              </p>
            </div>
          </div>
          
          <div className={`flex items-start ${highContrast ? 'text-white' : 'text-white'}`}>
            <div className={`flex-shrink-0 ${highContrast ? 'text-white' : 'text-green-400'} mr-4`}>
              <CheckCircle size={24} />
            </div>
            <div>
              {/* FIXED: Replaced direct onMouseEnter with SpeakableText component for precise hover detection */}
              <h3 className="text-lg font-medium mb-2">
                <SpeakableText text="Builds confidence and independence" />
              </h3>
              <p className={`${highContrast ? 'text-gray-100' : 'text-gray-300'}`}>
                <SpeakableText text="Helps students develop self-reliance and confidence in their academic abilities." />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
