const express = require('express');
const router = express.Router();
const {
  getExpenses, createExpense, updateExpense, deleteExpense,
  getCategories, getCategoryBreakdown,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/categories', getCategories);
router.get('/breakdown', getCategoryBreakdown);
router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
