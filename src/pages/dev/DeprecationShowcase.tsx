/**
 * Component Graveyard - Deprecation Showcase
 * 
 * This is a DEVELOPER-ONLY component that renders all frontend deprecation candidates
 * in a single page for visual inspection. This allows developers to:
 * 
 * 1. Verify that deprecated components can still render without errors
 * 2. Check the browser console for warnings or errors
 * 3. Visually inspect what functionality would be lost if components are removed
 * 
 * IMPORTANT: This component is excluded from production builds via the dev-only route.
 * See App.tsx for the conditional route that only loads in development mode.
 * 
 * Refer to docs/deprecated_candidates.md for the full deprecation analysis.
 */

// @ts-nocheck - Disable type checking for this dev-only file since components may have type issues

import React from 'react';

// Import all high-confidence deprecated components
import Hero from '../../components/Hero';
import CTA from '../../components/CTA';
import FeatureCard from '../../components/FeatureCard';
import Features from '../../components/Features';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import MessageWithTTS from '../../components/MessageWithTTS';
import SpeakableText from '../../components/SpeakableText';
import AudioReview from '../../components/AudioReview';

const DeprecationShowcase: React.FC = () => {
  // Inline styles for the showcase
  const containerStyle: React.CSSProperties = {
    padding: '2rem',
    backgroundColor: '#1a1a1a',
    color: 'white',
    fontFamily: 'monospace',
    minHeight: '100vh',
  };

  const sectionStyle: React.CSSProperties = {
    border: '2px dashed #ff5555',
    padding: '1rem',
    margin: '1rem 0',
    backgroundColor: '#2d2d2d',
    borderRadius: '8px',
  };

  const headerStyle: React.CSSProperties = {
    color: '#ffaaaa',
    marginTop: 0,
    marginBottom: '0.5rem',
    fontSize: '1.2rem',
  };

  const infoStyle: React.CSSProperties = {
    color: '#aaaaaa',
    fontSize: '0.9rem',
    marginBottom: '1rem',
    fontStyle: 'italic',
  };

  const warningBannerStyle: React.CSSProperties = {
    backgroundColor: '#ff5555',
    color: 'white',
    padding: '1rem',
    marginBottom: '2rem',
    borderRadius: '8px',
    fontWeight: 'bold',
  };

  // Mock data for components that require props
  const mockMessage = {
    id: 'mock-1',
    text: 'This is a mock message for testing MessageWithTTS component.',
    sender: 'agent' as const,
    timestamp: new Date().toISOString(),
    audio_content_base64: null,
  };

  const mockFeatureCardProps = {
    icon: '🎯',
    title: 'Mock Feature',
    description: 'This is a mock feature card for testing.',
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        🪦 Component Graveyard - Deprecation Showcase
      </h1>
      
      <div style={warningBannerStyle}>
        ⚠️ DEVELOPER ONLY - This page is not accessible in production builds
      </div>

      <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
        This page renders all frontend components identified as deprecation candidates.
        Open the developer console (F12) to check for rendering errors or warnings.
        Each component is isolated in a bordered section for easy inspection.
      </p>

      <p style={{ marginBottom: '2rem', color: '#ffaa00' }}>
        <strong>Note:</strong> Some components may not render correctly because they expect
        specific props or context that isn't provided here. This is expected behavior.
      </p>

      {/* Navbar Component */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>Navbar.tsx</h2>
        <p style={infoStyle}>
          Status: Medium-High confidence | Not imported in any active layout
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <Navbar />
        </div>
      </div>

      {/* Hero Component */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>Hero.tsx</h2>
        <p style={infoStyle}>
          Status: Medium-High confidence | Not imported in LandingPage.tsx
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <Hero />
        </div>
      </div>

      {/* Features Component (includes FeatureCard) */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>Features.tsx (with FeatureCard.tsx)</h2>
        <p style={infoStyle}>
          Status: Medium-High confidence | Not imported in any active page
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <Features />
        </div>
      </div>

      {/* FeatureCard Component (standalone) */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>FeatureCard.tsx (Standalone)</h2>
        <p style={infoStyle}>
          Status: Medium-High confidence | Not imported in any active page
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <FeatureCard {...mockFeatureCardProps} />
        </div>
      </div>

      {/* CTA Component */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>CTA.tsx</h2>
        <p style={infoStyle}>
          Status: Medium-High confidence | Not imported anywhere
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <CTA />
        </div>
      </div>

      {/* MessageWithTTS Component */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>MessageWithTTS.tsx</h2>
        <p style={infoStyle}>
          Status: High confidence | Replaced by MessageBubble in GeminiChatInterface
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <MessageWithTTS message={mockMessage} />
        </div>
      </div>

      {/* SpeakableText Component */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>SpeakableText.tsx</h2>
        <p style={infoStyle}>
          Status: High confidence | Replaced by SpeakableDocumentContent.tsx
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <SpeakableText 
            text="This is sample text for the SpeakableText component."
            wordTimepoints={[]}
            activeTimepoint={null}
          />
        </div>
      </div>

      {/* AudioReview Component */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>AudioReview.tsx</h2>
        <p style={infoStyle}>
          Status: High confidence | Not used in any active page
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <AudioReview />
        </div>
      </div>

      {/* Footer Component */}
      <div style={sectionStyle}>
        <h2 style={headerStyle}>Footer.tsx</h2>
        <p style={infoStyle}>
          Status: Medium-High confidence | Not imported in any active page
        </p>
        <div style={{ backgroundColor: '#1a1a1a', padding: '1rem' }}>
          <Footer />
        </div>
      </div>

      {/* Summary Section */}
      <div style={{ 
        marginTop: '3rem', 
        padding: '1.5rem', 
        backgroundColor: '#2d2d2d', 
        borderRadius: '8px',
        border: '2px solid #ffaa00'
      }}>
        <h2 style={{ color: '#ffaa00', marginTop: 0 }}>📊 Summary</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Total components tested:</strong> 9</li>
          <li><strong>High confidence candidates:</strong> 3 (MessageWithTTS, SpeakableText, AudioReview)</li>
          <li><strong>Medium-High confidence candidates:</strong> 6 (Navbar, Hero, Features, FeatureCard, CTA, Footer)</li>
        </ul>
        <p style={{ marginTop: '1rem', color: '#aaaaaa' }}>
          If all components rendered without errors, they are syntactically valid and can be safely archived.
          However, this does NOT mean they should remain in the codebase.
        </p>
        <p style={{ marginTop: '1rem', color: '#ffaa00' }}>
          <strong>Next Steps:</strong> Review docs/deprecated_candidates.md for the full analysis
          and removal recommendations.
        </p>
      </div>

      {/* Access Instructions */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: '#1a3a1a', 
        borderRadius: '8px',
        border: '1px solid #55ff55'
      }}>
        <h3 style={{ color: '#55ff55', marginTop: 0 }}>✅ How to Access This Page</h3>
        <p style={{ color: '#aaffaa' }}>
          This page is only available in development mode. Navigate to:
        </p>
        <code style={{ 
          display: 'block', 
          padding: '0.5rem', 
          backgroundColor: '#000', 
          color: '#55ff55',
          marginTop: '0.5rem',
          borderRadius: '4px'
        }}>
          http://localhost:5173/dev/deprecation-showcase
        </code>
        <p style={{ color: '#aaffaa', marginTop: '1rem', fontSize: '0.9rem' }}>
          In production builds, this route will not exist and will redirect to the default route.
        </p>
      </div>
    </div>
  );
};

export default DeprecationShowcase;
