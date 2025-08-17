import React, { useState } from 'react';
import './JoinRoom.css';

const JoinRoom = ({ onJoinSuccess, onCancel }) => {
  const [ticketId, setTicketId] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    
    if (!ticketId.trim() || !username.trim()) {
      setError('Please enter both ticket number and your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate ticket
      const response = await fetch(`http://31.97.235.37:5000/api/ticket/${ticketId.trim()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid ticket');
      }

      if (data.isValid) {
        onJoinSuccess({
          ticketId: ticketId.trim(),
          username: username.trim(),
          roomId: data.roomId,
          creatorName: data.creatorName,
          expiresAt: data.expiresAt
        });
      } else {
        throw new Error('Ticket is not valid or has expired');
      }
    } catch (error) {
      console.error('Join error:', error);
      setError(error.message || 'Failed to join room. Please check your ticket number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-room">
      <div className="join-card">
        <h2>Join Chat Room</h2>
        <p className="join-description">
          Enter the ticket number shared with you to join the chat room.
        </p>
        
        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label htmlFor="ticketId">Ticket Number:</label>
            <input
              id="ticketId"
              type="text"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Enter ticket number"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Your Name:</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="join-actions">
            <button 
              type="submit"
              disabled={loading || !ticketId.trim() || !username.trim()}
              className="join-button"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            
            <button 
              type="button"
              onClick={onCancel} 
              disabled={loading}
              className="cancel-button"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="join-info">
          <h3>Need a ticket?</h3>
          <p>Ask the room creator to share their ticket number with you, or create your own room by paying ₹1000.</p>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
