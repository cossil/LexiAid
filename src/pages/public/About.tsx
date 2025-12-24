import React from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { useAccessibility } from '../../contexts/AccessibilityContext';

const About: React.FC = () => {
  const { highContrast, speakText, uiTtsEnabled } = useAccessibility();

  const handleHover = (text: string) => {
    if (uiTtsEnabled) {
      speakText(text);
    }
  };

  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <article>
          <h1 
            className="text-4xl md:text-5xl font-bold text-white mb-8"
            onMouseEnter={() => handleHover('About LexiAid: Engineering Empathy')}
            onClick={() => handleHover('About LexiAid: Engineering Empathy')}
          >
            About LexiAid: Engineering Empathy
          </h1>
          
          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('The Inspiration: A Father and Son')}
            onClick={() => handleHover('The Inspiration: A Father and Son')}
          >
            The Inspiration: A Father and Son
          </h2>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('LexiAid was not born in a boardroom; it was born at a kitchen table. It began with a single mission: to help my son Rafael, and hopefully many others with the same difficults, connect with the world.')}
            onClick={() => handleHover('LexiAid was not born in a boardroom; it was born at a kitchen table. It began with a single mission: to help my son Rafael, and hopefully many others with the same difficults, connect with the world.')}
          >
            LexiAid was not born in a boardroom; it was born at a kitchen table. It began with a single mission:
            <strong className="text-white"> to help my son Rafael, and hopefully many others with the same difficults, connect with the world.</strong>
          </p>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('Rafael is a brilliant young adult who navigates life with Duchenne Muscular Dystrophy (DMD). Alongside the physical challenges of DMD, Rafa lives with severe dyslexia, alexia (the inability to read words), and dysgraphia (the inability to write).')}
            onClick={() => handleHover('Rafael is a brilliant young adult who navigates life with Duchenne Muscular Dystrophy (DMD). Alongside the physical challenges of DMD, Rafa lives with severe dyslexia, alexia (the inability to read words), and dysgraphia (the inability to write).')}
          >
            Rafael is a brilliant young adult who navigates life with Duchenne Muscular Dystrophy (DMD). Alongside the
            physical challenges of DMD, Rafa lives with severe dyslexia, alexia (the inability to read words), and dysgraphia
            (the inability to write).
          </p>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('But these labels do not define him. Rafa is funny, incredibly insightful, and creative. He devours documentaries on Renaissance art, delves into complex philosophical arguments via podcasts, and even guides his parents and friends through complex cooking techniques by memory. His intelligence is limitless.')}
            onClick={() => handleHover('But these labels do not define him. Rafa is funny, incredibly insightful, and creative. He devours documentaries on Renaissance art, delves into complex philosophical arguments via podcasts, and even guides his parents and friends through complex cooking techniques by memory. His intelligence is limitless.')}
          >
            But these labels do not define him. Rafa is funny, incredibly insightful, and creative. He devours documentaries on
            Renaissance art, delves into complex philosophical arguments via podcasts, and even guides his parents and friends through
            complex cooking techniques by memory. His intelligence is limitless.
          </p>

          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('The Reality: "Serving a Sentence"')}
            onClick={() => handleHover('The Reality: "Serving a Sentence"')}
          >
            The Reality: "Serving a Sentence"
          </h2>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('For years, we witnessed the mixture of suffering and anguish of a student with all this potential effectively "serving a sentence" throughout middle and high school.')}
            onClick={() => handleHover('For years, we witnessed the mixture of suffering and anguish of a student with all this potential effectively "serving a sentence" throughout middle and high school.')}
          >
            For years, we witnessed the mixture of suffering and anguish of a student with all this potential effectively
            <strong className="text-white"> "serving a sentence"</strong> throughout middle and high school.
          </p>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('Instead of an environment where his intellect could soar, Rafa was frequently relegated to classrooms for "special" students. This wasn\'t because he couldn\'t understand the material, but because the system lacked the ability to bridge the gap imposed by his inability to decode text.')}
            onClick={() => handleHover('Instead of an environment where his intellect could soar, Rafa was frequently relegated to classrooms for "special" students. This wasn\'t because he couldn\'t understand the material, but because the system lacked the ability to bridge the gap imposed by his inability to decode text.')}
          >
            Instead of an environment where his intellect could soar, Rafa was frequently relegated to classrooms for "special"
            students. This wasn't because he couldn't understand the material, but because the system lacked the ability to
            bridge the gap imposed by his inability to decode text.
          </p>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('We faced the frustration of an educational system where the lack of resources and structure—often coupled with a rigid unwillingness to adapt—led schools to opt for the easiest path: seclusion instead of inclusion. Bright minds like Rafa\'s were isolated not because they couldn\'t learn, but because the tools to teach them fairly did not exist.')}
            onClick={() => handleHover('We faced the frustration of an educational system where the lack of resources and structure—often coupled with a rigid unwillingness to adapt—led schools to opt for the easiest path: seclusion instead of inclusion. Bright minds like Rafa\'s were isolated not because they couldn\'t learn, but because the tools to teach them fairly did not exist.')}
          >
            We faced the frustration of an educational system where the lack of resources and structure—often coupled with a
            rigid unwillingness to adapt—led schools to opt for the easiest path: <strong className="text-white">seclusion instead of inclusion.</strong> Bright
            minds like Rafa's were isolated not because they couldn't learn, but because the tools to teach them fairly did not
            exist.
          </p>

          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('The Solution: An Auditory-First Philosophy')}
            onClick={() => handleHover('The Solution: An Auditory-First Philosophy')}
          >
            The Solution: An Auditory-First Philosophy
          </h2>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('We realized that waiting for the system to change was not an option. We decided to build the "digital ramp" ourselves. LexiAid is designed from the ground up to be Auditory-First, using AI to remove the friction of access.')}
            onClick={() => handleHover('We realized that waiting for the system to change was not an option. We decided to build the "digital ramp" ourselves. LexiAid is designed from the ground up to be Auditory-First, using AI to remove the friction of access.')}
          >
            We realized that waiting for the system to change was not an option. We decided to build the "digital ramp" ourselves.
            LexiAid is designed from the ground up to be <strong className="text-white">Auditory-First</strong>, using AI to remove the friction of access.
          </p>

          <ul className={`list-disc pl-6 ${highContrast ? 'text-gray-100' : 'text-gray-300'} space-y-4 mb-6 text-lg`}>
            <li 
              onMouseEnter={() => handleHover('We Make Documents Speak: Our "Document Understanding Agent" doesn\'t just read text; it analyzes the entire page. It describes charts, explains images in context, and navigates layout complexities, turning a static PDF into an interactive, narrated experience.')}
              onClick={() => handleHover('We Make Documents Speak: Our "Document Understanding Agent" doesn\'t just read text; it analyzes the entire page. It describes charts, explains images in context, and navigates layout complexities, turning a static PDF into an interactive, narrated experience.')}
            >
              <strong className="text-white">We Make Documents Speak:</strong> Our "Document Understanding Agent" doesn't just read text; it analyzes the
              entire page. It describes charts, explains images in context, and navigates layout complexities, turning a static
              PDF into an interactive, narrated experience.
            </li>
            <li 
              onMouseEnter={() => handleHover('We Help Thoughts Flow: Our "Answer Formulation" tool allows students to speak their messy, complex, non-linear thoughts. The AI refines these spoken words into clear, structured text—without adding external information. This ensures the final work is 100% the student\'s own knowledge, just translated into a format the academic world accepts.')}
              onClick={() => handleHover('We Help Thoughts Flow: Our "Answer Formulation" tool allows students to speak their messy, complex, non-linear thoughts. The AI refines these spoken words into clear, structured text—without adding external information. This ensures the final work is 100% the student\'s own knowledge, just translated into a format the academic world accepts.')}
            >
              <strong className="text-white">We Help Thoughts Flow:</strong> Our "Answer Formulation" tool allows students to speak their messy, complex,
              non-linear thoughts. The AI refines these spoken words into clear, structured text—<strong className="text-white">without adding external information</strong>.
              This ensures the final work is 100% the student's own knowledge, just translated into a format the academic world accepts.
            </li>
          </ul>

          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('Our Mission')}
            onClick={() => handleHover('Our Mission')}
          >
            Our Mission
          </h2>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('LexiAid is a non-profit project. We believe that intelligence should never be defined by the ability to decode symbols on a page.')}
            onClick={() => handleHover('LexiAid is a non-profit project. We believe that intelligence should never be defined by the ability to decode symbols on a page.')}
          >
            LexiAid is a <strong className="text-white">non-profit project</strong>. We believe that intelligence should never be defined by the ability to decode
            symbols on a page.
          </p>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('Our goal is to empower students with severe learning disabilities to demonstrate their true potential, restore their academic independence, and prove that when we design for inclusion, everyone benefits.')}
            onClick={() => handleHover('Our goal is to empower students with severe learning disabilities to demonstrate their true potential, restore their academic independence, and prove that when we design for inclusion, everyone benefits.')}
          >
            Our goal is to empower students with severe learning disabilities to demonstrate their true potential, restore their
            academic independence, and prove that when we design for inclusion, everyone benefits.
          </p>
          
          <hr className="border-gray-700 my-12" />
          
          <h3 
            className="text-xl font-bold text-white mb-4"
            onMouseEnter={() => handleHover('About the Founder')}
            onClick={() => handleHover('About the Founder')}
          >
            About the Founder
          </h3>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('Alexandre da Costa e Silva is a Senior Engineering Leader in RF & Telecommunications Systems. Motivated by the frustration of seeing his son\'s potential stifled by inflexible systems, he applied his engineering expertise to build the technology that schools failed to provide.')}
            onClick={() => handleHover('Alexandre da Costa e Silva is a Senior Engineering Leader in RF & Telecommunications Systems. Motivated by the frustration of seeing his son\'s potential stifled by inflexible systems, he applied his engineering expertise to build the technology that schools failed to provide.')}
          >
            <strong className="text-white">Alexandre da Costa e Silva</strong> is a Senior Engineering Leader in RF & Telecommunications Systems. Motivated by the
            frustration of seeing his son's potential stifled by inflexible systems, he applied his engineering expertise to build the
            technology that schools failed to provide.
          </p>
          <blockquote 
            className={`border-l-4 ${highContrast ? 'border-white' : 'border-blue-500'} pl-6 italic my-8 text-xl ${highContrast ? 'text-white' : 'text-gray-200'}`}
            onMouseEnter={() => handleHover('"Leaving brilliant minds behind because we haven\'t bothered to build accessible interfaces isn\'t just a failure of technology; it\'s a failure of empathy."')}
            onClick={() => handleHover('"Leaving brilliant minds behind because we haven\'t bothered to build accessible interfaces isn\'t just a failure of technology; it\'s a failure of empathy."')}
          >
            “Leaving brilliant minds behind because we haven't bothered to build accessible interfaces isn't just a failure of
            technology; it's a failure of empathy.”
          </blockquote>
        </article>
      </main>
    </PublicLayout>
  );
};

export default About;
