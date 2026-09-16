'use strict';
const express = require('express');
const router  = express.Router();
const { register, login, getProfile, updateProfile, changePassword, updateSettings, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register',          register);
router.post('/login',             login);
router.get ('/profile',  protect, getProfile);
router.put ('/profile',  protect, updateProfile);
router.put ('/change-password', protect, changePassword);
router.put ('/settings', protect, updateSettings);
router.post('/logout',   protect, logout);

module.exports = router;
