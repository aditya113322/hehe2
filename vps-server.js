require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Razorpay = require("razorpay");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// In-memory storage (for production without MongoDB)
const tickets = new Map();
const payments = new Map();
const rooms = {};

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🔒 Secure Chat Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      createOrder: '/api/create-order',
      verifyPayment: '/api/verify-payment',
      ticket: '/api/ticket/:ticketId'
    },
    timestamp: new Date().toISOString()
  });
});

// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_R5hxd295uoRa50',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'KVWgxt11gKwRuAw6eOZp95TW'
});

// Payment endpoints
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    
    const options = {
      amount: amount * 100,
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    const paymentId = uuidv4();
    payments.set(paymentId, {
      id: paymentId,
      razorpayOrderId: order.id,
      amount: amount,
      status: 'pending',
      createdAt: new Date()
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, paymentId, creatorName } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'KVWgxt11gKwRuAw6eOZp95TW')
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const ticketId = uuidv4();
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Update payment
      const payment = payments.get(paymentId);
      if (payment) {
        payment.status = 'completed';
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
      }

      // Create ticket
      tickets.set(ticketId, {
        id: ticketId,
        paymentId: paymentId,
        roomId: roomId,
        creatorName: creatorName,
        amount: 1,
        status: 'active',
        expiresAt: expiresAt,
        createdAt: new Date()
      });

      res.json({
        success: true,
        ticketId,
        roomId,
        expiresAt: expiresAt.toISOString()
      });
    } else {
      res.status(400).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

app.get('/api/ticket/:ticketId', (req, res) => {
  const { ticketId } = req.params;
  const ticket = tickets.get(ticketId);
  
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const now = new Date();
  if (now > ticket.expiresAt || ticket.status !== 'active') {
    return res.status(400).json({ error: 'Ticket expired or inactive' });
  }

  res.json({
    ticketId: ticket.id,
    roomId: ticket.roomId,
    creatorName: ticket.creatorName,
    expiresAt: ticket.expiresAt.toISOString(),
    isValid: true
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: { status: 'in-memory', message: 'Using in-memory storage' },
    mongoConnected: false,
    stats: {
      activeRooms: Object.keys(rooms).length,
      totalTickets: tickets.size,
      connectedUsers: Object.values(rooms).reduce((total, room) => total + (Array.isArray(room) ? room.length : 0), 0)
    },
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  console.log("🌐 Client origin:", socket.handshake.headers.origin);
  console.log("🔗 Transport:", socket.conn.transport.name);
  
  let currentRoom = null;
  let currentUser = null;
  let isCreator = false;

  socket.on("join", ({ ticketId, username }, callback) => {
    console.log(`👤 ${username} attempting to join with ticket ${ticketId}`);
    
    const ticket = tickets.get(ticketId);
    
    if (!ticket) {
      console.log(`❌ Invalid ticket: ${ticketId}`);
      return callback({ error: 'Invalid ticket' });
    }

    const now = new Date();
    if (now > ticket.expiresAt || ticket.status !== 'active') {
      console.log(`❌ Expired ticket: ${ticketId}`);
      return callback({ error: 'Ticket expired or room inactive' });
    }

    currentRoom = ticket.roomId;
    currentUser = username;
    isCreator = ticket.creatorName === username;

    socket.join(currentRoom);

    if (!rooms[currentRoom]) rooms[currentRoom] = [];
    rooms[currentRoom].push({ 
      id: socket.id, 
      username,
      isCreator 
    });

    // If there's already an encryption salt stored, send it to the new user
    if (!isCreator && rooms[currentRoom].roomData && rooms[currentRoom].roomData.encryptionSalt) {
      console.log(`📤 Sending stored encryption salt to new user ${username}`);
      socket.emit("encryption-salt", {
        salt: rooms[currentRoom].roomData.encryptionSalt,
        ticketId: rooms[currentRoom].roomData.encryptionTicketId,
        roomId: currentRoom
      });
    }

    io.to(currentRoom).emit("system", `${username} joined the room`);
    io.to(currentRoom).emit("users", rooms[currentRoom]);

    callback({ 
      success: true, 
      roomId: currentRoom,
      isCreator,
      expiresAt: ticket.expiresAt.toISOString()
    });

    console.log(`✅ ${username} joined ${currentRoom} with ticket ${ticketId}`);
  });

  // Handle encrypted messages
  socket.on("encrypted-message", (encryptedPayload, ack) => {
    console.log(`📨 Received encrypted message from ${currentUser} in room ${currentRoom}`);
    
    if (!currentRoom || !currentUser) {
      console.log('❌ No room or user, rejecting message');
      return;
    }

    const relayPayload = {
      ...encryptedPayload,
      senderId: socket.id,
      relayTimestamp: Date.now()
    };
    
    console.log(`📤 Relaying encrypted message to room ${currentRoom}`);
    socket.to(currentRoom).emit("encrypted-message", relayPayload);
    
    if (ack) ack("relayed");
    console.log(`✅ Message relayed successfully`);
  });

  socket.on("ephemeral-message", (encryptedPayload, ack) => {
    console.log(`🔥 Received ephemeral message from ${currentUser} in room ${currentRoom}`);
    
    if (!currentRoom || !currentUser) {
      console.log('❌ No room or user, rejecting ephemeral message');
      return;
    }

    const ephemeralPayload = {
      ...encryptedPayload,
      senderId: socket.id,
      ephemeral: true,
      relayTimestamp: Date.now()
    };
    
    console.log(`📤 Relaying ephemeral message to room ${currentRoom}`);
    socket.to(currentRoom).emit("ephemeral-message", ephemeralPayload);

    if (ack) ack("ephemeral-relayed");
    console.log(`✅ Ephemeral message relayed successfully`);
  });

  socket.on("typing", ({ isTyping }) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit("typing", { username: currentUser, isTyping });
  });

  socket.on("share-encryption-salt", ({ roomId, salt, ticketId }) => {
    console.log(`🔑 ${currentUser} sharing encryption salt for room ${roomId}`);
    
    if (currentRoom !== roomId) {
      console.log('❌ Room mismatch, not sharing salt');
      return;
    }

    console.log(`📤 Broadcasting encryption salt to room ${currentRoom}`);
    
    // Store the salt for this room (for late joiners)
    if (!rooms[currentRoom]) rooms[currentRoom] = [];
    if (!rooms[currentRoom].roomData) rooms[currentRoom].roomData = {};
    rooms[currentRoom].roomData.encryptionSalt = salt;
    rooms[currentRoom].roomData.encryptionTicketId = ticketId;
    
    console.log(`💾 Stored encryption salt for room ${currentRoom}`);

    // Broadcast salt to other users in the room (except sender)
    socket.to(currentRoom).emit("encryption-salt", {
      salt: salt,
      ticketId: ticketId,
      roomId: roomId
    });
    
    console.log(`✅ Encryption salt shared successfully`);
  });

  // Handle requests for encryption salt from late joiners
  socket.on("request-encryption-salt", ({ roomId, ticketId }) => {
    console.log(`📥 ${currentUser} requesting encryption salt for room ${roomId}`);
    
    if (currentRoom !== roomId) {
      console.log('❌ Room mismatch, not providing salt');
      return;
    }

    // Check if we have stored salt for this room
    if (rooms[currentRoom] && rooms[currentRoom].roomData && rooms[currentRoom].roomData.encryptionSalt) {
      console.log(`📤 Providing stored encryption salt to ${currentUser}`);
      
      socket.emit("encryption-salt", {
        salt: rooms[currentRoom].roomData.encryptionSalt,
        ticketId: rooms[currentRoom].roomData.encryptionTicketId,
        roomId: roomId
      });
      
      console.log(`✅ Encryption salt provided to late joiner`);
    } else {
      console.log(`⚠️ No encryption salt available for room ${roomId}`);
      console.log(`Room data:`, rooms[currentRoom] ? 'exists' : 'missing');
      
      // Request salt from room creator (first user in room)
      if (rooms[currentRoom] && rooms[currentRoom].length > 0) {
        const creatorSocket = rooms[currentRoom].find(user => user.isCreator);
        if (creatorSocket) {
          console.log(`📞 Requesting salt from room creator: ${creatorSocket.username}`);
          io.to(creatorSocket.id).emit("provide-encryption-salt", {
            roomId: roomId,
            requesterId: socket.id
          });
        } else {
          console.log(`❌ No room creator found in room`);
        }
      } else {
        console.log(`❌ No users in room or room doesn't exist`);
      }
    }
  });

  socket.on("disconnect", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter((u) => u.id !== socket.id);
      io.to(currentRoom).emit("users", rooms[currentRoom]);
      io.to(currentRoom).emit("system", `${currentUser} left the room`);
    }
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Cleanup expired tickets every 5 minutes
setInterval(() => {
  const now = new Date();
  for (const [ticketId, ticket] of tickets.entries()) {
    if (now > ticket.expiresAt) {
      tickets.delete(ticketId);
      console.log(`🧹 Cleaned up expired ticket: ${ticketId}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 5000;
const HOST = process.env.NODE_ENV === '0.0.0.0';

// Add error handling for production
io.engine.on("connection_error", (err) => {
  console.log("❌ Socket.IO connection error:", err.req);
  console.log("❌ Error code:", err.code);
  console.log("❌ Error message:", err.message);
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`⚠️ Using in-memory storage - data will be lost on restart`);
  console.log(`🔗 CORS enabled for all origins`);
});
