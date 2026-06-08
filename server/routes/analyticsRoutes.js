const express = require('express');
const router = express.Router();
const {
  getSummary, getMonthlyData, getTopClients, getStatusBreakdown,
  getNotifications, markNotificationsRead,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/summary', getSummary);
router.get('/monthly', getMonthlyData);
router.get('/top-clients', getTopClients);
router.get('/status-breakdown', getStatusBreakdown);
router.get('/notifications', getNotifications);
router.patch('/notifications/read', markNotificationsRead);

module.exports = router;
