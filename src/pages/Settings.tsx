import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Headphones, 
  Moon, 
  Sun, 
  Type, 
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useAccessibility, TtsDelayOption } from '../contexts/AccessibilityContext';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { 
    uiTtsEnabled, 
    toggleUiTts, 
    highContrast, 
    toggleHighContrast,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    lineSpacing,
    setLineSpacing,
    wordSpacing,
    setWordSpacing,
    cloudTtsEnabled,
    toggleCloudTts,
    ttsDelay,
    setTtsDelay,
    speakText
  } = useAccessibility();
  
  // Function to handle hover/focus text-to-speech
  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };
  
  // Function to handle TTS delay change
  const handleTtsDelayChange = (delay: TtsDelayOption) => {
    setTtsDelay(delay);
  };
  
  // Function to render delay option button
  const renderDelayOption = (value: TtsDelayOption, label: string) => {
    const isActive = ttsDelay === value;
    return (
      <button
        onClick={() => handleTtsDelayChange(value)}
        className={`px-4 py-2 rounded-md transition-colors ${
          isActive
            ? highContrast
              ? 'bg-white text-black font-semibold'
              : 'bg-blue-600 text-white font-semibold'
            : highContrast
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
        }`}
        aria-pressed={isActive}
        onMouseEnter={() => handleHover(label)}
      >
        {label}
      </button>
    );
  };
  
  const getDelayLabel = (delay: TtsDelayOption): string => {
    switch (delay) {
      case TtsDelayOption.Off:
        return 'Off';
      case TtsDelayOption.Short:
        return '0.5 seconds';
      case TtsDelayOption.Medium:
        return '1 second';
      case TtsDelayOption.Long:
        return '1.5 seconds';
      default:
        return `${delay}ms`;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className={`mr-3 p-2 rounded-full ${
            highContrast ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          }`}
          aria-label="Go back"
          onMouseEnter={() => handleHover('Go back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 
          className="text-2xl font-bold flex items-center"
          onMouseEnter={() => handleHover('Settings')}
        >
          <SettingsIcon className="w-6 h-6 mr-2" />
          Settings
        </h1>
      </div>
      
      <div className="space-y-8">
        <section 
          className={`p-6 rounded-lg ${highContrast ? 'bg-gray-900' : 'bg-gray-800'}`}
          onMouseEnter={() => handleHover('Accessibility Settings')}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Headphones className="w-5 h-5 mr-2" />
            Accessibility Settings
          </h2>
          
          <div className="space-y-6">
            {/* UI Text-to-Speech */}
            <div className="flex flex-col space-y-2">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('UI Text-to-Speech')}
              >
                UI Text-to-Speech
              </h3>
              <p 
                className="text-sm text-gray-400 mb-2"
                onMouseEnter={() => handleHover('Enable or disable text-to-speech for UI elements when you hover over them')}
              >
                Enable or disable text-to-speech for UI elements when you hover over them
              </p>
              
              <button
                onClick={toggleUiTts}
                className={`flex items-center px-4 py-2 rounded-md w-fit ${
                  uiTtsEnabled
                    ? highContrast
                      ? 'bg-white text-black'
                      : 'bg-blue-600 text-white'
                    : highContrast
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-700 text-gray-200'
                }`}
                aria-pressed={uiTtsEnabled}
                onMouseEnter={() => handleHover(uiTtsEnabled ? 'Disable UI Text-to-Speech' : 'Enable UI Text-to-Speech')}
              >
                <Headphones className="w-5 h-5 mr-2" />
                {uiTtsEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {/* TTS Hover Delay */}
            <div className="flex flex-col space-y-2">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('Text-to-Speech Delay')}
              >
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Text-to-Speech Delay
                </div>
              </h3>
              <p 
                className="text-sm text-gray-400 mb-2"
                onMouseEnter={() => handleHover('Set how long to wait before speaking text when you hover over an element')}
              >
                Set how long to wait before speaking text when you hover over an element. 
                This helps prevent overlapping speech when moving quickly across the page.
              </p>
              
              <div className="flex flex-wrap gap-2">
                {renderDelayOption(TtsDelayOption.Off, 'Off')}
                {renderDelayOption(TtsDelayOption.Short, '0.5 seconds')}
                {renderDelayOption(TtsDelayOption.Medium, '1 second')}
                {renderDelayOption(TtsDelayOption.Long, '1.5 seconds')}
              </div>
              
              <p className="text-sm text-gray-400 mt-2">
                Current delay: <span className="font-medium">{getDelayLabel(ttsDelay)}</span>
              </p>
            </div>
            
            {/* High Contrast Mode */}
            <div className="flex flex-col space-y-2">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('High Contrast Mode')}
              >
                High Contrast Mode
              </h3>
              <p 
                className="text-sm text-gray-400 mb-2"
                onMouseEnter={() => handleHover('Enable or disable high contrast display for better visibility')}
              >
                Enable or disable high contrast display for better visibility
              </p>
              
              <button
                onClick={toggleHighContrast}
                className={`flex items-center px-4 py-2 rounded-md w-fit ${
                  highContrast
                    ? 'bg-white text-black'
                    : 'bg-gray-700 text-gray-200'
                }`}
                aria-pressed={highContrast}
                onMouseEnter={() => handleHover(highContrast ? 'Disable High Contrast Mode' : 'Enable High Contrast Mode')}
              >
                {highContrast ? <Sun className="w-5 h-5 mr-2" /> : <Moon className="w-5 h-5 mr-2" />}
                {highContrast ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            
            {/* Cloud TTS */}
            <div className="flex flex-col space-y-2">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('Premium Text-to-Speech')}
              >
                Premium Text-to-Speech
              </h3>
              <p 
                className="text-sm text-gray-400 mb-2"
                onMouseEnter={() => handleHover('Use high-quality cloud text-to-speech for document reading')}
              >
                Use high-quality cloud text-to-speech for document reading (not for UI elements)
              </p>
              
              <button
                onClick={toggleCloudTts}
                className={`flex items-center px-4 py-2 rounded-md w-fit ${
                  cloudTtsEnabled
                    ? highContrast
                      ? 'bg-white text-black'
                      : 'bg-blue-600 text-white'
                    : highContrast
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-700 text-gray-200'
                }`}
                aria-pressed={cloudTtsEnabled}
                onMouseEnter={() => handleHover(cloudTtsEnabled ? 'Disable Premium Text-to-Speech' : 'Enable Premium Text-to-Speech')}
              >
                <Headphones className="w-5 h-5 mr-2" />
                {cloudTtsEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </section>
        
        {/* Text Display Settings */}
        <section 
          className={`p-6 rounded-lg ${highContrast ? 'bg-gray-900' : 'bg-gray-800'}`}
          onMouseEnter={() => handleHover('Text Display Settings')}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Type className="w-5 h-5 mr-2" />
            Text Display Settings
          </h2>
          
          <div className="space-y-6">
            {/* Font Size */}
            <div className="flex flex-col space-y-2">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('Font Size')}
              >
                Font Size
              </h3>
              <input
                type="range"
                min="12"
                max="24"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className={`w-full max-w-md ${highContrast ? 'accent-white' : 'accent-blue-500'}`}
                onMouseEnter={() => handleHover(`Font size: ${fontSize} pixels`)}
              />
              <p className="text-sm font-medium">{fontSize}px</p>
            </div>
            
            {/* Line Spacing */}
            <div className="flex flex-col space-y-2">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('Line Spacing')}
              >
                Line Spacing
              </h3>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={lineSpacing}
                onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                className={`w-full max-w-md ${highContrast ? 'accent-white' : 'accent-blue-500'}`}
                onMouseEnter={() => handleHover(`Line spacing: ${lineSpacing}`)}
              />
              <p className="text-sm font-medium">{lineSpacing.toFixed(1)}x</p>
            </div>
            
            {/* Word Spacing */}
            <div className="flex flex-col space-y-2">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('Word Spacing')}
              >
                Word Spacing
              </h3>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wordSpacing}
                onChange={(e) => setWordSpacing(parseFloat(e.target.value))}
                className={`w-full max-w-md ${highContrast ? 'accent-white' : 'accent-blue-500'}`}
                onMouseEnter={() => handleHover(`Word spacing: ${wordSpacing} ems`)}
              />
              <p className="text-sm font-medium">{wordSpacing.toFixed(2)} em</p>
            </div>
            
            {/* Font Family */}
            <div className="flex flex-col space-y-2">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('Font Family')}
              >
                Font Family
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Inter', 'OpenDyslexic', 'Arial', 'Verdana'].map((font) => (
                  <button
                    key={font}
                    onClick={() => setFontFamily(font)}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      fontFamily === font
                        ? highContrast
                          ? 'bg-white text-black font-semibold'
                          : 'bg-blue-600 text-white font-semibold'
                        : highContrast
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: font }}
                    aria-pressed={fontFamily === font}
                    onMouseEnter={() => handleHover(font)}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
