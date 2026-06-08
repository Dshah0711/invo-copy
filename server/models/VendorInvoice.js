const mongoose = require('mongoose');

const vendorLineItemSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const vendorInvoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // AI-extracted fields
    vendorName: { type: String, default: '' },
    vendorEmail: { type: String, default: '' },
    vendorPhone: { type: String, default: '' },
    vendorAddress: { type: String, default: '' },
    vendorGst: { type: String, default: '' },
    vendorBankDetails: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    invoiceNumber: { type: String, default: '' },
    lineItems: { type: [vendorLineItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },
    dueDate: { type: Date, default: null },
    issueDate: { type: Date, default: null },

    // File info
    rawFileUrl: { type: String, default: '' },
    rawFileName: { type: String, default: '' },
    fileType: { type: String, enum: ['pdf', 'image'], default: 'image' },

    // AI metadata
    parsedData: { type: mongoose.Schema.Types.Mixed, default: {} },
    aiConfidence: { type: Number, min: 0, max: 100, default: 0 },
    aiModel: { type: String, default: 'gemini-1.5-flash' },
    parseError: { type: String, default: '' },

    // Workflow status
    status: {
      type: String,
      enum: ['Processing', 'Pending', 'Approved', 'Paid', 'Rejected'],
      default: 'Processing',
    },
    notes: { type: String, default: '' },
    approvedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

vendorInvoiceSchema.index({ userId: 1, status: 1 });
vendorInvoiceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('VendorInvoice', vendorInvoiceSchema);
