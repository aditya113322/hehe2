<<<<<<< HEAD
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import Razorpay from "razorpay";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
=======
require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Razorpay = require("razorpay");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

// MongoDB connection and models
const { connectDB, initializeDatabase, checkDatabaseHealth } = require("./config/database");
const Ticket = require("./models/Ticket");
const Payment = require("./models/Payment");
const ChatRoom = require("./models/ChatRoom");

const app = express();
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Initialize MongoDB connection
const initializeApp = async () => {
  try {
    const connection = await connectDB();
    if (connection) {
      await initializeDatabase();
      console.log('🚀 Application initialized with MongoDB');
    } else {
      console.log('⚠️ Application started without MongoDB - some features may be limited');
    }
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    console.log('⚠️ Continuing without MongoDB...');
  }
};

// Initialize the application
initializeApp();

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
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Store payment record in MongoDB
    const paymentId = uuidv4();
    const payment = new Payment({
      _id: paymentId,
      razorpayOrderId: order.id,
      amount: amount,
      currency: currency,
      status: 'pending'
    });

    await payment.save();

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

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret')
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Payment verified successfully
      const ticketId = uuidv4();
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Update payment status in MongoDB
      await Payment.findByIdAndUpdate(paymentId, {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'completed',
        ticketId: ticketId,
        'metadata.creatorName': creatorName
      });

      // Create ticket in MongoDB
      const ticket = new Ticket({
        _id: ticketId,
        paymentId: paymentId,
        roomId: roomId,
        creatorName: creatorName,
        amount: 1,
        expiresAt: expiresAt
      });
      await ticket.save();

      // Create chat room in MongoDB
      const chatRoom = new ChatRoom({
        _id: roomId,
        ticketId: ticketId,
        creatorName: creatorName,
        expiresAt: expiresAt
      });
      await chatRoom.save();

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

app.get('/api/ticket/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Find ticket with associated chat room
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Find associated chat room
    const chatRoom = await ChatRoom.findById(ticket.roomId);
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if ticket is valid
    if (!ticket.isValid() || !chatRoom.isActive) {
      return res.status(400).json({ error: 'Ticket expired or inactive' });
    }

    res.json({
      ticketId: ticket._id,
      roomId: ticket.roomId,
      creatorName: ticket.creatorName,
      expiresAt: ticket.expiresAt.toISOString(),
      isValid: true
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/room/:roomId/stats', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Find chat room with associated ticket
    const chatRoom = await ChatRoom.findById(roomId).populate('ticketId');
    if (!chatRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const now = new Date();
    const timeLeft = Math.max(0, chatRoom.expiresAt - now);

    res.json({
      roomId: chatRoom._id,
      creatorName: chatRoom.creatorName,
      createdAt: chatRoom.createdAt,
      expiresAt: chatRoom.expiresAt,
      timeLeft: timeLeft,
      isActive: chatRoom.isActive && timeLeft > 0,
      currentUsers: rooms[roomId] ? rooms[roomId].length : 0,
      stats: chatRoom.stats,
      participants: chatRoom.currentParticipants
    });
  } catch (error) {
    console.error('Error fetching room stats:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const isMongoConnected = mongoose.connection.readyState === 1;

    let dbHealth, activeRooms = 0, totalTickets = 0;

    if (isMongoConnected) {
      dbHealth = await checkDatabaseHealth();
      activeRooms = await ChatRoom.countDocuments({ isActive: true });
      totalTickets = await Ticket.countDocuments({ status: 'active' });
    } else {
      dbHealth = { status: 'disconnected', message: 'MongoDB not connected' };
    }

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      mongoConnected: isMongoConnected,
      stats: {
        activeRooms,
        totalTickets,
        connectedUsers: Object.values(rooms).reduce((total, room) => total + room.length, 0)
      },
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
>>>>>>> d00a03ac40041cad889a30aa27b8e5dd7b6c4617
});

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Memory storage
const tickets = {}; // ticketId => { creator, expiresAt, status, roomId }
const rooms = {};   // roomId => [ {id, username} ]

// Step 1: Create Razorpay order
app.post("/create-ticket", async (req, res) => {
  try {
    const { creatorName } = req.body;
    const order = await razorpay.orders.create({
      amount: 100000, // ₹1000
      currency: "INR",
      receipt: uuidv4(),
    });
    res.json({ order, creatorName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Confirm payment and issue ticket
app.post("/confirm-ticket", (req, res) => {
  const { creatorName } = req.body;
  const ticketId = "TCK-" + Math.floor(100000 + Math.random() * 900000);
  const roomId = uuidv4();

  tickets[ticketId] = {
    creator: creatorName,
    expiresAt: Date.now() + 60 * 60 * 1000,
    status: "active",
    roomId,
  };

  // Auto-expire after 1 hour
  setTimeout(() => {
    if (tickets[ticketId]?.status === "active") {
      tickets[ticketId].status = "expired";
      io.to(roomId).emit("system", "Ticket expired. Chat closed.");
      io.to(roomId).disconnectSockets(true);
    }
  }, 60 * 60 * 1000);

  res.json({ ticketId, roomId });
});

// Step 3: Delete ticket (creator only)
app.post("/delete-ticket", (req, res) => {
  const { ticketId, username } = req.body;
  const ticket = tickets[ticketId];
  if (ticket && ticket.creator === username) {
    ticket.status = "deleted";
    io.to(ticket.roomId).emit("system", "Ticket deleted by creator.");
    io.to(ticket.roomId).disconnectSockets(true);
    return res.json({ success: true });
  }
  res.status(403).json({ error: "Not allowed" });
});

// WebSocket events
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  console.log("🌐 Client origin:", socket.handshake.headers.origin);
  console.log("🔗 Transport:", socket.conn.transport.name);

<<<<<<< HEAD
  socket.on("join", ({ ticketId, username }) => {
    const ticket = tickets[ticketId];
    if (!ticket || ticket.status !== "active" || Date.now() > ticket.expiresAt) {
      socket.emit("system", "Invalid or expired ticket.");
      socket.disconnect();
      return;
    }

    socket.join(ticket.roomId);
    if (!rooms[ticket.roomId]) rooms[ticket.roomId] = [];
    rooms[ticket.roomId].push({ id: socket.id, username });

    io.to(ticket.roomId).emit("system", `${username} joined chat`);
    io.to(ticket.roomId).emit("users", rooms[ticket.roomId]);
  });

  socket.on("message", ({ ticketId, username, text }) => {
    const ticket = tickets[ticketId];
    if (!ticket) return;
    io.to(ticket.roomId).emit("message", { id: Date.now(), username, text });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((u) => u.id !== socket.id);
=======
  let currentRoom = null;
  let currentUser = null;
  let isCreator = false;

  // Join room with ticket validation
  socket.on("join", async ({ ticketId, username }, callback) => {
    try {
      // Validate ticket
      const ticket = await Ticket.findValidTicket(ticketId);
      if (!ticket) {
        return callback({ error: 'Invalid or expired ticket' });
      }

      // Find associated chat room
      const chatRoom = await ChatRoom.findById(ticket.roomId);
      if (!chatRoom || !chatRoom.isActive) {
        return callback({ error: 'Chat room not found or inactive' });
      }

      // Valid ticket, join room
      currentRoom = ticket.roomId;
      currentUser = username;
      isCreator = ticket.creatorName === username;

      socket.join(currentRoom);

      // Update room participants in MongoDB
      await chatRoom.addParticipant(username, socket.id);

      // Update in-memory rooms for real-time features
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
    } catch (error) {
      console.error('Join room error:', error);
      callback({ error: 'Failed to join room' });
    }
  });

  // Handle encrypted messages (no server-side storage)
  socket.on("encrypted-message", (encryptedPayload, ack) => {
    console.log(`📨 Received encrypted message from ${currentUser} in room ${currentRoom}`);

    if (!currentRoom || !currentUser) {
      console.log('❌ No room or user, rejecting message');
      return;
    }

    // Server only relays encrypted messages without decrypting or storing
    const relayPayload = {
      ...encryptedPayload,
      senderId: socket.id,
      relayTimestamp: Date.now()
    };

    console.log(`📤 Relaying encrypted message to room ${currentRoom}`);

    // Broadcast to all users in room except sender
    socket.to(currentRoom).emit("encrypted-message", relayPayload);

    if (ack) ack("relayed");
    console.log(`✅ Message relayed successfully`);
  });

  // Handle ephemeral encrypted messages (disappear after reading)
  socket.on("ephemeral-message", (encryptedPayload, ack) => {
    console.log(`🔥 Received ephemeral message from ${currentUser} in room ${currentRoom}`);

    if (!currentRoom || !currentUser) {
      console.log('❌ No room or user, rejecting ephemeral message');
      return;
    }

    // Relay ephemeral message with auto-delete flag
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

  // Delete room (only creator can delete)
  socket.on("delete-room", async (callback) => {
    try {
      if (!isCreator || !currentRoom) {
        return callback({ error: 'Only room creator can delete the room' });
      }

      // Mark room as inactive in MongoDB
      const chatRoom = await ChatRoom.findById(currentRoom);
      if (!chatRoom) {
        return callback({ error: 'Room not found' });
      }

      await chatRoom.deactivate();

      // Notify all users in the room and trigger message cleanup
      io.to(currentRoom).emit("room-deleted", {
        message: 'Room has been deleted by the creator',
        clearMessages: true
      });

      // Disconnect all users from the room and clear any cached data
      if (rooms[currentRoom]) {
        rooms[currentRoom].forEach(user => {
          const userSocket = io.sockets.sockets.get(user.id);
          if (userSocket) {
            userSocket.leave(currentRoom);
            // Instruct client to clear all encryption keys and messages
            userSocket.emit("clear-room-data", { roomId: currentRoom });
          }
        });
        delete rooms[currentRoom];
      }

      callback({ success: true });
      console.log(`🗑️ Room ${currentRoom} deleted by ${currentUser}`);
    } catch (error) {
      console.error('Delete room error:', error);
      callback({ error: 'Failed to delete room' });
    }
  });

  // Typing indicator
  socket.on("typing", (isTyping) => {
    if (currentRoom && currentUser) {
      socket.to(currentRoom).emit("typing", {
        username: currentUser,
        isTyping,
      });
    }
  });

  // Share encryption salt with room participants
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

    console.log(`✅ Encryption salt shared and stored for room`);
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

  // P2P signaling for decentralized communication
  socket.on("p2p-signal", ({ targetPeer, roomId, message }) => {
    if (currentRoom !== roomId) return;

    // Forward signaling message to target peer
    const targetSocket = io.sockets.sockets.get(targetPeer);
    if (targetSocket) {
      targetSocket.emit("p2p-signal", {
        fromPeer: socket.id,
        roomId: roomId,
        message: message
      });
    }
  });

  // Announce peer availability for P2P connections
  socket.on("announce-peer", ({ roomId }) => {
    if (currentRoom !== roomId) return;

    // Notify other peers about this peer's availability
    socket.to(currentRoom).emit("peer-available", {
      peerId: socket.id,
      username: currentUser
    });
  });

  // Get room info
  socket.on("get-room-info", (callback) => {
    if (!currentRoom) {
      return callback({ error: 'Not in any room' });
    }

    db.get(
      'SELECT expires_at FROM chat_rooms WHERE id = ? AND is_active = 1',
      [currentRoom],
      (err, room) => {
        if (err || !room) {
          return callback({ error: 'Room not found' });
        }

        callback({
          roomId: currentRoom,
          expiresAt: room.expires_at,
          isCreator,
          userCount: rooms[currentRoom] ? rooms[currentRoom].length : 0
        });
      }
    );
  });

  // Disconnect
  socket.on("disconnect", async () => {
    try {
      if (currentRoom && rooms[currentRoom]) {
        // Update MongoDB
        const chatRoom = await ChatRoom.findById(currentRoom);
        if (chatRoom) {
          await chatRoom.markParticipantOffline(socket.id);
        }

        // Update in-memory rooms
        rooms[currentRoom] = rooms[currentRoom].filter((u) => u.id !== socket.id);
        io.to(currentRoom).emit("users", rooms[currentRoom]);
        io.to(currentRoom).emit("system", `${currentUser} left the room`);
      }
      console.log("❌ Client disconnected:", socket.id);
    } catch (error) {
      console.error('Disconnect error:', error);
>>>>>>> d00a03ac40041cad889a30aa27b8e5dd7b6c4617
    }
  });
});

<<<<<<< HEAD
httpServer.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 5000);
=======
// Setup automatic room cleanup only if MongoDB is connected
const setupRoomCleanup = () => {
  const mongoose = require('mongoose');

  // Only setup cleanup if MongoDB is connected
  if (mongoose.connection.readyState === 1) {
    console.log('⏰ Setting up automatic room cleanup...');

    setInterval(async () => {
      try {
        // Double-check connection before running cleanup
        if (mongoose.connection.readyState !== 1) {
          return;
        }

        const expiredRooms = await ChatRoom.findExpiredRooms();

        if (expiredRooms.length === 0) return;

        for (const room of expiredRooms) {
          // Mark room as inactive
          await room.deactivate();

          // Notify users and trigger complete data cleanup
          io.to(room._id).emit("room-expired", {
            message: 'Room has expired',
            clearMessages: true
          });

          if (rooms[room._id]) {
            rooms[room._id].forEach(user => {
              const userSocket = io.sockets.sockets.get(user.id);
              if (userSocket) {
                userSocket.leave(room._id);
                // Force clear all client-side data
                userSocket.emit("clear-room-data", { roomId: room._id });
              }
            });
            delete rooms[room._id];
          }

          console.log(`⏰ Room ${room._id} expired and cleaned up`);
        }
      } catch (error) {
        console.error('❌ Room cleanup error:', error);
      }
    }, 60000); // Check every minute
  } else {
    console.log('⚠️ Skipping room cleanup setup - MongoDB not connected');
  }
};

// Setup cleanup after a delay to ensure MongoDB connection is established
setTimeout(setupRoomCleanup, 5000);

const PORT = process.env.PORT || 5000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// Add error handling for production
io.engine.on("connection_error", (err) => {
  console.log("❌ Socket.IO connection error:", err.req);
  console.log("❌ Error code:", err.code);
  console.log("❌ Error message:", err.message);
  console.log("❌ Error context:", err.context);
});

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for all origins`);
  console.log(`📍 Health check: http://${HOST}:${PORT}/api/health`);
});
app.get('/', (req, res) => {
  res.send('✅ Backend is up and running!');
>>>>>>> d00a03ac40041cad889a30aa27b8e5dd7b6c4617
});
