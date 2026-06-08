const express = require('express');
const router = express.Router();
const {
  getInvoices, getInvoice, createInvoice, updateInvoice,
  deleteInvoice, updateStatus, sendInvoice, downloadPDF,
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.patch('/:id/status', updateStatus);
router.post('/:id/send', sendInvoice);
router.get('/:id/pdf', downloadPDF);

module.exports = router;
