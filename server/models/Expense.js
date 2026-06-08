const mongoose = require('mongoose');

const CATEGORIES = [
  'Rent & Office',
  'Salaries & Payroll',
  'Software & Subscriptions',
  'Marketing & Ads',
  'Utilities & Bills',
  'Travel & Transport',
  'Equipment & Hardware',
  'Professional Services',
  'Insurance',
  'Taxes & Compliance',
  'Miscellaneous',
];

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'Miscellaneous',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceInterval: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly', null],
      default: null,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    notes: {
      type: String,
      default: '',
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });

const EXPENSE_CATEGORIES = CATEGORIES;
module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = CATEGORIES;
