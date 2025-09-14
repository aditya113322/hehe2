import React, { useState, useEffect } from 'react';
import './SecurityShowcase.css';

const SecurityShowcase = () => {
  const [activeDemo, setActiveDemo] = useState('encryption');
  const [demoText, setDemoText] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const demos = {
    encryption: {
      title: 'End-to-End Encryption Demo',
      description: 'See how your messages are encrypted before leaving your device',
      placeholder: 'Type a message to see it encrypted...',
      icon: '🔒'
    },
    disappearing: {
      title: 'Auto-Delete Messages',
      description: 'Watch messages disappear automatically',
      placeholder: 'This message will self-destruct...',
      icon: '🔥'
    },
    p2p: {
      title: 'Peer-to-Peer Connection',
      description: 'Direct communication bypassing servers',
      placeholder: 'Direct peer connection established',
      icon: '🌐'
    }
  };

  // Simulate encryption
  useEffect(() => {
    if (demoText && activeDemo === 'encryption') {
      const encrypted = btoa(demoText).split('').reverse().join('') + '...';
      setEncryptedText(encrypted);
    } else {
      setEncryptedText('');
    }
  }, [demoText, activeDemo]);

  // Simulate typing indicator
  useEffect(() => {
    if (demoText) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [demoText]);

  const securityStats = [
    { number: '256-bit', label: 'AES Encryption', icon: '🔐' },
    { number: '0', label: 'Messages Stored', icon: '🚫' },
    { number: '1 Hour', label: 'Max Room Life', icon: '⏰' },
    { number: '100%', label: 'Privacy Guaranteed', icon: '🛡️' }
  ];

  const threatProtection = [
    {
      threat: 'Government Surveillance',
      protection: 'End-to-end encryption makes surveillance impossible',
      icon: '🏛️',
      status: 'Protected'
    },
    {
      threat: 'Corporate Data Mining',
      protection: 'No message storage means no data to mine',
      icon: '🏢',
      status: 'Protected'
    },
    {
      threat: 'Hacker Attacks',
      protection: 'Encrypted messages are useless to hackers',
      icon: '👨‍💻',
      status: 'Protected'
    },
    {
      threat: 'Data Breaches',
      protection: 'Auto-deletion ensures no data exists to breach',
      icon: '💾',
      status: 'Protected'
    }
  ];

  return (
    <div className="security-showcase">
      {/* Interactive Demo Section */}
      <section className="demo-section">
        <div className="container">
          <h2>See Security in Action</h2>
          <p>Experience our security features with live demonstrations</p>

          <div className="demo-tabs">
            {Object.entries(demos).map(([key, demo]) => (
              <button
                key={key}
                className={`demo-tab ${activeDemo === key ? 'active' : ''}`}
                onClick={() => setActiveDemo(key)}
              >
                <span className="demo-icon">{demo.icon}</span>
                {demo.title}
              </button>
            ))}
          </div>

          <div className="demo-content">
            <div className="demo-header">
              <h3>{demos[activeDemo].title}</h3>
              <p>{demos[activeDemo].description}</p>
            </div>

            <div className="demo-interface">
              {activeDemo === 'encryption' && (
                <div className="encryption-demo">
                  <div className="input-section">
                    <h4>Your Message (Plaintext)</h4>
                    <input
                      type="text"
                      value={demoText}
                      onChange={(e) => setDemoText(e.target.value)}
                      placeholder={demos[activeDemo].placeholder}
                      className="demo-input"
                    />
                  </div>
                  
                  <div className="arrow">🔒 Encrypting...</div>
                  
                  <div className="output-section">
                    <h4>Encrypted Data (What Others See)</h4>
                    <div className="encrypted-output">
                      {encryptedText || 'Type above to see encryption...'}
                    </div>
                  </div>
                </div>
              )}

              {activeDemo === 'disappearing' && (
                <div className="disappearing-demo">
                  <div className="message-timeline">
                    <div className="timeline-item active">
                      <span className="timeline-dot"></span>
                      <div className="timeline-content">
                        <strong>Message Sent</strong>
                        <p>Encrypted and delivered to recipients</p>
                      </div>
                    </div>
                    <div className="timeline-item active">
                      <span className="timeline-dot"></span>
                      <div className="timeline-content">
                        <strong>Message Read</strong>
                        <p>Recipients decrypt and read the message</p>
                      </div>
                    </div>
                    <div className="timeline-item countdown">
                      <span className="timeline-dot"></span>
                      <div className="timeline-content">
                        <strong>Auto-Delete Timer</strong>
                        <p>Message will be destroyed in 10 seconds...</p>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <span className="timeline-dot"></span>
                      <div className="timeline-content">
                        <strong>Complete Deletion</strong>
                        <p>No trace left anywhere</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemo === 'p2p' && (
                <div className="p2p-demo">
                  <div className="network-diagram">
                    <div className="peer peer-1">
                      <div className="peer-icon">👤</div>
                      <span>You</span>
                    </div>
                    
                    <div className="connection-lines">
                      <div className="direct-line">
                        <span className="connection-label">Direct P2P</span>
                      </div>
                      <div className="server-line">
                        <div className="server-node">
                          <div className="server-icon">🖥️</div>
                          <span>Server (Relay Only)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="peer peer-2">
                      <div className="peer-icon">👤</div>
                      <span>Friend</span>
                    </div>
                  </div>
                  
                  <div className="p2p-benefits">
                    <div className="benefit">
                      <span className="benefit-icon">⚡</span>
                      <span>Faster Communication</span>
                    </div>
                    <div className="benefit">
                      <span className="benefit-icon">🛡️</span>
                      <span>No Central Control</span>
                    </div>
                    <div className="benefit">
                      <span className="benefit-icon">🌐</span>
                      <span>Censorship Resistant</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Security Stats */}
      <section className="security-stats">
        <div className="container">
          <h2>Security by the Numbers</h2>
          <div className="stats-grid">
            {securityStats.map((stat, index) => (
              <div key={index} className="stat-card">
                <span className="stat-icon">{stat.icon}</span>
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Threat Protection */}
      <section className="threat-protection">
        <div className="container">
          <h2>Protection Against Real Threats</h2>
          <p>See how our security measures protect you from common threats</p>
          
          <div className="threats-grid">
            {threatProtection.map((item, index) => (
              <div key={index} className="threat-card">
                <div className="threat-header">
                  <span className="threat-icon">{item.icon}</span>
                  <div>
                    <h3>{item.threat}</h3>
                    <span className={`status ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                <p className="threat-protection-text">{item.protection}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SecurityShowcase;
