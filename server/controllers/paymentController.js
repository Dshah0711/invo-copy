const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { createRazorpayOrder } = require('../services/razorpayService');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');

// @desc    Get public invoice details (no auth needed for payment page)
// @route   GET /api/payments/public-invoice/:id
// @access  Public
const getPublicInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Get merchant/user details for display
    const user = await User.findById(invoice.userId).select('name company logo address phone gstNumber');

    // Return only the fields needed for payment
    res.json({
      success: true,
      data: {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        taxType: invoice.taxType,
        taxRate: invoice.taxRate,
        discountAmount: invoice.discountAmount,
        discountPercent: invoice.discountPercent,
        currency: invoice.currency,
        currencySymbol: invoice.currencySymbol,
        status: invoice.status,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        paidAt: invoice.paidAt,
        lineItems: invoice.lineItems,
        notes: invoice.notes,
        client: {
          name: invoice.client.name,
          email: invoice.client.email,
          company: invoice.client.company,
        },
        merchant: {
          name: user?.name || '',
          company: user?.company || '',
          logo: user?.logo || '',
          phone: user?.phone || '',
          gstNumber: user?.gstNumber || '',
          address: user?.address || {},
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Razorpay order for an invoice
// @route   POST /api/payments/order/:invoiceId
// @access  Public
const createOrder = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (invoice.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'This invoice has already been paid.' });
    }

    if (invoice.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'This invoice has been cancelled.' });
    }

    // Only support INR for Razorpay
    let currency = invoice.currency === 'INR' ? 'INR' : 'INR';

    const isRazorpayConfigured = process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_ID !== 'rzp_test_REPLACE_ME' &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_KEY_SECRET !== 'REPLACE_ME_WITH_SECRET';

    let orderId;
    let amount = Math.round(invoice.total * 100);
    let keyId = process.env.RAZORPAY_KEY_ID;

    if (!isRazorpayConfigured) {
      console.log('⚠️ Razorpay environment variables not configured. Using payment simulation mode.');
      orderId = `mock_order_${Date.now()}`;
      keyId = 'rzp_test_mockkey';
    } else {
      const order = await createRazorpayOrder(
        invoice.total,
        currency,
        invoice.invoiceNumber,
        {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client.name,
          clientEmail: invoice.client.email,
        }
      );
      orderId = order.id;
      amount = order.amount;
      currency = order.currency;
    }

    res.json({
      success: true,
      data: {
        orderId,
        amount,
        currency,
        keyId,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.name,
        clientEmail: invoice.client.email,
        isMock: !isRazorpayConfigured,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment signature (called by client after checkout success)
// @route   POST /api/payments/verify
// @access  Public
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId, isMock } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !invoiceId) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields.' });
    }

    // Verify signature
    const isMockOrder = isMock || razorpay_order_id.startsWith('mock_order_') || razorpay_signature === 'mock_signature';

    if (isMockOrder) {
      console.log(`[SIMULATION] Verified simulated payment ID: ${razorpay_payment_id}`);
    } else {
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
      }
    }

    // Mark invoice as paid
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: 'Paid',
        paidAt: new Date(),
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Update client paid stats
    if (invoice.clientId) {
      await Client.findByIdAndUpdate(invoice.clientId, {
        $inc: { totalPaid: invoice.total },
      });
    }

    // Create notification for business owner
    await Notification.create({
      userId: invoice.userId,
      type: 'invoice_paid',
      title: 'Payment Received! 🎉',
      message: `Invoice ${invoice.invoiceNumber} from ${invoice.client.name} was paid online (₹${invoice.total.toLocaleString()}).`,
      referenceId: invoice._id,
      referenceModel: 'Invoice',
      icon: 'check-circle',
    });

    // Send receipt email to client
    try {
      const user = await User.findById(invoice.userId).select('name company email');
      const pdfBuffer = await pdfService.generateInvoicePDF(invoice, user);
      await emailService.sendPaymentReceiptEmail({
        to: invoice.client.email,
        clientName: invoice.client.name,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        currencySymbol: invoice.currencySymbol,
        senderName: user?.name || '',
        senderCompany: user?.company || '',
        paymentId: razorpay_payment_id,
        paidAt: new Date(),
        pdfBuffer,
      });
    } catch (emailErr) {
      console.error('Receipt email failed:', emailErr.message);
      // Don't fail the payment verification if email fails
    }

    res.json({
      success: true,
      message: 'Payment verified successfully! Invoice marked as Paid.',
      data: {
        invoiceNumber: invoice.invoiceNumber,
        paidAt: invoice.paidAt,
        paymentId: razorpay_payment_id,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle Razorpay webhook events (backup server-side verification)
// @route   POST /api/payments/webhook
// @access  Public (Razorpay server)
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      // Verify webhook signature
      const signature = req.headers['x-razorpay-signature'];
      const rawBody = req.rawBody || JSON.stringify(req.body);

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
      }
    }

    const event = req.body;

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const invoiceId = payment.notes?.invoiceId;

      if (invoiceId) {
        const existingInvoice = await Invoice.findById(invoiceId);

        // Only update if not already marked paid (to avoid duplicate processing)
        if (existingInvoice && existingInvoice.status !== 'Paid') {
          const invoice = await Invoice.findByIdAndUpdate(
            invoiceId,
            {
              status: 'Paid',
              paidAt: new Date(),
              razorpayOrderId: payment.order_id,
              razorpayPaymentId: payment.id,
            },
            { new: true }
          );

          if (invoice && invoice.clientId) {
            await Client.findByIdAndUpdate(invoice.clientId, {
              $inc: { totalPaid: invoice.total },
            });
          }

          if (invoice) {
            await Notification.create({
              userId: invoice.userId,
              type: 'invoice_paid',
              title: 'Payment Received via Webhook! 🎉',
              message: `Invoice ${invoice.invoiceNumber} from ${invoice.client.name} was paid online.`,
              referenceId: invoice._id,
              referenceModel: 'Invoice',
              icon: 'check-circle',
            });
          }
        }
      }
    }

    res.json({ success: true, received: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicInvoice, createOrder, verifyPayment, handleWebhook };
