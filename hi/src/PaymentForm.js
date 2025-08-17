import React, { useState } from 'react';
import './PaymentForm.css';

const PaymentForm = ({ onPaymentSuccess, onCancel }) => {
  const [creatorName, setCreatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!creatorName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order
      const orderResponse = await fetch('http://31.97.235.37:5000/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 1, // ₹1
          currency: 'INR'
        }),
      });

      const orderData = await orderResponse.json();
      
      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Configure Razorpay options
      const options = {
        key: 'rzp_live_R5hxd295uoRa50', // Your Razorpay key ID
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Chat Room Access',
        description: '1 Hour Chat Room Access',
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('http://31.97.235.37:5000/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                paymentId: orderData.paymentId,
                creatorName: creatorName.trim()
              }),
            });

            const verifyData = await verifyResponse.json();
            
            if (verifyResponse.ok && verifyData.success) {
              onPaymentSuccess({
                ticketId: verifyData.ticketId,
                roomId: verifyData.roomId,
                creatorName: creatorName.trim(),
                expiresAt: verifyData.expiresAt
              });
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            setError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: creatorName,
        },
        theme: {
          color: '#8B4513'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-form">
      <div className="payment-card">
        <h2>Create Chat Room</h2>
        <p className="payment-description">
          Pay ₹1 to create a private chat room that lasts for 1 hour.
          You can invite others using the ticket number.
        </p>
        
        <div className="form-group">
          <label htmlFor="creatorName">Your Name:</label>
          <input
            id="creatorName"
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Enter your name"
            disabled={loading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="payment-actions">
          <button 
            onClick={handlePayment} 
            disabled={loading || !creatorName.trim()}
            className="pay-button"
          >
            {loading ? 'Processing...' : 'Pay ₹1 & Create Room'}
          </button>
          
          <button 
            onClick={onCancel} 
            disabled={loading}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>

        <div className="payment-info">
          <h3>What you get:</h3>
          <ul>
            <li>Private chat room for 1 hour</li>
            <li>Unique ticket number to share with friends</li>
            <li>Room creator privileges (delete room anytime)</li>
            <li>Real-time messaging with typing indicators</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
