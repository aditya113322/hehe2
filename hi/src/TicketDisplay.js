import React, { useState, useEffect } from 'react';
import './TicketDisplay.css';

const TicketDisplay = ({ ticketInfo, onEnterRoom }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiresAt = new Date(ticketInfo.expiresAt);
      const timeDiff = expiresAt - now;

      if (timeDiff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [ticketInfo.expiresAt]);

  const copyTicketId = async () => {
    try {
      await navigator.clipboard.writeText(ticketInfo.ticketId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareTicket = () => {
    const shareText = `Join my chat room! Use this ticket: ${ticketInfo.ticketId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Chat Room Invitation',
        text: shareText,
      });
    } else {
      // Fallback to copying
      copyTicketId();
    }
  };

  return (
    <div className="ticket-display">
      <div className="ticket-card">
        <div className="ticket-header">
          <h2>🎫 Room Created Successfully!</h2>
          <div className="timer">
            <span className="timer-label">Expires in:</span>
            <span className={`timer-value ${timeLeft === 'Expired' ? 'expired' : ''}`}>
              {timeLeft}
            </span>
          </div>
        </div>

        <div className="ticket-info">
          <div className="info-row">
            <label>Ticket Number:</label>
            <div className="ticket-id-container">
              <span className="ticket-id">{ticketInfo.ticketId}</span>
              <button 
                onClick={copyTicketId} 
                className={`copy-button ${copied ? 'copied' : ''}`}
                title="Copy ticket number"
              >
                {copied ? '✓' : '📋'}
              </button>
            </div>
          </div>

          <div className="info-row">
            <label>Room ID:</label>
            <span className="room-id">{ticketInfo.roomId}</span>
          </div>

          <div className="info-row">
            <label>Creator:</label>
            <span className="creator-name">{ticketInfo.creatorName}</span>
          </div>

          <div className="info-row">
            <label>Created:</label>
            <span className="created-time">
              {new Date().toLocaleString()}
            </span>
          </div>
        </div>

        <div className="ticket-actions">
          <button 
            onClick={onEnterRoom} 
            className="enter-room-button"
            disabled={timeLeft === 'Expired'}
          >
            Enter Chat Room
          </button>
          
          <button 
            onClick={shareTicket} 
            className="share-button"
            disabled={timeLeft === 'Expired'}
          >
            Share Ticket
          </button>
        </div>

        <div className="instructions">
          <h3>How to invite others:</h3>
          <ol>
            <li>Copy the ticket number above</li>
            <li>Share it with friends you want to invite</li>
            <li>They can use this ticket to join your room</li>
            <li>Room will automatically expire in 1 hour</li>
          </ol>
        </div>

        <div className="warning">
          <p>⚠️ Keep this ticket number safe! Anyone with this number can join your room.</p>
        </div>
      </div>
    </div>
  );
};

export default TicketDisplay;
