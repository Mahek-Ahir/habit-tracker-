'use strict';
const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/authMiddleware');
const { exportCsv, exportPdf } = require('../controllers/exportController');

router.get('/export/csv', protect, exportCsv);
router.get('/export/pdf', protect, exportPdf);

module.exports = router;
