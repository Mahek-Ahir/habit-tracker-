'use strict';
const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSettings,
  updateSettings,
  resetUserData,
  getReminders,
  createOrUpdateReminder
} = require('../controllers/settingsController');

router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSettings);
router.delete('/user/reset-data', protect, resetUserData);
router.get('/reminders', protect, getReminders);
router.post('/reminders', protect, createOrUpdateReminder);

module.exports = router;
