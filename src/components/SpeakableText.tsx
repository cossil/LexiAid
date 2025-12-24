import React, { useRef } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';

/**
 * SpeakableText component provides precise text-to-speech functionality
 * by wrapping text in spans that trigger TTS only when directly hovered.
 * 
 * It intelligently chooses between basic and premium TTS based on:
 * 1. Current user settings (basic vs premium)
 * 2. The type of content (UI element vs document content)
 */
interface SpeakableTextProps {
  /** Text content to be spoken */
  text: string;
  
  /** Optional class name for styling */
  className?: string;
  
  /** Whether this text represents document content that would benefit from premium TTS */
  isDocumentContent?: boolean;
  
  /** Optional handler when mouse enters */
  onMouseEnter?: () => void;
  
  /** Optional handler when mouse leaves */
  onMouseLeave?: () => void;
  
  /** Optional accessibility label */
  ariaLabel?: string;
}

export const SpeakableText: React.FC<SpeakableTextProps> = ({
  text,
  className = '',
  isDocumentContent = false,
  onMouseEnter,
  onMouseLeave,
  ariaLabel,
}) => {
  // Track if we're currently hovering over this text
  const isHoveringRef = useRef(false);
  
  // Get accessibility context values
  const { 
    speakText, 
    uiTtsEnabled, 
    cloudTtsEnabled 
  } = useAccessibility();
  
  /**
   * Determines which TTS method to use based on settings and content type.
   * Logic:
   * - For UI elements: Always use basic TTS for performance/responsiveness
   * - For document content: Use cloud TTS if enabled, otherwise basic TTS
   */
  const handleTextHover = () => {
    // Only proceed if TTS is enabled
    if (!uiTtsEnabled) return;
    
    // Mark that we're hovering over this element
    isHoveringRef.current = true;
    
    // Call custom onMouseEnter if provided
    if (onMouseEnter) onMouseEnter();
    
    // Choose appropriate TTS method based on content type and settings
    // For document content, use cloud TTS if enabled; otherwise use basic TTS
    // For UI elements, always use basic TTS for better responsiveness
    if (isDocumentContent && cloudTtsEnabled) {
      // Premium content with premium TTS enabled
      speakText(text);
    } else {
      // UI element or premium not enabled - use basic TTS
      speakText(text);
    }
  };
  
  /**
   * Handle when mouse leaves the text - used for future refinements
   * like stopping speech if we decide to implement that behavior
   */
  const handleTextLeave = () => {
    // Mark that we're no longer hovering this element
    isHoveringRef.current = false;
    
    // Call custom onMouseLeave if provided
    if (onMouseLeave) onMouseLeave();
    
    // Note: We don't cancel speech here by default as that would
    // interrupt TTS before completion, which is usually not desired.
    // If specific components need this behavior, they can pass an
    // onMouseLeave handler that calls cancelSpeech().
  };

  /**
   * Handle click/tap for touch device support (iPad/iPhone).
   * Allows event bubbling so parent links still work (Speak & Go behavior).
   */
  const handleClick = () => {
    // Only speak if TTS is enabled
    if (!uiTtsEnabled) return;
    
    // Choose appropriate TTS method based on content type and settings
    if (isDocumentContent && cloudTtsEnabled) {
      speakText(text);
    } else {
      speakText(text);
    }
  };
  
  return (
    <span 
      className={`relative z-10 ${className}`}
      onMouseEnter={handleTextHover}
      onMouseLeave={handleTextLeave}
      onClick={handleClick}
      aria-label={ariaLabel || text}
    >
      {text}
    </span>
  );
};
