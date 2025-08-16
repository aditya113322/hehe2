# 🔒 Secure Decentralized Chat Rooms

A privacy-focused, end-to-end encrypted chat application with automatic message deletion and decentralized architecture. No authority can see your conversations - messages disappear completely when rooms expire.

## 🛡️ Security Features

### **End-to-End Encryption**
- **AES-256 encryption** for all messages
- **Client-side encryption/decryption** only
- **PBKDF2 key derivation** with 10,000 iterations
- **Unique room keys** generated from ticket IDs
- **Message integrity verification** with SHA-256 hashes

### **Zero Server Storage**
- **No message persistence** on server
- **Real-time relay only** - server never stores or logs messages
- **Automatic key clearing** when rooms expire
- **Memory-only storage** on client side

### **Ephemeral Messaging**
- **Disappearing messages** (10-second auto-delete)
- **Temporary encryption keys** for ephemeral messages
- **Visual countdown** for message expiration
- **Automatic cleanup** from memory

### **Decentralized Architecture**
- **Peer-to-peer backup** communication via WebRTC
- **Direct client connections** bypass server for messages
- **Distributed message relay** among participants
- **Fallback communication** if server goes down

## 💰 Payment & Access Control

### **Razorpay Integration**
- **₹1000 payment** to create private room
- **1-hour room duration** with automatic expiration
- **Unique ticket numbers** for room access
- **Creator privileges** (delete room anytime)

### **Ticket-Based Access**
- **Share ticket numbers** to invite others
- **Secure ticket validation** before room entry
- **No unauthorized access** possible
- **Automatic ticket expiration**

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client A      │    │   Server        │    │   Client B      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Encryption  │ │    │ │ Relay Only  │ │    │ │ Encryption  │ │
│ │ AES-256     │ │◄──►│ │ No Storage  │ │◄──►│ │ AES-256     │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ P2P WebRTC  │ │◄──────────────────────────►│ │ P2P WebRTC  │ │
│ │ Direct Comm │ │    │ │ Signaling   │ │    │ │ Direct Comm │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### **1. Setup Server**
```bash
cd server
npm install
npm start
```

### **2. Setup Frontend**
```bash
cd hi
npm install
npm start
```

### **3. Configure Razorpay**
Update these files with your Razorpay credentials:
- `server/index.js`: Replace `your_razorpay_key_secret`
- `hi/src/PaymentForm.js`: Replace `rzp_test_your_key_id`

## 📱 Usage Flow

### **Creating a Room**
1. Click "Create Room (₹1000)"
2. Enter your name
3. Complete Razorpay payment
4. Get unique ticket number
5. Share ticket with friends

### **Joining a Room**
1. Click "Join with Ticket"
2. Enter ticket number and your name
3. Access granted if ticket is valid
4. Start secure messaging

### **Secure Messaging**
- All messages are **end-to-end encrypted**
- Toggle **"Disappearing Messages"** for 10s auto-delete
- **🔒 icon** shows encryption status
- **🔥 icon** shows ephemeral messages

## 🔧 Technical Implementation

### **Frontend (React)**
- `encryption.js` - AES-256 encryption utilities
- `p2p.js` - WebRTC peer-to-peer communication
- `PaymentForm.js` - Razorpay integration
- `TicketDisplay.js` - Ticket management
- `RoomTimer.js` - Expiration countdown

### **Backend (Node.js)**
- SQLite database for tickets/payments only
- Socket.IO for real-time relay
- Razorpay payment verification
- WebRTC signaling server
- Automatic room cleanup

### **Security Measures**
- **No plaintext storage** anywhere
- **Client-side key generation** only
- **Automatic memory clearing** on exit
- **Message integrity verification**
- **Secure key exchange** via tickets

## 🛡️ Privacy Guarantees

### **What We DON'T Store**
- ❌ Message content (encrypted or plaintext)
- ❌ Encryption keys
- ❌ Chat history
- ❌ User conversations
- ❌ Room content after expiration

### **What We DO Store**
- ✅ Payment records (for billing)
- ✅ Ticket metadata (for access control)
- ✅ Room expiration times (for cleanup)
- ✅ User counts (for room management)

## 🔒 Security Best Practices

### **For Users**
- Don't share ticket numbers publicly
- Use ephemeral mode for sensitive messages
- Verify encryption status (🔒 icon)
- Leave room when done chatting

### **For Developers**
- Never log decrypted messages
- Clear keys immediately on exit
- Use secure random number generation
- Implement proper key derivation

## 🌐 Decentralization Benefits

### **Censorship Resistance**
- P2P connections bypass server control
- Direct peer communication
- No central point of failure
- Distributed message routing

### **Privacy Protection**
- Server cannot read messages
- No message interception possible
- Client-side encryption only
- Automatic data destruction

### **Reliability**
- Multiple communication paths
- Fallback to P2P if server fails
- Redundant message delivery
- Self-healing network

## 📋 Environment Variables

Create `.env` file in server directory:
```
RAZORPAY_KEY_ID=your_actual_key_id
RAZORPAY_KEY_SECRET=your_actual_key_secret
```

## 🔧 Development

### **Testing Encryption**
```javascript
import { secureMessaging } from './src/encryption';

// Test encryption
const encrypted = secureMessaging.encryptMessage("Hello", "user1");
const decrypted = secureMessaging.decryptMessage(encrypted.encryptedData, encrypted.iv);
console.log(decrypted.text); // "Hello"
```

### **Testing P2P**
```javascript
import { p2pMessaging } from './src/p2p';

// Initialize P2P
await p2pMessaging.initialize("room123", (message) => {
  console.log("P2P message received:", message);
});
```

## 🚨 Important Security Notes

1. **Never store encryption keys** in localStorage or any persistent storage
2. **Always verify message integrity** before displaying
3. **Clear all data** when leaving rooms
4. **Use HTTPS** in production
5. **Validate all inputs** on both client and server

## 📄 License

This project implements privacy-by-design principles and follows zero-knowledge architecture patterns for maximum security and user privacy.

---

**🔐 Your conversations are truly private - even we can't see them!**
