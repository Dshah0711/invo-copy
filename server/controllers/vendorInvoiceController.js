const VendorInvoice = require('../models/VendorInvoice');
const Notification = require('../models/Notification');
const aiParserService = require('../services/aiParserService');
const fs = require('fs');

// @desc    Get all vendor invoices
// @route   GET /api/vendor-invoices
// @access  Private
const getVendorInvoices = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user._id };
    if (status && status !== 'all') query.status = status;

    const total = await VendorInvoice.countDocuments(query);
    const invoices = await VendorInvoice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: invoices,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vendor invoice
// @route   GET /api/vendor-invoices/:id
// @access  Private
const getVendorInvoice = async (req, res, next) => {
  try {
    const invoice = await VendorInvoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Vendor invoice not found.' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload & AI-parse vendor invoice
// @route   POST /api/vendor-invoices/upload
// @access  Private
const uploadVendorInvoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    const fileUrl = `/uploads/${req.file.filename}`;

    // Create a 'Processing' record immediately
    const vendorInvoice = await VendorInvoice.create({
      userId: req.user._id,
      rawFileUrl: fileUrl,
      rawFileName: req.file.originalname,
      fileType,
      status: 'Processing',
      total: 0,
    });

    // Parse asynchronously, update record when done
    aiParserService
      .parseVendorInvoice(req.file.path, fileType)
      .then(async (parsed) => {
        vendorInvoice.vendorName = parsed.vendorName || '';
        vendorInvoice.vendorEmail = parsed.vendorEmail || '';
        vendorInvoice.vendorPhone = parsed.vendorPhone || '';
        vendorInvoice.vendorAddress = parsed.vendorAddress || '';
        vendorInvoice.vendorGst = parsed.vendorGst || '';
        vendorInvoice.vendorBankDetails = parsed.vendorBankDetails || {};
        vendorInvoice.invoiceNumber = parsed.invoiceNumber || '';
        vendorInvoice.lineItems = parsed.lineItems || [];
        vendorInvoice.subtotal = parsed.subtotal || 0;
        vendorInvoice.taxAmount = parsed.taxAmount || 0;
        vendorInvoice.total = parsed.total || 0;
        vendorInvoice.dueDate = parsed.dueDate ? new Date(parsed.dueDate) : null;
        vendorInvoice.issueDate = parsed.issueDate ? new Date(parsed.issueDate) : null;
        vendorInvoice.parsedData = parsed;
        vendorInvoice.aiConfidence = parsed.confidence || 80;
        vendorInvoice.status = 'Pending';
        await vendorInvoice.save();

        // Notification
        await Notification.create({
          userId: req.user._id,
          type: 'vendor_parsed',
          title: 'Vendor Invoice Parsed ✨',
          message: `AI has successfully parsed the invoice from ${parsed.vendorName || 'Unknown Vendor'}. Review and approve.`,
          referenceId: vendorInvoice._id,
          referenceModel: 'VendorInvoice',
          icon: 'sparkles',
        });
      })
      .catch(async (error) => {
        vendorInvoice.status = 'Pending';
        vendorInvoice.parseError = error.message;
        vendorInvoice.aiConfidence = 0;
        await vendorInvoice.save();
      });

    res.status(201).json({
      success: true,
      message: 'File uploaded! AI is analyzing your invoice...',
      data: vendorInvoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update vendor invoice fields (after AI parse, user can edit)
// @route   PUT /api/vendor-invoices/:id
// @access  Private
const updateVendorInvoice = async (req, res, next) => {
  try {
    const invoice = await VendorInvoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Vendor invoice not found.' });
    }
    res.json({ success: true, message: 'Vendor invoice updated.', data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve vendor invoice
// @route   PATCH /api/vendor-invoices/:id/approve
// @access  Private
const approveVendorInvoice = async (req, res, next) => {
  try {
    const invoice = await VendorInvoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'Approved', approvedAt: new Date() },
      { new: true }
    );
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Vendor invoice not found.' });
    }
    res.json({ success: true, message: 'Vendor invoice approved.', data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject vendor invoice
// @route   PATCH /api/vendor-invoices/:id/reject
// @access  Private
const rejectVendorInvoice = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const invoice = await VendorInvoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'Rejected', rejectedAt: new Date(), rejectionReason: reason || '' },
      { new: true }
    );
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Vendor invoice not found.' });
    }
    res.json({ success: true, message: 'Vendor invoice rejected.', data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark vendor invoice as paid
// @route   PATCH /api/vendor-invoices/:id/pay
// @access  Private
const markVendorPaid = async (req, res, next) => {
  try {
    const invoice = await VendorInvoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'Paid', paidAt: new Date() },
      { new: true }
    );
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Vendor invoice not found.' });
    }
    res.json({ success: true, message: 'Vendor invoice marked as paid.', data: invoice });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVendorInvoices,
  getVendorInvoice,
  uploadVendorInvoice,
  updateVendorInvoice,
  approveVendorInvoice,
  rejectVendorInvoice,
  markVendorPaid,
};
