'use strict';
const express = require('express');
const router  = express.Router();
const { markComplete, markIncomplete, getHabitStreak, getDashboardStats } = require('../controllers/trackingController');
const { protect } = require('../middleware/authMiddleware');

// protect applied per-route (not via router.use) because this router is mounted at /api root.
// A blanket router.use(protect) would return 401 for any unknown /api/* path instead of 404.
router.post  ('/habits/:id/complete', protect, markComplete);
router.delete('/habits/:id/complete', protect, markIncomplete);
router.get   ('/habits/:id/streak',   protect, getHabitStreak);
router.get   ('/dashboard/stats',     protect, getDashboardStats);

module.exports = router;
