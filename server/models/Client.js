const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    address: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    notes: { type: String, default: '' },
    // Aggregated stats (updated on invoice operations)
    totalInvoiced: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    invoiceCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

clientSchema.index({ userId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Client', clientSchema);
