const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * @param {number} amount - Amount in smallest currency unit (paise for INR)
 * @param {string} currency - Currency code (default: INR)
 * @param {string} receipt - Unique receipt ID (invoice number or ID)
 * @param {object} notes - Additional notes for Razorpay dashboard
 */
const createRazorpayOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  const options = {
    amount: Math.round(amount * 100), // Convert to paise
    currency,
    receipt,
    notes,
    payment_capture: 1, // Auto capture payment
  };

  const order = await razorpay.orders.create(options);
  return order;
};

module.exports = { razorpay, createRazorpayOrder };
