const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  paymentId: {
    type: String,
    unique: true,
    required: true
  },
  roomId: {
    type: String,
    unique: true,
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'deleted'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic deletion
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'tickets'
});

// Index for efficient queries
ticketSchema.index({ roomId: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ expiresAt: 1 });

// Virtual for checking if ticket is expired
ticketSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Method to check if ticket is valid
ticketSchema.methods.isValid = function() {
  return this.status === 'active' && !this.isExpired;
};

// Static method to find valid ticket
ticketSchema.statics.findValidTicket = function(ticketId) {
  return this.findOne({
    _id: ticketId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
};

// Pre-save middleware to ensure expiration
ticketSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set expiration to 1 hour from now if not set
    this.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
