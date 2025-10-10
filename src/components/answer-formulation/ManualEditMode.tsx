/**
 * ManualEditMode Component
 * 
 * Provides keyboard + voice editing interface with contentEditable div.
 * Allows direct text editing and voice insertion at cursor position.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Mic, Check, Undo, Redo, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useOnDemandTTSPlayer } from '../../hooks/useOnDemandTTSPlayer';

interface ManualEditModeProps {
  initialAnswer: string;
  onUpdate: (newAnswer: string) => void;
  onDone: () => void;
  onDictateAtCursor?: (text: string) => void;
}

const ManualEditMode: React.FC<ManualEditModeProps> = ({
  initialAnswer,
  onUpdate,
  onDone,
  onDictateAtCursor,
}) => {
  const [history, setHistory] = useState<string[]>([initialAnswer]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDictating, setIsDictating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);
  const cursorPositionRef = useRef<number>(0);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // TTS hook for reading the answer aloud
  const { playText, stopAudio, status: ttsStatus } = useOnDemandTTSPlayer();
  
  // TTS click handler
  const handlePlayAnswer = () => {
    const currentText = editableRef.current?.textContent || '';
    if (ttsStatus === 'playing' || ttsStatus === 'loading') {
      stopAudio();
    } else if (currentText.trim()) {
      playText(currentText);
    }
  };

  // Initialize content
  useEffect(() => {
    if (editableRef.current && !editableRef.current.textContent) {
      editableRef.current.textContent = initialAnswer;
    }
  }, [initialAnswer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Save cursor position before state update
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editableRef.current) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editableRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      cursorPositionRef.current = preCaretRange.toString().length;
    }
  };

  // Restore cursor position after state update
  const restoreCursorPosition = () => {
    if (editableRef.current && cursorPositionRef.current !== undefined) {
      const selection = window.getSelection();
      const range = document.createRange();
      
      try {
        let charCount = 0;
        const nodeStack: Node[] = [editableRef.current];
        let node: Node | undefined;
        let foundStart = false;
        
        while (!foundStart && (node = nodeStack.pop())) {
          if (node.nodeType === Node.TEXT_NODE) {
            const textLength = node.textContent?.length || 0;
            if (charCount + textLength >= cursorPositionRef.current) {
              range.setStart(node, cursorPositionRef.current - charCount);
              range.collapse(true);
              foundStart = true;
            } else {
              charCount += textLength;
            }
          } else {
            // Add child nodes to stack in reverse order
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
              nodeStack.push(node.childNodes[i]);
            }
          }
        }
        
        if (foundStart) {
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } catch (error) {
        console.error('Error restoring cursor position:', error);
      }
    }
  };

  // Handle content changes
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.textContent || '';
    
    // Mark as changed
    if (newText !== initialAnswer) {
      setHasChanges(true);
    }
    
    // Debounced update to parent
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    updateTimerRef.current = setTimeout(() => {
      onUpdate(newText);
    }, 500);
    
    // Add to history (less frequently to avoid performance issues)
    if (newText !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newText);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      
      // Update the contentEditable div
      if (editableRef.current) {
        editableRef.current.textContent = history[newIndex];
        onUpdate(history[newIndex]);
      }
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      
      // Update the contentEditable div
      if (editableRef.current) {
        editableRef.current.textContent = history[newIndex];
        onUpdate(history[newIndex]);
      }
    }
  };

  // Dictate at cursor
  const handleDictateAtCursor = () => {
    saveCursorPosition();
    setIsDictating(true);
    
    // Simulate dictation (in real implementation, this would use STT)
    setTimeout(() => {
      const mockDictatedText = " and this is new dictated text";
      
      if (editableRef.current) {
        const currentText = editableRef.current.textContent || '';
        const position = cursorPositionRef.current;
        const newText = currentText.slice(0, position) + mockDictatedText + currentText.slice(position);
        
        editableRef.current.textContent = newText;
        onUpdate(newText);
        
        // Add to history
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newText);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        
        // Update cursor position to after inserted text
        cursorPositionRef.current = position + mockDictatedText.length;
        
        // Restore cursor after inserted text
        requestAnimationFrame(() => {
          restoreCursorPosition();
        });
      }
      
      setIsDictating(false);
      
      if (onDictateAtCursor) {
        onDictateAtCursor(mockDictatedText);
      }
    }, 2000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Edit3 className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-800">
          Edit Manually
        </h2>
        <span className="text-sm text-gray-500">(Keyboard + Voice)</span>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
        <p className="text-sm text-indigo-900">
          <strong>How to edit:</strong> Click to place your cursor, then type directly or use "Dictate at Cursor" to insert voice text.
        </p>
      </div>

      {/* Editable Answer */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Your Answer</h3>
          
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-green-600 font-medium">● Unsaved changes</span>
            )}
            
            {/* TTS Speaker Button */}
            <button
              onClick={handlePlayAnswer}
              disabled={!editableRef.current?.textContent?.trim() || isDictating}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 
                         text-blue-700 rounded-md transition-colors duration-200
                         disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-blue-300"
              aria-label="Listen to answer"
            >
              {ttsStatus === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : ttsStatus === 'playing' ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {ttsStatus === 'playing' ? 'Playing...' : 'Listen'}
            </button>
          </div>
        </div>
        <div
          ref={editableRef}
          contentEditable
          onInput={handleInput}
          onBlur={saveCursorPosition}
          suppressContentEditableWarning
          className="p-4 bg-white rounded-md border-2 border-indigo-300 min-h-[200px] max-h-[400px] overflow-y-auto
                   focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none
                   text-lg text-gray-900 whitespace-pre-wrap cursor-text"
          style={{ fontFamily: 'OpenDyslexic, sans-serif' }}
        />
        <p className="text-xs text-gray-500 mt-1">
          Click anywhere in the text to place your cursor
        </p>
      </div>

      {/* Editing Tools */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={handleDictateAtCursor}
          disabled={isDictating}
          className="flex-1 min-w-[200px] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                   shadow-md hover:shadow-lg
                   transition-all duration-200
                   disabled:bg-gray-400 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-4 focus:ring-blue-300
                   flex items-center justify-center gap-2"
        >
          <Mic className={`w-5 h-5 ${isDictating ? 'animate-pulse' : ''}`} />
          {isDictating ? 'Listening...' : 'Dictate at Cursor'}
        </button>

        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg
                   transition-all duration-200
                   disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-4 focus:ring-gray-300
                   flex items-center gap-2"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-5 h-5" />
          Undo
        </button>

        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg
                   transition-all duration-200
                   disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-4 focus:ring-gray-300
                   flex items-center gap-2"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo className="w-5 h-5" />
          Redo
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <button
          onClick={onDone}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg
                   shadow-md hover:shadow-lg
                   transition-all duration-200
                   focus:outline-none focus:ring-4 focus:ring-green-300
                   flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          Done Editing
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-1">Keyboard Shortcuts:</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Ctrl+Z</kbd> Undo</span>
          <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Ctrl+Shift+Z</kbd> Redo</span>
          <span><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Ctrl+Y</kbd> Redo</span>
        </div>
      </div>
    </div>
  );
};

export default ManualEditMode;
