const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true // Allows null values but ensures uniqueness when present
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  razorpaySignature: {
    type: String,
    sparse: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  ticketId: {
    type: String,
    ref: 'Ticket',
    sparse: true
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    creatorName: String
  }
}, {
  timestamps: true,
  collection: 'payments'
});

// Indexes for efficient queries
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ ticketId: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for payment age
paymentSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60));
});

// Method to mark payment as completed
paymentSchema.methods.markCompleted = function(razorpayPaymentId, razorpaySignature) {
  this.razorpayPaymentId = razorpayPaymentId;
  this.razorpaySignature = razorpaySignature;
  this.status = 'completed';
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.metadata = { ...this.metadata, failureReason: reason };
  return this.save();
};

// Static method to find pending payments older than specified minutes
paymentSchema.statics.findExpiredPending = function(minutes = 30) {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  return this.find({
    status: 'pending',
    createdAt: { $lt: cutoffTime }
  });
};

module.exports = mongoose.model('Payment', paymentSchema);
