import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Moon, Headphones, Menu, X } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { SpeakableText } from '../components/SpeakableText';
import Footer from '../components/shared/Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { speakText, uiTtsEnabled, toggleUiTts, toggleHighContrast, highContrast } = useAccessibility();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    <div className={`${highContrast ? "min-h-screen bg-black text-white" : "min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white"} flex flex-col`}>
      {/* Navigation */}
      <nav className="w-full py-4 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center">
          <Book className={highContrast ? "text-white mr-2" : "text-blue-400 mr-2"} size={24} aria-hidden="true" />
          <span className={highContrast ? "text-white font-medium text-xl" : "text-blue-400 font-medium text-xl"}>LexiAid</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <button 
            className={`p-2 rounded-full ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'text-gray-300 hover:bg-gray-800'} transition-colors duration-200`}
            aria-label={highContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
            aria-pressed={highContrast}
            onClick={toggleHighContrast}
          >
            <Moon size={20} />
            <span className="sr-only">
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
          >
            <SpeakableText 
              text="Sign In" 
              className="inline-block"
            />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className={`md:hidden ${highContrast ? 'bg-black border-b border-white' : 'bg-gray-900 border-b border-gray-800'} px-6 py-4`}>
          <div className="flex flex-col space-y-4">
            <button 
              className={`flex items-center space-x-2 ${highContrast ? 'text-white' : 'text-gray-300'}`}
              onClick={toggleHighContrast}
            >
              <Moon size={20} />
              <span>{highContrast ? 'Disable High Contrast' : 'Enable High Contrast'}</span>
            </button>
            
            <button 
              className={`flex items-center space-x-2 ${highContrast ? 'text-white' : 'text-gray-300'}`}
              onClick={toggleUiTts}
            >
              <Headphones size={20} />
              <span>{uiTtsEnabled ? 'Disable Audio Support' : 'Enable Audio Support'}</span>
            </button>

            <Link 
              to="/auth/signin" 
              className={`text-center ${highContrast ? 'bg-white text-black' : 'bg-blue-600 text-white'} py-2 px-4 rounded-md transition-colors duration-200`}
              onClick={() => setIsMenuOpen(false)}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-grow flex flex-col w-full">
        {children}
      </div>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
};

export default PublicLayout;
