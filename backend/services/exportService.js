'use strict';
const PDFDocument = require('pdfkit');
const { pool }    = require('../config/db');

/**
 * Log export entry into export_history table
 */
async function logExportHistory(conn, userId, exportType, fileName, fileSizeKb, habitCount, dateFrom = null, dateTo = null) {
  try {
    await conn.execute(
      `INSERT INTO export_history (user_id, export_type, file_name, file_size_kb, habit_count, date_range_from, date_range_to)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        exportType,
        fileName,
        fileSizeKb ? parseFloat(fileSizeKb.toFixed(2)) : 0.00,
        habitCount || 0,
        dateFrom || null,
        dateTo || null
      ]
    );
  } catch (err) {
    console.error('Error logging export history:', err);
  }
}

/**
 * Generate CSV content for user habits & logs
 * Returns { filename, csvString }
 */
async function generateCsv(userId) {
  let conn;
  try {
    conn = await pool.getConnection();

    // 1. Fetch User Info
    const [users] = await conn.execute('SELECT username, email, display_name FROM users WHERE id = ?', [userId]);
    const user = users[0] || { username: 'User', email: '', display_name: 'User' };

    // 2. Fetch Habits
    const [habits] = await conn.execute(
      `SELECT h.id, h.name, h.description, c.label AS category, h.frequency, h.start_date,
              h.current_streak, h.longest_streak, h.total_completions, h.missed_days, h.is_archived, h.created_at
       FROM habits h
       JOIN categories c ON c.id = h.category_id
       WHERE h.user_id = ?
       ORDER BY h.created_at DESC`,
      [userId]
    );

    // 3. Fetch Recent Habit Logs (Last 90 days)
    const [logs] = await conn.execute(
      `SELECT hl.habit_id, h.name AS habit_name, hl.log_date, hl.completed, hl.note
       FROM habit_logs hl
       JOIN habits h ON h.id = hl.habit_id
       WHERE hl.user_id = ?
       ORDER BY hl.log_date DESC`,
      [userId]
    );

    // Escape CSV cell helper
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvLines = [];
    csvLines.push(`# HabitFlow Export — ${user.display_name || user.username} (${user.email})`);
    csvLines.push(`# Export Date: ${new Date().toISOString()}`);
    csvLines.push('');

    // Table 1: Habits Summary
    csvLines.push('# HABITS SUMMARY');
    csvLines.push([
      'Habit ID', 'Habit Name', 'Category', 'Frequency', 'Start Date',
      'Current Streak', 'Longest Streak', 'Total Completed', 'Missed Days', 'Archived', 'Created At'
    ].map(escapeCsv).join(','));

    let minDate = null;
    let maxDate = null;

    habits.forEach(h => {
      const startDateStr = h.start_date ? new Date(h.start_date).toISOString().split('T')[0] : '';
      const createdAtStr = h.created_at ? new Date(h.created_at).toISOString().split('T')[0] : '';
      
      if (!minDate || (startDateStr && startDateStr < minDate)) minDate = startDateStr;
      if (!maxDate || (startDateStr && startDateStr > maxDate)) maxDate = startDateStr;

      csvLines.push([
        h.id, h.name, h.category, h.frequency, startDateStr,
        h.current_streak, h.longest_streak, h.total_completions, h.missed_days,
        h.is_archived ? 'Yes' : 'No', createdAtStr
      ].map(escapeCsv).join(','));
    });

    csvLines.push('');
    csvLines.push('# HABIT COMPLETION LOGS');
    csvLines.push(['Habit ID', 'Habit Name', 'Log Date', 'Status', 'Note'].map(escapeCsv).join(','));

    logs.forEach(l => {
      const logDateStr = l.log_date ? new Date(l.log_date).toISOString().split('T')[0] : '';
      csvLines.push([
        l.habit_id, l.habit_name, logDateStr, l.completed ? 'Completed' : 'Missed', l.note || ''
      ].map(escapeCsv).join(','));
    });

    const csvString = csvLines.join('\n');
    const fileSizeKb = Buffer.byteLength(csvString, 'utf8') / 1024;
    const fileName = `habitflow-export-${userId}-${Date.now()}.csv`;

    await logExportHistory(conn, userId, 'csv', fileName, fileSizeKb, habits.length, minDate, maxDate);

    return { fileName, csvString };
  } finally {
    if (conn) conn.release();
  }
}

/**
 * Generate PDF Report Buffer for user habits
 * Returns { fileName, pdfBuffer }
 */
async function generatePdfReport(userId) {
  let conn;
  try {
    conn = await pool.getConnection();

    // 1. Fetch User Info
    const [users] = await conn.execute('SELECT username, email, display_name FROM users WHERE id = ?', [userId]);
    const user = users[0] || { username: 'User', email: '', display_name: 'User' };

    // 2. Fetch Habits & Categories
    const [habits] = await conn.execute(
      `SELECT h.id, h.name, h.description, c.label AS category, h.icon_emoji, h.frequency,
              h.current_streak, h.longest_streak, h.total_completions, h.missed_days, h.start_date,
              (SELECT COUNT(*) FROM habit_logs hl WHERE hl.habit_id = h.id AND hl.log_date = CURDATE() AND hl.completed = 1) AS done_today
       FROM habits h
       JOIN categories c ON c.id = h.category_id
       WHERE h.user_id = ? AND h.is_archived = 0
       ORDER BY h.current_streak DESC`,
      [userId]
    );

    // 3. Fetch Aggregates
    const totalHabits = habits.length;
    const totalCompletions = habits.reduce((sum, h) => sum + (h.total_completions || 0), 0);
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.current_streak || 0), 0);
    const doneTodayCount = habits.filter(h => h.done_today > 0).length;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', async () => {
          const pdfBuffer = Buffer.concat(buffers);
          const fileSizeKb = pdfBuffer.length / 1024;
          const fileName = `habitflow-report-${userId}-${Date.now()}.pdf`;

          try {
            await logExportHistory(conn, userId, 'pdf', fileName, fileSizeKb, totalHabits, null, null);
          } catch (e) {
            console.error('Failed to log PDF export history:', e);
          } finally {
            if (conn) conn.release();
          }

          resolve({ fileName, pdfBuffer });
        });

        // ── PDF Layout Styling ──
        const primaryColor   = '#7c3aed';
        const secondaryColor = '#4f46e5';
        const textColor      = '#1f2937';
        const mutedColor     = '#6b7280';
        const lightBg        = '#f3f4f6';

        // Header Background Banner
        doc.rect(0, 0, 595.28, 90).fill(primaryColor);

        // Title Header Text
        doc.fillColor('#ffffff')
           .fontSize(24)
           .font('Helvetica-Bold')
           .text('🌱 HabitFlow Performance Report', 40, 25);

        doc.fontSize(11)
           .font('Helvetica')
           .text(`User: ${user.display_name || user.username} (${user.email})`, 40, 55)
           .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 350, 55);

        doc.y = 105;

        // Executive Summary Box
        doc.rect(40, 105, 515.28, 65).fillAndStroke(lightBg, primaryColor);
        doc.fillColor(primaryColor)
           .fontSize(13)
           .font('Helvetica-Bold')
           .text('Executive Summary', 55, 115);

        doc.fillColor(textColor)
           .fontSize(10)
           .font('Helvetica')
           .text(`Total Habits: ${totalHabits}`, 55, 138)
           .text(`Completed Today: ${doneTodayCount} / ${totalHabits}`, 185, 138)
           .text(`Best Active Streak: ${bestStreak} Days`, 335, 138)
           .text(`Total Lifetime Completions: ${totalCompletions}`, 55, 153);

        doc.y = 190;

        // Habits Table Header
        doc.fillColor(textColor)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('Active Habits Overview', 40, 190);

        let tableTop = 215;
        doc.rect(40, tableTop, 515.28, 22).fill(secondaryColor);
        
        doc.fillColor('#ffffff')
           .fontSize(9)
           .font('Helvetica-Bold');

        doc.text('Habit Name', 50, tableTop + 6, { width: 140 });
        doc.text('Category', 195, tableTop + 6, { width: 85 });
        doc.text('Freq', 285, tableTop + 6, { width: 60 });
        doc.text('Streak', 350, tableTop + 6, { width: 50 });
        doc.text('Completed', 405, tableTop + 6, { width: 65 });
        doc.text('Today', 480, tableTop + 6, { width: 50 });

        let currentY = tableTop + 22;

        if (habits.length === 0) {
          doc.rect(40, currentY, 515.28, 30).fill('#fafafa');
          doc.fillColor(mutedColor)
             .fontSize(10)
             .font('Helvetica')
             .text('No active habits found for this user.', 50, currentY + 10);
          currentY += 30;
        } else {
          habits.forEach((h, index) => {
            if (currentY > 740) {
              doc.addPage();
              currentY = 40;
            }

            const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
            doc.rect(40, currentY, 515.28, 22).fill(rowBg);

            doc.fillColor(textColor)
               .fontSize(9)
               .font('Helvetica');

            const icon = h.icon_emoji ? `${h.icon_emoji} ` : '';
            doc.text(`${icon}${h.name.slice(0, 22)}`, 50, currentY + 6, { width: 140 });
            doc.text(h.category, 195, currentY + 6, { width: 85 });
            doc.text(h.frequency, 285, currentY + 6, { width: 60 });
            doc.text(`${h.current_streak}d`, 350, currentY + 6, { width: 50 });
            doc.text(`${h.total_completions}`, 405, currentY + 6, { width: 65 });

            if (h.done_today > 0) {
              doc.fillColor('#16a34a').font('Helvetica-Bold').text('✓ Done', 480, currentY + 6);
            } else {
              doc.fillColor('#dc2626').font('Helvetica').text('Pending', 480, currentY + 6);
            }

            currentY += 22;
          });
        }

        // Footer on page
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.fillColor(mutedColor)
             .fontSize(8)
             .font('Helvetica')
             .text(`HabitFlow Production Report — Page ${i + 1} of ${range.count}`, 40, 800, { align: 'center', width: 515.28 });
        }

        doc.end();

      } catch (err) {
        if (conn) conn.release();
        reject(err);
      }
    });

  } catch (err) {
    if (conn) conn.release();
    throw err;
  }
}

module.exports = {
  generateCsv,
  generatePdfReport
};
