import React from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { useAccessibility } from '../../contexts/AccessibilityContext';

const About: React.FC = () => {
  const { highContrast } = useAccessibility();

  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <article>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">
            About LexiAid: Engineering Empathy
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">
            The Inspiration: A Father and Son
          </h2>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            LexiAid was not born in a boardroom; it was born at a kitchen table. It began with a single mission:
            <strong className="text-white"> to help my son Rafael, and hopefully many others with the same difficults, connect with the world.</strong>
          </p>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            Rafael is a brilliant young adult who navigates life with Duchenne Muscular Dystrophy (DMD). Alongside the
            physical challenges of DMD, Rafa lives with severe dyslexia, alexia (the inability to read words), and dysgraphia
            (the inability to write).
          </p>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            But these labels do not define him. Rafa is funny, incredibly insightful, and creative. He devours documentaries on
            Renaissance art, delves into complex philosophical arguments via podcasts, and even guides his parents and friends through
            complex cooking techniques by memory. His intelligence is limitless.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">
            The Reality: "Serving a Sentence"
          </h2>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            For years, we witnessed the mixture of suffering and anguish of a student with all this potential effectively
            <strong className="text-white"> "serving a sentence"</strong> throughout middle and high school.
          </p>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            Instead of an environment where his intellect could soar, Rafa was frequently relegated to classrooms for "special"
            students. This wasn't because he couldn't understand the material, but because the system lacked the ability to
            bridge the gap imposed by his inability to decode text.
          </p>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            We faced the frustration of an educational system where the lack of resources and structure—often coupled with a
            rigid unwillingness to adapt—led schools to opt for the easiest path: <strong className="text-white">seclusion instead of inclusion.</strong> Bright
            minds like Rafa's were isolated not because they couldn't learn, but because the tools to teach them fairly did not
            exist.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">
            The Solution: An Auditory-First Philosophy
          </h2>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            We realized that waiting for the system to change was not an option. We decided to build the "digital ramp" ourselves.
            LexiAid is designed from the ground up to be <strong className="text-white">Auditory-First</strong>, using AI to remove the friction of access.
          </p>

          <ul className={`list-disc pl-6 ${highContrast ? 'text-gray-100' : 'text-gray-300'} space-y-4 mb-6 text-lg`}>
            <li>
              <strong className="text-white">We Make Documents Speak:</strong> Our "Document Understanding Agent" doesn't just read text; it analyzes the
              entire page. It describes charts, explains images in context, and navigates layout complexities, turning a static
              PDF into an interactive, narrated experience.
            </li>
            <li>
              <strong className="text-white">We Help Thoughts Flow:</strong> Our "Answer Formulation" tool allows students to speak their messy, complex,
              non-linear thoughts. The AI refines these spoken words into clear, structured text—<strong className="text-white">without adding external information</strong>.
              This ensures the final work is 100% the student's own knowledge, just translated into a format the academic world accepts.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">
            Our Mission
          </h2>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            LexiAid is a <strong className="text-white">non-profit project</strong>. We believe that intelligence should never be defined by the ability to decode
            symbols on a page.
          </p>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            Our goal is to empower students with severe learning disabilities to demonstrate their true potential, restore their
            academic independence, and prove that when we design for inclusion, everyone benefits.
          </p>
          
          <hr className="border-gray-700 my-12" />
          
          <h3 className="text-xl font-bold text-white mb-4">About the Founder</h3>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            <strong className="text-white">Alexandre da Costa e Silva</strong> is a Senior Engineering Leader in RF & Telecommunications Systems. Motivated by the
            frustration of seeing his son's potential stifled by inflexible systems, he applied his engineering expertise to build the
            technology that schools failed to provide.
          </p>
          <blockquote className={`border-l-4 ${highContrast ? 'border-white' : 'border-blue-500'} pl-6 italic my-8 text-xl ${highContrast ? 'text-white' : 'text-gray-200'}`}>
            “Leaving brilliant minds behind because we haven't bothered to build accessible interfaces isn't just a failure of
            technology; it's a failure of empathy.”
          </blockquote>
        </article>
      </main>
    </PublicLayout>
  );
};

export default About;
