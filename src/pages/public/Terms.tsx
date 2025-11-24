import React from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { useAccessibility } from '../../contexts/AccessibilityContext';

const Terms: React.FC = () => {
  const { highContrast } = useAccessibility();

  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <article>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Terms of Service</h1>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            <strong className="text-white">Last Updated:</strong> November 2025
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">1. Acceptance of Terms</h2>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            By accessing and using LexiAid, you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">2. Description of Service</h2>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            LexiAid is an AI-powered accessibility tool designed to help users read, understand, and formulate text. It is provided
            as a non-profit pilot project.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">3. User Responsibilities</h2>
          <ul className={`list-disc pl-6 ${highContrast ? 'text-gray-100' : 'text-gray-300'} space-y-4 mb-6 text-lg`}>
            <li><strong className="text-white">Account Security:</strong> You are responsible for maintaining the confidentiality of your login information.</li>
            <li>
              <strong className="text-white">Content:</strong> You agree not to upload content that is illegal, harmful, or violates the copyright of others. You retain
              ownership of the documents you upload.
            </li>
          </ul>

          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">4. Disclaimer of Warranties</h2>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            The service is provided on an "AS IS" and "AS AVAILABLE" basis. While we strive for high accuracy in our AI transcription and
            reading features, LexiAid does not guarantee that the results will be error-free. This tool is an educational aid, not a
            replacement for professional medical or educational advice.
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-white mt-12 mb-6">5. Limitation of Liability</h2>
          <p className={`text-lg ${highContrast ? 'text-gray-100' : 'text-gray-300'} leading-relaxed mb-6`}>
            LexiAid and its creators shall not be liable for any indirect, incidental, or consequential damages resulting from the use
            or inability to use the service.
          </p>
        </article>
      </main>
    </PublicLayout>
  );
};

export default Terms;
