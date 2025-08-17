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

// In-memory storage (for development without MongoDB)
const tickets = new Map();
const payments = new Map();
const rooms = {};

// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret'
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
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret')
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
      connectedUsers: Object.values(rooms).reduce((total, room) => total + room.length, 0)
    },
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  
  let currentRoom = null;
  let currentUser = null;
  let isCreator = false;

  socket.on("join", ({ ticketId, username }, callback) => {
    const ticket = tickets.get(ticketId);
    
    if (!ticket) {
      return callback({ error: 'Invalid ticket' });
    }

    const now = new Date();
    if (now > ticket.expiresAt || ticket.status !== 'active') {
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
    if (!currentRoom || !currentUser) return;

    const relayPayload = {
      ...encryptedPayload,
      senderId: socket.id,
      relayTimestamp: Date.now()
    };
    
    socket.to(currentRoom).emit("encrypted-message", relayPayload);
    if (ack) ack("relayed");
  });

  socket.on("ephemeral-message", (encryptedPayload, ack) => {
    if (!currentRoom || !currentUser) return;

    const ephemeralPayload = {
      ...encryptedPayload,
      senderId: socket.id,
      ephemeral: true,
      relayTimestamp: Date.now()
    };
    
    socket.to(currentRoom).emit("ephemeral-message", ephemeralPayload);
    if (ack) ack("ephemeral-relayed");
  });

  socket.on("typing", ({ isTyping }) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit("typing", { username: currentUser, isTyping });
  });

  socket.on("share-encryption-salt", ({ roomId, salt, ticketId }) => {
    if (currentRoom !== roomId) return;
    socket.to(currentRoom).emit("encryption-salt", { salt, ticketId, roomId });
  });

  socket.on("p2p-signal", ({ targetPeer, roomId, message }) => {
    if (currentRoom !== roomId) return;
    const targetSocket = io.sockets.sockets.get(targetPeer);
    if (targetSocket) {
      targetSocket.emit("p2p-signal", { fromPeer: socket.id, roomId, message });
    }
  });

  socket.on("announce-peer", ({ roomId }) => {
    if (currentRoom !== roomId) return;
    socket.to(currentRoom).emit("peer-available", { peerId: socket.id, username: currentUser });
  });

  socket.on("delete-room", (callback) => {
    if (!isCreator || !currentRoom) {
      return callback({ error: 'Only room creator can delete the room' });
    }

    // Mark ticket as inactive
    for (const [ticketId, ticket] of tickets.entries()) {
      if (ticket.roomId === currentRoom) {
        ticket.status = 'deleted';
        break;
      }
    }

    io.to(currentRoom).emit("room-deleted", { 
      message: 'Room has been deleted by the creator',
      clearMessages: true 
    });
    
    if (rooms[currentRoom]) {
      rooms[currentRoom].forEach(user => {
        const userSocket = io.sockets.sockets.get(user.id);
        if (userSocket) {
          userSocket.leave(currentRoom);
          userSocket.emit("clear-room-data", { roomId: currentRoom });
        }
      });
      delete rooms[currentRoom];
    }

    callback({ success: true });
    console.log(`🗑️ Room ${currentRoom} deleted by ${currentUser}`);
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

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

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
