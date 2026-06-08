const Invoice = require('../models/Invoice');
const VendorInvoice = require('../models/VendorInvoice');
const Client = require('../models/Client');
const Notification = require('../models/Notification');

// @desc    Dashboard summary stats
// @route   GET /api/analytics/summary
// @access  Private
const getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [invoices, vendorInvoices, clients] = await Promise.all([
      Invoice.find({ userId }),
      VendorInvoice.find({ userId }),
      Client.countDocuments({ userId }),
    ]);

    const totalRevenue = invoices
      .filter((i) => i.status === 'Paid')
      .reduce((sum, i) => sum + i.total, 0);

    const outstanding = invoices
      .filter((i) => i.status === 'Sent')
      .reduce((sum, i) => sum + i.total, 0);

    const overdueCount = invoices.filter((i) => i.status === 'Overdue').length;
    const overdueAmount = invoices
      .filter((i) => i.status === 'Overdue')
      .reduce((sum, i) => sum + i.total, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthInvoices = invoices.filter((i) => new Date(i.createdAt) >= startOfMonth);

    const pendingPayables = vendorInvoices.filter((vi) => vi.status === 'Pending' || vi.status === 'Approved').length;
    const totalPayables = vendorInvoices
      .filter((vi) => vi.status === 'Approved')
      .reduce((sum, vi) => sum + vi.total, 0);

    const unreadNotifications = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      success: true,
      data: {
        totalRevenue,
        outstanding,
        overdueCount,
        overdueAmount,
        thisMonthCount: thisMonthInvoices.length,
        thisMonthRevenue: thisMonthInvoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + i.total, 0),
        totalClients: clients,
        totalInvoices: invoices.length,
        pendingPayables,
        totalPayables,
        unreadNotifications,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Monthly revenue chart data (last 12 months)
// @route   GET /api/analytics/monthly
// @access  Private
const getMonthlyData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const result = await Invoice.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalInvoiced: { $sum: '$total' },
          totalPaid: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$total', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const found = result.find((r) => r._id.year === d.getFullYear() && r._id.month === d.getMonth() + 1);
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        label: `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`,
        totalInvoiced: found?.totalInvoiced || 0,
        totalPaid: found?.totalPaid || 0,
        count: found?.count || 0,
      });
    }

    res.json({ success: true, data: months });
  } catch (error) {
    next(error);
  }
};

// @desc    Top clients by revenue
// @route   GET /api/analytics/top-clients
// @access  Private
const getTopClients = async (req, res, next) => {
  try {
    const topClients = await Client.find({ userId: req.user._id })
      .sort({ totalPaid: -1 })
      .limit(5)
      .select('name company totalInvoiced totalPaid invoiceCount');

    res.json({ success: true, data: topClients });
  } catch (error) {
    next(error);
  }
};

// @desc    Invoice status breakdown
// @route   GET /api/analytics/status-breakdown
// @access  Private
const getStatusBreakdown = async (req, res, next) => {
  try {
    const result = await Invoice.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$total' } } },
    ]);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification(s) as read
// @route   PATCH /api/notifications/read
// @access  Private
const markNotificationsRead = async (req, res, next) => {
  try {
    const { ids } = req.body; // array of IDs, or empty to mark all
    const query = { userId: req.user._id };
    if (ids && ids.length) query._id = { $in: ids };
    await Notification.updateMany(query, { isRead: true });
    res.json({ success: true, message: 'Notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary, getMonthlyData, getTopClients, getStatusBreakdown, getNotifications, markNotificationsRead };
