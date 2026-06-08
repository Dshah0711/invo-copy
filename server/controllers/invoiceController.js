const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const path = require('path');
const fs = require('fs');

// @desc    Get all invoices for current user
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = { userId: req.user._id };
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'client.name': { $regex: search, $options: 'i' } },
        { 'client.email': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
const getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Create invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res, next) => {
  try {
    const { client, lineItems, taxType, taxRate, discountPercent, dueDate, notes, terms, template, isRecurring, recurringInterval } = req.body;

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const discountAmount = (subtotal * (discountPercent || 0)) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxType !== 'None' ? (taxableAmount * (taxRate || 18)) / 100 : 0;
    const total = taxableAmount + taxAmount;

    // Recalculate each line item amount
    const processedLineItems = lineItems.map((item) => ({
      ...item,
      amount: item.quantity * item.rate,
    }));

    // Get next invoice number
    const invoiceNumber = await req.user.getNextInvoiceNumber();

    const invoice = await Invoice.create({
      userId: req.user._id,
      invoiceNumber,
      client,
      lineItems: processedLineItems,
      subtotal,
      taxType: taxType || 'GST',
      taxRate: taxRate || 18,
      taxAmount,
      discountPercent: discountPercent || 0,
      discountAmount,
      total,
      currency: req.user.currency,
      currencySymbol: req.user.currencySymbol,
      dueDate,
      notes: notes || '',
      terms: terms || 'Payment due within 30 days.',
      template: template || 'modern',
      isRecurring: isRecurring || false,
      recurringInterval: recurringInterval || null,
    });

    // Update client stats if clientId is provided
    if (req.body.clientId) {
      await Client.findByIdAndUpdate(req.body.clientId, {
        $inc: { totalInvoiced: total, invoiceCount: 1 },
      });
    }

    res.status(201).json({ success: true, message: 'Invoice created successfully!', data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    if (invoice.status === 'Paid') {
      return res.status(400).json({ success: false, message: 'Cannot edit a paid invoice.' });
    }

    const { lineItems, taxType, taxRate, discountPercent } = req.body;

    if (lineItems) {
      const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
      const discountAmount = (subtotal * (discountPercent || invoice.discountPercent)) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxType || invoice.taxType) !== 'None' ? (taxableAmount * (taxRate || invoice.taxRate)) / 100 : 0;
      const total = taxableAmount + taxAmount;

      req.body.subtotal = subtotal;
      req.body.discountAmount = discountAmount;
      req.body.taxAmount = taxAmount;
      req.body.total = total;
      req.body.lineItems = lineItems.map((item) => ({ ...item, amount: item.quantity * item.rate }));
    }

    const updated = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, message: 'Invoice updated successfully!', data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    res.json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
// @access  Private
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const updateData = { status };
    if (status === 'Paid') {
      updateData.paidAt = new Date();
      // Update client paid total
      const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
      if (invoice && invoice.clientId) {
        await Client.findByIdAndUpdate(invoice.clientId, { $inc: { totalPaid: invoice.total } });
      }
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true }
    );
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Create notification
    if (status === 'Paid') {
      await Notification.create({
        userId: req.user._id,
        type: 'invoice_paid',
        title: 'Invoice Paid! 🎉',
        message: `Invoice ${invoice.invoiceNumber} from ${invoice.client.name} has been marked as paid.`,
        referenceId: invoice._id,
        referenceModel: 'Invoice',
        icon: 'check-circle',
      });
    }

    res.json({ success: true, message: `Invoice marked as ${status}.`, data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Send invoice email to client
// @route   POST /api/invoices/:id/send
// @access  Private
const sendInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Generate PDF
    const pdfBuffer = await pdfService.generateInvoicePDF(invoice, req.user);

    // Send email with PDF attachment
    await emailService.sendInvoiceEmail({
      to: invoice.client.email,
      clientName: invoice.client.name,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      dueDate: invoice.dueDate,
      currencySymbol: invoice.currencySymbol,
      senderName: req.user.name,
      senderCompany: req.user.company,
      pdfBuffer,
    });

    // Update status and sentAt
    invoice.status = invoice.status === 'Draft' ? 'Sent' : invoice.status;
    invoice.sentAt = new Date();
    await invoice.save();

    // Notification
    await Notification.create({
      userId: req.user._id,
      type: 'invoice_sent',
      title: 'Invoice Sent',
      message: `Invoice ${invoice.invoiceNumber} sent to ${invoice.client.email}.`,
      referenceId: invoice._id,
      referenceModel: 'Invoice',
      icon: 'send',
    });

    res.json({ success: true, message: `Invoice sent to ${invoice.client.email} successfully!`, data: invoice });
  } catch (error) {
    next(error);
  }
};

// @desc    Download invoice PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
const downloadPDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const pdfBuffer = await pdfService.generateInvoicePDF(invoice, req.user);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, updateStatus, sendInvoice, downloadPDF };
