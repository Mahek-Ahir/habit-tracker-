'use strict';
const express = require('express');
const router  = express.Router();
const { getWeeklyAnalytics, getMonthlyAnalytics, getCategoryAnalytics, getCompletionAnalytics, getCalendarData, getBestHabit, getMissedHabits } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// protect applied per-route — same reason as trackingRoutes.js
router.get('/analytics/weekly',        protect, getWeeklyAnalytics);
router.get('/analytics/monthly',       protect, getMonthlyAnalytics);
router.get('/analytics/category',      protect, getCategoryAnalytics);
router.get('/analytics/completion',    protect, getCompletionAnalytics);
router.get('/analytics/best-habit',    protect, getBestHabit);
router.get('/analytics/missed-habits', protect, getMissedHabits);
router.get('/calendar/:month/:year',   protect, getCalendarData);

module.exports = router;
