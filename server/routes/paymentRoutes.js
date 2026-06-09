const express = require('express');
const router = express.Router();
const {
  getPublicInvoice,
  createOrder,
  verifyPayment,
  handleWebhook,
} = require('../controllers/paymentController');

// All payment routes are PUBLIC (no JWT auth required — clients pay without login)

// Get invoice details for display on payment page
router.get('/public-invoice/:id', getPublicInvoice);

// Create a Razorpay order for an invoice
router.post('/order/:invoiceId', createOrder);

// Verify payment after Razorpay checkout success (client-side callback)
router.post('/verify', verifyPayment);

// Razorpay webhook — receives events from Razorpay servers (backup verification)
router.post('/webhook', handleWebhook);

module.exports = router;
