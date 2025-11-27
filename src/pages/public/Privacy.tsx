import React from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { useAccessibility } from '../../contexts/AccessibilityContext';

const Privacy: React.FC = () => {
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
            onMouseEnter={() => handleHover('Privacy Policy')}
          >
            Privacy Policy
          </h1>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('Last Updated: November 2025')}
          >
            <strong className="text-white">Last Updated:</strong> November 2025
          </p>

          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('1. Introduction')}
          >
            1. Introduction
          </h2>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('LexiAid is a non-profit educational platform designed to assist students with learning disabilities. We are committed to protecting your privacy and ensuring the security of the documents and audio you entrust to us.')}
          >
            LexiAid is a non-profit educational platform designed to assist students with learning
            disabilities. We are committed to protecting your privacy and ensuring the security of the documents and audio you
            entrust to us.
          </p>

          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('2. Information We Collect')}
          >
            2. Information We Collect
          </h2>
          <ul className={`list-disc pl-6 ${highContrast ? 'text-gray-100' : 'text-gray-300'} space-y-4 mb-6 text-lg`}>
            <li onMouseEnter={() => handleHover('Account Information: We use Firebase Authentication (Google) to manage your login. We store your email address and display name.')}>
              <strong className="text-white">Account Information:</strong> We use Firebase Authentication (Google) to manage your login. We store your email
              address and display name.
            </li>
            <li onMouseEnter={() => handleHover('User Content: This includes the documents (PDFs, images) you upload and the audio recordings of your voice when using the Answer Formulation feature.')}>
              <strong className="text-white">User Content:</strong> This includes the documents (PDFs, images) you upload and the audio recordings of your voice
              when using the Answer Formulation feature.
            </li>
            <li onMouseEnter={() => handleHover('Usage Data: We track basic interactions (e.g., "Document Uploaded," "Quiz Completed") to improve the application stability.')}>
              <strong className="text-white">Usage Data:</strong> We track basic interactions (e.g., "Document Uploaded," "Quiz Completed") to improve the
              application stability.
            </li>
          </ul>

          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('3. How We Use AI')}
          >
            3. How We Use AI
          </h2>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('LexiAid uses artificial intelligence technologies (specifically Google Cloud Vertex AI) to function.')}
          >
            LexiAid uses artificial intelligence technologies (specifically Google Cloud Vertex AI) to function.
          </p>
          <ul className={`list-disc pl-6 ${highContrast ? 'text-gray-100' : 'text-gray-300'} space-y-4 mb-6 text-lg`}>
            <li onMouseEnter={() => handleHover('Document Processing: Your documents are processed to extract text and describe images.')}>
              <strong className="text-white">Document Processing:</strong> Your documents are processed to extract text and describe images.
            </li>
            <li onMouseEnter={() => handleHover('Audio Processing: Your voice is transcribed into text.')}>
              <strong className="text-white">Audio Processing:</strong> Your voice is transcribed into text.
            </li>
            <li onMouseEnter={() => handleHover('Data Privacy: We do not sell your data. Your documents and voice inputs are processed strictly to provide the service (reading, quizzing, drafting).')}>
              <strong className="text-white">Data Privacy:</strong> We do not sell your data. Your documents and voice inputs are processed strictly to provide the
              service (reading, quizzing, drafting).
            </li>
          </ul>

          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('4. Data Storage & Security')}
          >
            4. Data Storage & Security
          </h2>
          <ul className={`list-disc pl-6 ${highContrast ? 'text-gray-100' : 'text-gray-300'} space-y-4 mb-6 text-lg`}>
            <li onMouseEnter={() => handleHover('Storage: Your files are stored securely using Google Cloud Storage.')}>
              <strong className="text-white">Storage:</strong> Your files are stored securely using Google Cloud Storage.
            </li>
            <li onMouseEnter={() => handleHover('Encryption: Data is encrypted in transit and at rest.')}>
              <strong className="text-white">Encryption:</strong> Data is encrypted in transit and at rest.
            </li>
            <li onMouseEnter={() => handleHover('Deletion: You have the right to delete your account at any time via the "Settings" page. Deleting your account permanently removes your personal profile and associated documents from our systems.')}>
              <strong className="text-white">Deletion:</strong> You have the right to delete your account at any time via the "Settings" page. Deleting your account
              permanently removes your personal profile and associated documents from our systems.
            </li>
          </ul>

          <h2 
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6"
            onMouseEnter={() => handleHover('5. Contact Us')}
          >
            5. Contact Us
          </h2>
          <p 
            className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}
            onMouseEnter={() => handleHover('If you have questions about this policy, please contact us at: cossil@lexiaid.com')}
          >
            If you have questions about this policy, please contact us at: <a href="mailto:cossil@lexiaid.com" className="text-blue-400 hover:text-blue-300">cossil@lexiaid.com</a>
          </p>
        </article>
      </main>
    </PublicLayout>
  );
};

export default Privacy;
