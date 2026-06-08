const express = require('express');
const router = express.Router();
const {
  getVendorInvoices, getVendorInvoice, uploadVendorInvoice,
  updateVendorInvoice, approveVendorInvoice, rejectVendorInvoice, markVendorPaid,
} = require('../controllers/vendorInvoiceController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(protect);
router.get('/', getVendorInvoices);
router.post('/upload', upload.single('invoice'), uploadVendorInvoice);
router.get('/:id', getVendorInvoice);
router.put('/:id', updateVendorInvoice);
router.patch('/:id/approve', approveVendorInvoice);
router.patch('/:id/reject', rejectVendorInvoice);
router.patch('/:id/pay', markVendorPaid);

module.exports = router;
