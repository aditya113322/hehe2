const mongoose = require('mongoose');
require("dotenv").config();

// Debug environment variables
console.log('🔍 Environment Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✅ Set' : '❌ Not set');
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✅ Set' : '❌ Not set');

// MongoDB connection configuration
const connectDB = async () => {
  try {
    // MongoDB connection string - you can use local or cloud MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-chat-rooms';

    console.log('🔗 Attempting to connect to MongoDB...');
    console.log('📍 Connection URI:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    const options = {
      // Connection options for better performance and reliability
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      // Removed deprecated options: bufferMaxEntries and bufferCommands
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);

    // If MongoDB is not available, provide helpful instructions
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n📋 MongoDB Setup Instructions:');
      console.log('1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
      console.log('2. Start MongoDB service');
      console.log('3. Or use MongoDB Atlas (cloud): https://www.mongodb.com/atlas');
      console.log('4. Set MONGODB_URI environment variable');
      console.log('\n🔄 For now, the server will continue without MongoDB...\n');
      return null; // Don't exit, continue without MongoDB
    }

    process.exit(1);
  }
};

// Initialize database indexes and cleanup
const initializeDatabase = async () => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Skipping database initialization - MongoDB not connected');
      return;
    }

    // Import models to ensure indexes are created
    require('../models/Ticket');
    require('../models/Payment');
    require('../models/ChatRoom');

    console.log('📋 Database models loaded and indexes created');

    // Setup cleanup jobs only if connected
    setupCleanupJobs();

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
};

// Setup automatic cleanup jobs (only if MongoDB is connected)
const setupCleanupJobs = () => {
  // Check if MongoDB is connected before setting up cleanup jobs
  if (mongoose.connection.readyState !== 1) {
    console.log('⚠️ Skipping cleanup jobs - MongoDB not connected');
    return;
  }

  const Ticket = require('../models/Ticket');
  const Payment = require('../models/Payment');
  const ChatRoom = require('../models/ChatRoom');

  // Clean up expired tickets every 5 minutes
  setInterval(async () => {
    try {
      // Check connection before running cleanup
      if (mongoose.connection.readyState !== 1) {
        return; // Skip if not connected
      }

      const result = await Ticket.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired tickets`);
      }
    } catch (error) {
      console.error('❌ Ticket cleanup error:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Clean up old failed payments every 30 minutes
  setInterval(async () => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return; // Skip if not connected
      }

      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const result = await Payment.deleteMany({
        status: 'failed',
        createdAt: { $lt: cutoffTime }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} old failed payments`);
      }
    } catch (error) {
      console.error('❌ Payment cleanup error:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes

  // Clean up expired chat rooms every 10 minutes
  setInterval(async () => {
    try {
      if (mongoose.connection.readyState !== 1) {
        return; // Skip if not connected
      }

      const result = await ChatRoom.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false }
        ]
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired chat rooms`);
      }
    } catch (error) {
      console.error('❌ Chat room cleanup error:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes

  console.log('⏰ Automatic cleanup jobs scheduled');
};

// Health check function
const checkDatabaseHealth = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date() };
  }
};

module.exports = {
  connectDB,
  initializeDatabase,
  checkDatabaseHealth
};
