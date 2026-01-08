import React from 'react';
import { Timepoint } from '../../types/document';

// Helper function to decode HTML/XML entities that may have been escaped for TTS/SSML
const decodeHtmlEntities = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

interface HighlightedTextBlockProps {
  text: string;
  wordTimepoints: Timepoint[];
  activeTimepoint: Timepoint | null;
  onWordClick?: (timeInSeconds: number) => void;
  className?: string;
  theme?: 'light' | 'dark';
}

const groupTimepointsIntoParagraphs = (timepoints: Timepoint[]) => {
  const paragraphs: Timepoint[][] = [];
  let currentParagraph: Timepoint[] = [];

  timepoints.forEach((timepoint) => {
    if (!timepoint || !timepoint.mark_name) {
      return;
    }

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
  });

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph);
  }

  return paragraphs;
};

export const HighlightedTextBlock: React.FC<HighlightedTextBlockProps> = ({
  text,
  wordTimepoints,
  activeTimepoint,
  onWordClick,
  className,
  theme = 'light',
}) => {
  const textColorClass = theme === 'light' ? 'text-gray-900' : 'text-gray-100';
  const highlightClass = theme === 'light' ? 'bg-yellow-200' : 'bg-yellow-500/40';

  if (!wordTimepoints || wordTimepoints.length === 0) {
    return (
      <p
        className={classNames('whitespace-pre-wrap leading-relaxed', textColorClass, className)}
        aria-live="polite"
      >
        {text}
      </p>
    );
  }

  const paragraphs = groupTimepointsIntoParagraphs(wordTimepoints);

  return (
    <div className={classNames('space-y-4', className)} aria-live="polite">
      {paragraphs.map((paragraph, pIndex) => (
        <p key={pIndex} className={classNames('leading-relaxed whitespace-pre-wrap', textColorClass)}>
          {paragraph.map((timepoint, wIndex) => {
            const isHighlighted =
              !!activeTimepoint &&
              activeTimepoint.time_seconds === timepoint.time_seconds &&
              activeTimepoint.mark_name === timepoint.mark_name;

            return (
              <span
                key={`${pIndex}-${wIndex}`}
                className={classNames(
                  'px-0.5 rounded transition-colors duration-150',
                  isHighlighted ? highlightClass : 'bg-transparent',
                  onWordClick ? 'cursor-pointer' : 'cursor-default'
                )}
                onClick={() => onWordClick?.(timepoint.time_seconds)}
              >
                {decodeHtmlEntities(timepoint.mark_name)}{' '}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
};

export default HighlightedTextBlock;
