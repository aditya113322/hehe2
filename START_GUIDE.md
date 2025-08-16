# 🚀 Quick Start Guide

## Prerequisites
Make sure you have Node.js and npm installed on your system.

## Starting the Application

### 1. Start the Backend Server
```bash
cd server
npm install
npm start
```
The server will start on **https://hehe2-g9yy.onrender.com**

### 2. Start the Frontend (React App)
```bash
cd hi
npm install
npm start
```
The React app will start on **http://localhost:3000**

## 🔧 Configuration

### Razorpay Setup
Before using the payment features, update these files with your Razorpay credentials:

1. **Server Configuration** (`server/index.js`):
   ```javascript
   // Replace these with your actual Razorpay credentials
   key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
   key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret'
   ```

2. **Frontend Configuration** (`hi/src/PaymentForm.js`):
   ```javascript
   // Replace with your Razorpay key ID
   key: 'rzp_test_your_key_id',
   ```

3. **Environment Variables** (Create `server/.env`):
   ```
   RAZORPAY_KEY_ID=your_actual_key_id
   RAZORPAY_KEY_SECRET=your_actual_key_secret
   ```

## 🌐 Accessing the Application

1. **Homepage**: http://localhost:3000
   - Beautiful landing page explaining security features
   - Interactive security demonstrations
   - Clear call-to-action buttons

2. **Backend API**: https://hehe2-g9yy.onrender.com
   - Payment endpoints
   - Ticket validation
   - Socket.IO server for real-time chat

## 🔒 Features Available

### Security Features
- ✅ **End-to-End Encryption** (AES-256)
- ✅ **Auto-Disappearing Messages** (10s or 1hr)
- ✅ **Decentralized P2P** Communication
- ✅ **Zero Server Storage** of messages
- ✅ **Automatic Room Cleanup**

### Payment & Access
- ✅ **Razorpay Integration** (₹1000 payment)
- ✅ **Ticket-Based Access** Control
- ✅ **1-Hour Room Duration**
- ✅ **Creator Privileges**

### Chat Features
- ✅ **Real-time Messaging**
- ✅ **Typing Indicators**
- ✅ **User Management**
- ✅ **Room Timer**
- ✅ **Ephemeral Mode**

## 🎯 User Flow

1. **Visit Homepage** → See security features and benefits
2. **Create Room** → Pay ₹1000 via Razorpay
3. **Get Ticket** → Unique room access number
4. **Share Ticket** → Invite friends to join
5. **Chat Securely** → End-to-end encrypted messages
6. **Auto-Delete** → Everything disappears after 1 hour

## 🛠️ Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill processes on ports 3000 and 5000
   npx kill-port 3000
   npx kill-port 5000
   ```

2. **Dependencies Missing**
   ```bash
   # Reinstall dependencies
   cd server && npm install
   cd ../hi && npm install
   ```

3. **Database Issues**
   ```bash
   # Delete and recreate database
   rm server/chat_rooms.db
   # Restart server to recreate tables
   ```

4. **Razorpay Errors**
   - Check your API keys are correct
   - Ensure test mode is enabled
   - Verify webhook URLs if using production

### Development Mode

For development with auto-reload:
```bash
# Backend with nodemon
cd server
npm install -g nodemon
nodemon index.js

# Frontend (already has hot reload)
cd hi
npm start
```

## 📱 Testing the Application

### Test Payment Flow
1. Use Razorpay test credentials
2. Test card: 4111 1111 1111 1111
3. Any future expiry date
4. Any CVV

### Test Security Features
1. Create a room and get ticket
2. Open multiple browser tabs
3. Join with same ticket
4. Send encrypted messages
5. Try ephemeral mode
6. Watch auto-deletion

### Test P2P Features
1. Open browser developer tools
2. Check console for P2P connection logs
3. Disconnect internet briefly
4. Verify P2P fallback works

## 🔐 Security Notes

- **Never commit** real Razorpay credentials to version control
- **Use environment variables** for sensitive configuration
- **Test thoroughly** before production deployment
- **Monitor logs** for any security issues
- **Keep dependencies updated** for security patches

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Check server logs for backend issues
3. Verify all dependencies are installed
4. Ensure ports 3000 and 5000 are available
5. Test with different browsers

---

**🎉 Your secure, decentralized chat application is ready to use!**

**🔒 Remember: Even you as the developer cannot read the encrypted messages!**
