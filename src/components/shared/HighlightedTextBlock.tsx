import React from 'react';
import { Timepoint } from '../../types/document';

const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

interface HighlightedTextBlockProps {
  text: string;
  wordTimepoints: Timepoint[];
  activeTimepoint: Timepoint | null;
  onWordClick?: (timeInSeconds: number) => void;
  className?: string;
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
}) => {
  if (!wordTimepoints || wordTimepoints.length === 0) {
    return (
      <p
        className={classNames('whitespace-pre-wrap leading-relaxed text-gray-900', className)}
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
        <p key={pIndex} className="leading-relaxed text-gray-900 whitespace-pre-wrap">
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
                  isHighlighted ? 'bg-yellow-200 dark:bg-yellow-500/70' : 'bg-transparent',
                  onWordClick ? 'cursor-pointer' : 'cursor-default'
                )}
                onClick={() => onWordClick?.(timepoint.time_seconds)}
              >
                {timepoint.mark_name}{' '}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
};

export default HighlightedTextBlock;
