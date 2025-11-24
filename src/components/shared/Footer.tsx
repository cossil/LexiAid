import React from 'react';
import { Link } from 'react-router-dom';
import { Book } from 'lucide-react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

const Footer: React.FC = () => {
  const { speakText, highContrast, uiTtsEnabled } = useAccessibility();

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  return (
    <footer className={`w-full py-12 px-6 ${highContrast ? 'bg-gray-900 border-t border-white' : 'bg-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <Book className={highContrast ? "text-white mr-2" : "text-blue-400 mr-2"} size={24} aria-hidden="true" />
            <span className={highContrast ? "text-white font-medium text-xl" : "text-blue-400 font-medium text-xl"}>LexiAid</span>
          </div>
          
          <div className="flex space-x-6">
            <Link 
              to="/" 
              className={`${highContrast ? 'text-white hover:text-gray-300' : 'text-gray-300 hover:text-white'} transition-colors duration-200`}
              onMouseEnter={() => handleHover('Home')}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className={`${highContrast ? 'text-white hover:text-gray-300' : 'text-gray-300 hover:text-white'} transition-colors duration-200`}
              onMouseEnter={() => handleHover('About')}
            >
              About
            </Link>
            <Link 
              to="/privacy" 
              className={`${highContrast ? 'text-white hover:text-gray-300' : 'text-gray-300 hover:text-white'} transition-colors duration-200`}
              onMouseEnter={() => handleHover('Privacy')}
            >
              Privacy
            </Link>
            <Link 
              to="/terms" 
              className={`${highContrast ? 'text-white hover:text-gray-300' : 'text-gray-300 hover:text-white'} transition-colors duration-200`}
              onMouseEnter={() => handleHover('Terms')}
            >
              Terms
            </Link>
            <a 
              href="mailto:cossil@lexiaid.com" 
              target="_blank"
              rel="noopener noreferrer"
              className={`${highContrast ? 'text-white hover:text-gray-300' : 'text-gray-300 hover:text-white'} transition-colors duration-200`}
              onMouseEnter={() => handleHover('Contact')}
            >
              Contact
            </a>
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-8">
          <p className={`${highContrast ? 'text-gray-300' : 'text-gray-400'} text-center text-sm`}>
            LexiAid - Helping students with dyslexia learn more effectively
          </p>
          <p className={`${highContrast ? 'text-gray-400' : 'text-gray-500'} text-center text-sm mt-1`}>
            © 2025. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
