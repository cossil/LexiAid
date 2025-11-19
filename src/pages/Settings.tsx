import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Headphones, 
  Moon, 
  Sun, 
  Type, 
  Clock,
  ArrowLeft,
  User,
  Trash2,
  Save,
  BadgeCheck,
  Mail
} from 'lucide-react';
import { useAccessibility, TtsDelayOption } from '../contexts/AccessibilityContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, deleteAccount } = useAuth();
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
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [currentUser]);

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
  
  const handleUpdateProfile = async () => {
    if (!displayName.trim()) {
        toast.error('Display name cannot be empty');
        return;
    }
    setIsUpdating(true);
    try {
        await apiService.updateUserProfile({ displayName });
        if (currentUser) await currentUser.reload();
        toast.success('Profile updated successfully. Refreshing...');
        // Reload to update sidebar and global auth state
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Failed to update profile:', error);
        toast.error('Failed to update profile');
    } finally {
        setIsUpdating(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!currentUser || currentUser.emailVerified) return;
    
    setIsVerifying(true);
    try {
        await apiService.verifyEmail();
        setVerificationSent(true);
        toast.success('Verification email sent');
    } catch (error) {
        console.error('Failed to send verification email:', error);
        toast.error('Failed to send verification email');
    } finally {
        setIsVerifying(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone. All your documents, quizzes, and progress will be permanently deleted.")) {
        try {
            await deleteAccount();
            toast.success('Account deleted successfully');
            // AuthContext handles the redirect on logout/user null
        } catch (error) {
            console.error('Failed to delete account:', error);
            toast.error('Failed to delete account. Please try logging in again before deleting.');
        }
    }
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

        {/* Account Management */}
        <section 
          className={`p-6 rounded-lg ${highContrast ? 'bg-gray-900' : 'bg-gray-800'}`}
          onMouseEnter={() => handleHover('Account Management')}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Account Management
          </h2>
          
          <div className="space-y-8">
            {/* Profile Update */}
            <div className="flex flex-col space-y-4">
              <h3 
                className="text-md font-medium"
                onMouseEnter={() => handleHover('Profile Information')}
              >
                Profile Information
              </h3>
              
              <div className="flex flex-col space-y-2 max-w-md">
                <label className="text-sm text-gray-400" htmlFor="displayName">Display Name</label>
                <div className="flex gap-2">
                    <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={`flex-1 px-4 py-2 rounded-md ${highContrast ? 'bg-black border border-white text-white' : 'bg-gray-700 text-white border border-gray-600'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        placeholder="Enter your display name"
                        onMouseEnter={() => handleHover('Enter your display name')}
                    />
                    <button
                        onClick={handleUpdateProfile}
                        disabled={isUpdating}
                        className={`px-4 py-2 rounded-md flex items-center ${
                            highContrast
                                ? 'bg-white text-black hover:bg-gray-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                        onMouseEnter={() => handleHover('Save changes')}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isUpdating ? 'Saving...' : 'Save'}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    Email: {currentUser?.email} (Cannot be changed)
                </p>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6 pb-6">
              <h3 
                className="text-md font-medium mb-4"
                onMouseEnter={() => handleHover('Email Status')}
              >
                Email Status
              </h3>
              
              <div className="flex flex-col space-y-2">
                 {currentUser?.emailVerified ? (
                    <div className="flex items-center text-green-500 bg-green-500/10 px-3 py-2 rounded-md w-fit">
                        <BadgeCheck className="w-5 h-5 mr-2" />
                        <span className="font-medium">Verified</span>
                    </div>
                 ) : (
                    <div className="flex flex-col space-y-3 w-full max-w-md">
                        <div className={`flex items-center justify-between p-3 rounded-md border ${highContrast ? 'border-white bg-gray-900' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                            <div className={`flex items-center ${highContrast ? 'text-white' : 'text-yellow-500'}`}>
                                <Mail className="w-5 h-5 mr-2" />
                                <span>Not Verified</span>
                            </div>
                             {!verificationSent ? (
                                <button
                                    onClick={handleVerifyEmail}
                                    disabled={isVerifying}
                                    className={`px-3 py-1.5 text-sm rounded-md font-medium ${highContrast ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'} disabled:opacity-50 transition-colors`}
                                    onMouseEnter={() => handleHover('Send verification email')}
                                >
                                    {isVerifying ? 'Sending...' : 'Verify Email'}
                                </button>
                             ) : (
                                <span className="text-sm text-green-400 font-medium flex items-center">
                                    <BadgeCheck className="w-4 h-4 mr-1" />
                                    Sent!
                                </span>
                             )}
                        </div>
                        {verificationSent && (
                            <p className={`text-sm italic p-3 rounded-md border ${highContrast ? 'text-white border-white' : 'text-orange-400 bg-orange-500/10 border-orange-500/20'}`}>
                                Verification link sent to {currentUser?.email}. Please check your Inbox and Spam Folder as the sender may be unknown.
                            </p>
                        )}
                    </div>
                 )}
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
                <h3 
                    className="text-md font-medium text-red-500 flex items-center mb-2"
                    onMouseEnter={() => handleHover('Danger Zone')}
                >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Danger Zone
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    Deleting your account is permanent and cannot be undone. All your documents and progress will be lost.
                </p>
                
                <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                    onMouseEnter={() => handleHover('Delete Account')}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
