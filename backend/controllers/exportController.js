'use strict';
const exportService = require('../services/exportService');

/**
 * GET /api/export/csv
 * Export habit data and completion logs in CSV format
 */
const exportCsv = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileName, csvString } = await exportService.generateCsv(userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(csvString);
  } catch (error) {
    console.error('Export CSV Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate CSV export.'
    });
  }
};

/**
 * GET /api/export/pdf
 * Export printable PDF habit report
 */
const exportPdf = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileName, pdfBuffer } = await exportService.generatePdfReport(userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Export PDF Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report.'
    });
  }
};

module.exports = {
  exportCsv,
  exportPdf
};
