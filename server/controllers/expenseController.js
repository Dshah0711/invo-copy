const Expense = require('../models/Expense');
const { EXPENSE_CATEGORIES } = require('../models/Expense');

// @desc    Get all expenses (with optional filters)
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res, next) => {
  try {
    const { category, from, to, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user._id };

    if (category && category !== 'all') query.category = category;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalAmount = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, sum: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      data: expenses,
      total: total,
      totalAmount: totalAmount[0]?.sum || 0,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res, next) => {
  try {
    const { title, amount, category, date, isRecurring, recurrenceInterval, notes, currency, currencySymbol } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and amount are required.' });
    }

    const expense = await Expense.create({
      userId: req.user._id,
      title,
      amount: Number(amount),
      category: category || 'Miscellaneous',
      date: date ? new Date(date) : new Date(),
      isRecurring: Boolean(isRecurring),
      recurrenceInterval: isRecurring ? recurrenceInterval : null,
      notes: notes || '',
      currency: currency || req.user.currency || 'INR',
      currencySymbol: currencySymbol || req.user.currencySymbol || '₹',
    });

    res.status(201).json({ success: true, message: 'Expense logged successfully!', data: expense });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, amount: req.body.amount ? Number(req.body.amount) : undefined },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    res.json({ success: true, message: 'Expense updated.', data: expense });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense categories
// @route   GET /api/expenses/categories
// @access  Private
const getCategories = async (req, res) => {
  res.json({ success: true, data: EXPENSE_CATEGORIES });
};

// @desc    Get category breakdown
// @route   GET /api/expenses/breakdown
// @access  Private
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = { userId: req.user._id };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const result = await Expense.aggregate([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense, getCategories, getCategoryBreakdown };
