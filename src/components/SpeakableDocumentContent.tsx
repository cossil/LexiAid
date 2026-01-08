import React from 'react';

interface SpeakableDocumentContentProps {
  wordTimepoints: any[];
  activeTimepoint: any | null;
  className?: string;
  onWordClick: (timeInSeconds: number) => void;
}

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

export const SpeakableDocumentContent: React.FC<SpeakableDocumentContentProps> = ({
  wordTimepoints,
  activeTimepoint,
  className = '',
  onWordClick,
}) => {
  // Add comprehensive debugging
  console.log(`SpeakableDocumentContent: Received ${wordTimepoints ? wordTimepoints.length : 0} timepoints`);

  if (wordTimepoints && wordTimepoints.length > 0) {
    // Log first and last few timepoints
    console.log('First 5 timepoints:', wordTimepoints.slice(0, 5));
    console.log('Last 5 timepoints:', wordTimepoints.slice(-5));

    // Check for paragraph break markers
    const paragraphBreaks = wordTimepoints.filter(tp => tp && tp.mark_name === 'PARAGRAPH_BREAK');
    console.log(`Found ${paragraphBreaks.length} PARAGRAPH_BREAK markers in timepoints array`);

    if (paragraphBreaks.length > 0) {
      console.log('Paragraph break positions:', paragraphBreaks.map(pb =>
        `at ${pb.time_seconds.toFixed(2)}s (index ${wordTimepoints.indexOf(pb)}/${wordTimepoints.length})`
      ));
    }
  }

  if (!wordTimepoints || wordTimepoints.length === 0) {
    return (
      <div className={`${className} text-center text-gray-500 p-8`}>
        <p>No text content available to display for this document.</p>
      </div>
    );
  }

  // Group timepoints into paragraphs.
  // A new paragraph is started after a timepoint containing a newline.
  const paragraphs: any[][] = [];
  let currentParagraph: any[] = [];

  wordTimepoints.forEach((timepoint) => {
    if (timepoint && timepoint.mark_name) {
      // Check for paragraph break markers
      const isParagraphBreak = timepoint.mark_name === 'PARAGRAPH_BREAK';
      const containsNewline = timepoint.mark_name.includes('\n');
      const word = timepoint.mark_name.trim();

      // Add non-empty, non-paragraph-break words to the current paragraph
      if (word && !isParagraphBreak) {
        currentParagraph.push({ ...timepoint, mark_name: word });
      }

      // Start a new paragraph on paragraph break markers or newlines
      if (isParagraphBreak || containsNewline) {
        if (currentParagraph.length > 0) {
          paragraphs.push(currentParagraph);
        }
        currentParagraph = [];
        console.log('Found paragraph break:', isParagraphBreak ? 'PARAGRAPH_BREAK marker' : 'newline character');
      }
    }
  });

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph);
  }

  return (
    <div className={`${className} font-sans`}>
      {paragraphs.map((paragraph, pIndex) => (
        <p key={pIndex} className="mb-4 last:mb-0">
          {paragraph.map((timepoint, wIndex) => {
            const isHighlighted =
              activeTimepoint &&
              timepoint &&
              timepoint.time_seconds === activeTimepoint.time_seconds &&
              timepoint.mark_name === activeTimepoint.mark_name;

            return (
              <span
                key={`${pIndex}-${wIndex}`}
                className={`${isHighlighted ? 'bg-blue-300 dark:bg-blue-700 rounded-md' : 'bg-transparent'} cursor-pointer`}
                onClick={() => onWordClick(timepoint.time_seconds)}
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
