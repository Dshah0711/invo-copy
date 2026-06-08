const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    address: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    client: {
      type: clientSchema,
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
    },
    lineItems: {
      type: [lineItemSchema],
      required: true,
      validate: [arr => arr.length > 0, 'At least one line item is required'],
    },
    subtotal: { type: Number, required: true },
    taxType: {
      type: String,
      enum: ['None', 'GST', 'VAT', 'IGST'],
      default: 'GST',
    },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Draft',
    },
    dueDate: { type: Date, required: true },
    issueDate: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
    terms: { type: String, default: 'Payment due within 30 days.' },
    template: {
      type: String,
      enum: ['classic', 'modern', 'minimal'],
      default: 'modern',
    },
    pdfUrl: { type: String, default: '' },
    sentAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly', null],
      default: null,
    },
    parentInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for overdue detection cron
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
