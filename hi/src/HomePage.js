import React, { useState } from 'react';
import SecurityShowcase from './SecurityShowcase';
import './HomePage.css';

const HomePage = ({ onCreateRoom, onJoinRoom }) => {
  const [activeFeature, setActiveFeature] = useState(null);

  const securityFeatures = [
    {
      id: 'encryption',
      icon: '🔒',
      title: 'Military-Grade Encryption',
      subtitle: 'AES-256 End-to-End Protection',
      description: 'Every message is encrypted with AES-256 before leaving your device. Even we cannot read your conversations.',
      benefits: [
        'Government-level security standards',
        'Impossible to intercept or decode',
        'Client-side encryption only',
        'Unique keys for each room'
      ]
    },
    {
      id: 'disappearing',
      icon: '🔥',
      title: 'Auto-Disappearing Messages',
      subtitle: 'Zero Digital Footprint',
      description: 'Messages automatically vanish after room expiration. No traces left anywhere - not even in memory.',
      benefits: [
        'Complete message destruction',
        'No chat history stored',
        'Memory automatically cleared',
        'Ephemeral mode for instant deletion'
      ]
    },
    {
      id: 'decentralized',
      icon: '🌐',
      title: 'Decentralized Architecture',
      subtitle: 'No Central Control',
      description: 'Peer-to-peer connections ensure your conversations continue even if servers go down.',
      benefits: [
        'Direct client-to-client communication',
        'No single point of failure',
        'Censorship resistant',
        'Works even if server is offline'
      ]
    },
    {
      id: 'zero-storage',
      icon: '🚫',
      title: 'Zero Server Storage',
      subtitle: 'We Cannot See Your Messages',
      description: 'Our servers only relay encrypted data. We have no access to your conversations or encryption keys.',
      benefits: [
        'No message logging or storage',
        'Server acts as relay only',
        'No data mining possible',
        'Complete privacy guarantee'
      ]
    }
  ];

  const whyItMatters = [
    {
      icon: '👥',
      title: 'Personal Privacy',
      description: 'Your private conversations should remain private. No corporation, government, or hacker should access your personal communications.'
    },
    {
      icon: '💼',
      title: 'Business Security',
      description: 'Protect sensitive business discussions, trade secrets, and confidential information from corporate espionage and data breaches.'
    },
    {
      icon: '🏛️',
      title: 'Freedom of Speech',
      description: 'Communicate freely without fear of surveillance, censorship, or persecution. Essential for democracy and human rights.'
    },
    {
      icon: '🛡️',
      title: 'Data Protection',
      description: 'Prevent identity theft, blackmail, and misuse of personal information. Your data cannot be stolen if it doesn\'t exist.'
    }
  ];

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">Truly Private</span>
            <br />
            Chat Rooms
          </h1>
          <p className="hero-subtitle">
            Military-grade encryption • Auto-disappearing messages • Decentralized architecture
          </p>
          <p className="hero-description">
            The only chat platform where <strong>even we cannot read your messages</strong>.
            Your conversations disappear completely after 1 hour - no traces, no logs, no surveillance.
          </p>
          
          <div className="hero-actions">
            <button onClick={onCreateRoom} className="cta-primary">
              <span className="button-icon">🔒</span>
              Create Secure Room
              <span className="button-price">₹1</span>
            </button>
            <button onClick={onJoinRoom} className="cta-secondary">
              <span className="button-icon">🎫</span>
              Join with Ticket
            </button>
          </div>

          <div className="trust-indicators">
            <div className="trust-item">
              <span className="trust-icon">🔐</span>
              <span>AES-256 Encrypted</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🔥</span>
              <span>Auto-Delete</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🌐</span>
              <span>Decentralized</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🚫</span>
              <span>Zero Logs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="security-features">
        <div className="container">
          <h2 className="section-title">Unbreakable Security by Design</h2>
          <p className="section-subtitle">
            Built with privacy-first architecture that makes surveillance impossible
          </p>

          <div className="features-grid">
            {securityFeatures.map((feature) => (
              <div 
                key={feature.id}
                className={`feature-card ${activeFeature === feature.id ? 'active' : ''}`}
                onClick={() => setActiveFeature(activeFeature === feature.id ? null : feature.id)}
              >
                <div className="feature-header">
                  <span className="feature-icon">{feature.icon}</span>
                  <div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-subtitle">{feature.subtitle}</p>
                  </div>
                </div>
                
                <p className="feature-description">{feature.description}</p>
                
                {activeFeature === feature.id && (
                  <div className="feature-benefits">
                    <h4>Key Benefits:</h4>
                    <ul>
                      {feature.benefits.map((benefit, index) => (
                        <li key={index}>
                          <span className="benefit-check">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Showcase */}
      <SecurityShowcase />

      {/* Why It Matters */}
      <section className="why-matters">
        <div className="container">
          <h2 className="section-title">Why Privacy Matters</h2>
          <p className="section-subtitle">
            In an age of mass surveillance and data breaches, true privacy is not a luxury - it's a necessity
          </p>

          <div className="matters-grid">
            {whyItMatters.map((item, index) => (
              <div key={index} className="matter-card">
                <span className="matter-icon">{item.icon}</span>
                <h3 className="matter-title">{item.title}</h3>
                <p className="matter-description">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Pay & Create</h3>
                <p>Pay ₹1 to create a secure room that lasts 1 hour</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Share Ticket</h3>
                <p>Get a unique ticket number to share with trusted contacts</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Chat Securely</h3>
                <p>All messages are encrypted end-to-end with military-grade security</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Auto-Delete</h3>
                <p>Everything disappears after 1 hour - no traces left anywhere</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready for Truly Private Communication?</h2>
            <p>Join thousands who trust us with their most sensitive conversations</p>
            
            <div className="cta-buttons">
              <button onClick={onCreateRoom} className="cta-primary large">
                <span className="button-icon">🔒</span>
                Start Secure Chat - ₹1
              </button>
              <button onClick={onJoinRoom} className="cta-secondary large">
                <span className="button-icon">🎫</span>
                Join Existing Room
              </button>
            </div>

            <p className="guarantee">
              <span className="guarantee-icon">🛡️</span>
              <strong>Privacy Guarantee:</strong> We cannot read your messages even if we wanted to
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
