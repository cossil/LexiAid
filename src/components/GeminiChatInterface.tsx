import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Volume2, VolumeX, Loader2, Mic, StopCircle, Play } from 'lucide-react';
import useRealtimeStt, { SttStatus } from '../hooks/useRealtimeStt';
import styles from './GeminiChatInterface.module.css';
import { ChatMessage, Timepoint } from '../types/document'; // Assuming Timepoint type is defined in types
import { useChatTTSPlayer } from '../hooks/useChatTTSPlayer';
import { useOnDemandTTSPlayer } from '../hooks/useOnDemandTTSPlayer';

// ... (Keep the GeminiChatInterfaceProps interface as is)
interface GeminiChatInterfaceProps {
  messages: ChatMessage[];
  isSendingMessage: boolean;
  onSendMessage: (messageText: string, isRetry?: boolean, originalMessageId?: string) => void;
  onStartQuiz: () => void;
  currentDocumentId?: string | null;
  currentThreadId?: string | null;
}


interface MessageBubbleProps {
  message: ChatMessage;
  onRetrySend?: (messageText: string, originalMessageId: string) => void;
  onSendMessage: (messageText: string) => void;
  onPlayAudio: (message: ChatMessage) => void;
  isPlaying: boolean;
  isLoading: boolean;
  activeTimepoint: Timepoint | null;
  onDemandWordTimepoints?: Timepoint[] | null; // New prop for user message timepoints
  onWordClick?: (timeInSeconds: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onRetrySend,
  onSendMessage,
  onPlayAudio,
  isPlaying,
  isLoading,
  activeTimepoint,
  onDemandWordTimepoints,
  onWordClick,
}) => {
  const handleRetry = () => {
    if (onRetrySend && message.text && message.id) {
      onRetrySend(message.text, message.id);
    }
  };

  const handleSpeakerClick = useCallback(() => {
    onPlayAudio(message);
  }, [onPlayAudio, message]);

  const groupTimepointsIntoParagraphs = (timepoints: Timepoint[]) => {
    // This function is now generic and can handle timepoints from any source
    const paragraphs: Timepoint[][] = [];
    if (!timepoints) return paragraphs;
    let currentParagraph: Timepoint[] = [];
    timepoints.forEach((timepoint) => {
      if (timepoint && timepoint.mark_name) {
        const isParagraphBreak = timepoint.mark_name === 'PARAGRAPH_BREAK';
        const containsNewline = timepoint.mark_name.includes('\n\n');
        const word = timepoint.mark_name.trim();

        if (word && !isParagraphBreak) {
          currentParagraph.push({ ...timepoint, mark_name: word });
        }

        if (isParagraphBreak || containsNewline) {
          if (currentParagraph.length > 0) {
            paragraphs.push(currentParagraph);
          }
          currentParagraph = [];
        }
      }
    });
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph);
    }
    return paragraphs;
  };


  return (
    <div className={`
        ${styles.messageBubbleBase}
        ${message.sender === 'user' ? styles.userMessage : styles.agentMessage}
      `}>
      <div
        className={`${styles.speakerIconContainer} ${isLoading || isPlaying ? styles.speakerIconActive : ''}` }
        title={isPlaying ? "Stop audio" : "Play audio"}
        onClick={handleSpeakerClick}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSpeakerClick();}}
      >
        {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isPlaying ? <VolumeX size={20} /> : <Volume2 size={20} />)}
      </div>
      <div className={styles.markdownContent}>
        {(() => {
          const timepointsToUse = message.sender === 'agent' ? message.timepoints : onDemandWordTimepoints;
          const useTimepointRenderer = timepointsToUse && timepointsToUse.length > 0;

          if (useTimepointRenderer) {
            return (
              <div>
                {groupTimepointsIntoParagraphs(timepointsToUse).map((paragraph, pIndex) => (
                  <p key={pIndex} className="mb-4 last:mb-0">
                    {paragraph.map((timepoint, wIndex) => {
                      const isHighlighted = isPlaying && activeTimepoint?.time_seconds === timepoint.time_seconds;
                      return (
                        <span
                          key={`${pIndex}-${wIndex}`}
                          className={`${isHighlighted ? 'bg-yellow-200 dark:bg-yellow-500/70 rounded-md' : 'bg-transparent'} ${onWordClick ? 'cursor-pointer' : ''}`}
                          onClick={() => onWordClick && onWordClick(timepoint.time_seconds)}
                        >
                          {timepoint.mark_name}{' '}
                        </span>
                      );

                    })}
                  </p>
                ))}
              </div>
            );
          }
          return <ReactMarkdown>{message.text || ''}</ReactMarkdown>;
        })()}

        {message.isError && message.sender === 'user' && onRetrySend && (
          <button onClick={handleRetry} className="text-xs text-red-400 hover:text-red-300 mt-1" title="Retry sending message">
            Failed to send. Retry?
          </button>
        )}
        {message.isQuizQuestion && message.options && message.options.length > 0 && (
          <div className={styles.quizOptionsContainer}>
            {message.options.map((option, index) => (
              <button key={index} className={styles.quizOptionButton} onClick={() => onSendMessage(option)}>
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ChatInputBarProps {
  onSendMessage: (messageText: string) => void;
  isSendingMessage: boolean;
  currentDocumentId?: string | null;
  currentThreadId?: string | null;
  playText: (text: string) => void;
  stopAudio: () => void;
  onDemandStatus: 'idle' | 'loading' | 'playing' | 'error' | 'paused';
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  isSendingMessage,
  playText,
  stopAudio,
  onDemandStatus,
}) => {
  const { status, transcript, startDictation, stopDictation, stopAndPlay, updateTranscript } = useRealtimeStt();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Don't trim here - preserve spaces for typing
  const combinedTranscript = `${transcript.final}${transcript.interim}`;
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [combinedTranscript]);

  const handleSend = () => {
    if (combinedTranscript.trim()) {
      // Stop any ongoing TTS playback before sending
      if (onDemandStatus === 'playing' || onDemandStatus === 'loading') {
        stopAudio();
      }
      onSendMessage(combinedTranscript.trim());
      updateTranscript(''); // Clear transcript after sending
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (status === 'review' || status === 'idle') {
      updateTranscript(e.target.value);
    }
  };

  // Helper function: Get Play button title based on state
  const getPlayButtonTitle = useCallback((currentStatus: SttStatus, text: string): string => {
    if (!text.trim() && currentStatus !== 'dictating') return 'No text to play';
    
    switch (currentStatus) {
      case 'idle':
        return 'Play typed text';
      case 'dictating':
        return 'Stop recording and play';
      case 'review':
        return 'Play transcribed text';
      case 'connecting':
        return 'Connecting...';
      default:
        return 'Play audio';
    }
  }, []);

  // Helper function: Get Play button aria-label based on state
  const getPlayButtonAriaLabel = useCallback((currentStatus: SttStatus, text: string): string => {
    if (!text.trim() && currentStatus !== 'dictating') return 'Play button disabled, no text available';
    
    switch (currentStatus) {
      case 'idle':
        return 'Play audio of typed text';
      case 'dictating':
        return 'Stop dictation and play transcribed audio';
      case 'review':
        return 'Play audio of transcribed text';
      case 'connecting':
        return 'Connecting to speech service';
      default:
        return 'Play audio';
    }
  }, []);

  // Handler: Play button click with state-dependent logic
  const handlePlayClick = useCallback(() => {
    if (isTransitioning) {
      console.log('Play button click ignored - transition in progress');
      return;
    }
    
    const text = combinedTranscript.trim();
    
    switch (status) {
      case 'idle':
        // Play typed text
        if (text) {
          console.log('Playing typed text');
          playText(text);
        }
        break;
        
      case 'dictating':
        // Stop & Play: Stop dictation and immediately play the transcript
        console.log('Stop & Play initiated');
        setIsTransitioning(true);
        const transcriptToPlay = stopAndPlay();
        if (transcriptToPlay && transcriptToPlay.trim()) {
          // Delay to ensure state transition completes
          setTimeout(() => {
            console.log('Playing transcript after stop, length:', transcriptToPlay.length);
            playText(transcriptToPlay);
            setIsTransitioning(false);
          }, 150);
        } else {
          console.warn('No transcript available to play after stopping dictation');
          setIsTransitioning(false);
        }
        break;
        
      case 'review':
        // Play transcribed text
        if (text) {
          console.log('Playing transcribed text');
          playText(text);
        }
        break;
        
      case 'connecting':
        // Do nothing while connecting
        console.log('Play button clicked while connecting - ignoring');
        break;
        
      default:
        console.warn('Unexpected status for Play button:', status);
    }
  }, [status, combinedTranscript, playText, stopAndPlay, isTransitioning]);

  // Handler: Microphone button click with state-aware behavior
  const handleMicrophoneClick = useCallback(() => {
    switch (status) {
      case 'idle':
      case 'connecting':
        // Start new dictation
        console.log('Starting new dictation from idle/connecting state');
        startDictation();
        break;
        
      case 'review':
        // Start new dictation (replaces current transcript)
        console.log('Starting new dictation from review state (re-record)');
        startDictation();
        break;
        
      default:
        console.warn('Unexpected status for microphone click:', status);
    }
  }, [status, startDictation]);

  return (
    <div className={styles.chatInputBar}>
      {/* Left side: Play/Stop button - ALWAYS VISIBLE */}
      <div className={styles.leftControls}>
        {/* TTS Playback Button */}
        {onDemandStatus === 'playing' || onDemandStatus === 'loading' ? (
          <button 
            onClick={stopAudio} 
            className={styles.reviewButton} 
            title="Stop playback"
            aria-label="Stop audio playback"
          >
            {onDemandStatus === 'loading' 
              ? <Loader2 size={20} className="animate-spin" /> 
              : <VolumeX size={20} />
            }
          </button>
        ) : (
          <button 
            onClick={handlePlayClick} 
            className={styles.reviewButton} 
            title={getPlayButtonTitle(status, combinedTranscript)}
            aria-label={getPlayButtonAriaLabel(status, combinedTranscript)}
            disabled={isTransitioning || (!combinedTranscript.trim() && status !== 'dictating')}
          >
            <Play size={20} />
          </button>
        )}
      </div>

      {/* Center: Textarea */}
      <textarea
        ref={textareaRef}
        className={styles.inputTextArea}
        value={combinedTranscript}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder={status === 'dictating' ? 'Listening...' : 'Type or dictate your message...'}
        rows={1}
        readOnly={status === 'dictating' || status === 'connecting'}
      />

      {/* Right side: Microphone/Stop and Send buttons */}
      <div className={styles.sttControls}>
        {/* Microphone button - visible in idle, connecting, and review states */}
        {(status === 'idle' || status === 'connecting' || status === 'review') && (
          <button 
            onClick={handleMicrophoneClick} 
            className={styles.actionButton} 
            disabled={isSendingMessage || status === 'connecting'} 
            title={status === 'review' ? 'Start new dictation' : 'Start dictation'}
            aria-label={status === 'review' ? 'Start new voice recording' : 'Start voice dictation'}
          >
            {status === 'connecting' ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
          </button>
        )}
        
        {/* Stop button - visible only when dictating */}
        {status === 'dictating' && (
          <button 
            onClick={stopDictation} 
            className={`${styles.actionButton} ${styles.stopButton}`} 
            title="Stop dictation"
            aria-label="Stop voice recording"
          >
            <StopCircle size={20} />
          </button>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        className={styles.actionButton}
        disabled={isSendingMessage || !combinedTranscript.trim()}
        title="Send message"
      >
        {isSendingMessage ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
      </button>
    </div>
  );
};

const GeminiChatInterface: React.FC<GeminiChatInterfaceProps> = ({
  messages,
  isSendingMessage,
  onSendMessage,
  currentDocumentId,
  currentThreadId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    playAudio,
    stopAudio,
    seekAndPlay: seekAgentAudio,
    status: agentStatus,
    activeTimepoint: agentActiveTimepoint,
    error: ttsError
  } = useChatTTSPlayer();
  const {
    playText: playOnDemandText,
    stopAudio: stopOnDemandAudio,
    seekAndPlay: seekOnDemandAudio,
    status: onDemandStatus,
    activeTimepoint: onDemandActiveTimepoint,
    wordTimepoints: onDemandWordTimepoints
  } = useOnDemandTTSPlayer();
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const handleWordClick = (message: ChatMessage, timeInSeconds: number) => {
    if (playingMessageId !== message.id) return; // Only seek on the currently playing message

    if (message.sender === 'agent') {
      seekAgentAudio(timeInSeconds);
    } else if (message.sender === 'user' && message.text) {
      seekOnDemandAudio(timeInSeconds, message.text);
    }
  };

  const handlePlayAudio = useCallback((message: ChatMessage) => {
    if (playingMessageId === message.id) {
      stopAudio();
      stopOnDemandAudio();
      setPlayingMessageId(null);
    } else {
      stopAudio();
      stopOnDemandAudio();
      setPlayingMessageId(message.id);
      if (message.sender === 'agent' && message.audio_content_base64 && message.timepoints) {
        playAudio(message.audio_content_base64, message.timepoints);
      } else if (message.sender === 'user' && message.text) {
        playOnDemandText(message.text);
      } else {
        console.error('No audio content or text to play for message:', message.id);
        setPlayingMessageId(null);
      }
    }
  }, [playAudio, stopAudio, playingMessageId, playOnDemandText, stopOnDemandAudio]);

  useEffect(() => {
    if (agentStatus === 'idle' && onDemandStatus === 'idle') {
      setPlayingMessageId(null);
    }
    if (ttsError) {
      console.error("TTS Playback Error:", ttsError);
    }
  }, [agentStatus, onDemandStatus, ttsError]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleRetrySendMessage = (messageText: string, originalMessageId: string) => {
    onSendMessage(messageText, true, originalMessageId);
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesArea}>
        {messages.map((msg) => {
          const isPlayingThisMessage = playingMessageId === msg.id;
          let bubbleActiveTimepoint = null;
          if (isPlayingThisMessage) {
            bubbleActiveTimepoint = msg.sender === 'agent' ? agentActiveTimepoint : onDemandActiveTimepoint;
          }

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRetrySend={msg.sender === 'user' ? handleRetrySendMessage : undefined}
              onSendMessage={onSendMessage}
              onPlayAudio={handlePlayAudio}
              isPlaying={isPlayingThisMessage && (agentStatus === 'playing' || agentStatus === 'paused' || onDemandStatus === 'playing')}
              isLoading={isPlayingThisMessage && (agentStatus === 'loading' || onDemandStatus === 'loading')}
              activeTimepoint={bubbleActiveTimepoint}
              onDemandWordTimepoints={isPlayingThisMessage && msg.sender === 'user' ? onDemandWordTimepoints : null}
              onWordClick={isPlayingThisMessage ? (time) => handleWordClick(msg, time) : undefined}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
                  <ChatInputBar
        onSendMessage={(text: string) => onSendMessage(text)}
        isSendingMessage={isSendingMessage}
        currentDocumentId={currentDocumentId}
        currentThreadId={currentThreadId}
        playText={playOnDemandText}
        stopAudio={stopOnDemandAudio}
        onDemandStatus={onDemandStatus}
      />
    </div>
  );
};

export default GeminiChatInterface;
