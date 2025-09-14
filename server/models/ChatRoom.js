const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  ticketId: {
    type: String,
    ref: 'Ticket',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic deletion
  },
  participants: [{
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    socketId: String,
    isOnline: {
      type: Boolean,
      default: true
    }
  }],
  settings: {
    maxParticipants: {
      type: Number,
      default: 50
    },
    allowEphemeralMessages: {
      type: Boolean,
      default: true
    },
    autoDeleteAfterExpiry: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalParticipants: {
      type: Number,
      default: 0
    },
    peakConcurrentUsers: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: 'chatrooms'
});

// Indexes for efficient queries
chatRoomSchema.index({ ticketId: 1 });
chatRoomSchema.index({ isActive: 1 });
chatRoomSchema.index({ expiresAt: 1 });
chatRoomSchema.index({ creatorName: 1 });

// Virtual for checking if room is expired
chatRoomSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for current participant count
chatRoomSchema.virtual('currentParticipants').get(function() {
  return this.participants.filter(p => p.isOnline).length;
});

// Method to add participant
chatRoomSchema.methods.addParticipant = function(username, socketId) {
  // Remove existing participant with same username or socketId
  this.participants = this.participants.filter(p => 
    p.username !== username && p.socketId !== socketId
  );
  
  // Add new participant
  this.participants.push({
    username,
    socketId,
    joinedAt: new Date(),
    isOnline: true
  });
  
  // Update stats
  this.stats.totalParticipants = Math.max(this.stats.totalParticipants, this.participants.length);
  this.stats.peakConcurrentUsers = Math.max(this.stats.peakConcurrentUsers, this.currentParticipants);
  
  return this.save();
};

// Method to remove participant
chatRoomSchema.methods.removeParticipant = function(socketId) {
  this.participants = this.participants.filter(p => p.socketId !== socketId);
  return this.save();
};

// Method to mark participant as offline
chatRoomSchema.methods.markParticipantOffline = function(socketId) {
  const participant = this.participants.find(p => p.socketId === socketId);
  if (participant) {
    participant.isOnline = false;
  }
  return this.save();
};

// Method to increment message count
chatRoomSchema.methods.incrementMessageCount = function() {
  this.stats.totalMessages += 1;
  return this.save();
};

// Method to deactivate room
chatRoomSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Static method to find active rooms
chatRoomSchema.statics.findActiveRooms = function() {
  return this.find({
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to find expired rooms
chatRoomSchema.statics.findExpiredRooms = function() {
  return this.find({
    $or: [
      { expiresAt: { $lte: new Date() } },
      { isActive: false }
    ]
  });
};

// Pre-save middleware
chatRoomSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiration to 1 hour from now if not set
    this.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
