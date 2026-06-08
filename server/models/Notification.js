const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'invoice_sent',
        'invoice_paid',
        'invoice_overdue',
        'vendor_parsed',
        'vendor_approval_needed',
        'payment_received',
        'reminder_sent',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    referenceModel: { type: String, enum: ['Invoice', 'VendorInvoice', 'Client', null], default: null },
    isRead: { type: Boolean, default: false },
    icon: { type: String, default: 'bell' },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
