import React, { useState, useEffect } from 'react';
import './RoomTimer.css';

const RoomTimer = ({ expiresAt, onExpired }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expiresAtDate = new Date(expiresAt);
      const timeDiff = expiresAtDate - now;

      if (timeDiff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        if (onExpired) {
          onExpired();
        }
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
  }, [expiresAt, onExpired]);

  return (
    <div className={`room-timer ${isExpired ? 'expired' : ''}`}>
      <span className="timer-icon">⏰</span>
      <span className="timer-text">
        {isExpired ? 'Room Expired' : `Expires in: ${timeLeft}`}
      </span>
    </div>
  );
};

export default RoomTimer;
