'use strict';
const { pool } = require('../config/db');

function ok(res, code, msg, data = {}) { return res.status(code).json({ success: true, message: msg, ...data }); }
function err(res, code, msg)           { return res.status(code).json({ success: false, message: msg }); }

/**
 * GET /api/settings
 * Fetch user settings
 */
const getSettings = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.execute(
      `SELECT theme, accent_color, font_size, notifications_enabled, reminder_time, streak_alerts, weekly_summary, data_reset_at
       FROM user_settings
       WHERE user_id = ? LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      // Create default settings row if missing
      await conn.execute('INSERT INTO user_settings (user_id) VALUES (?)', [req.user.id]);
      return ok(res, 200, 'Settings retrieved.', {
        settings: {
          theme: 'dark',
          accent_color: 'purple',
          font_size: 'medium',
          notifications_enabled: false,
          reminder_time: '08:00:00',
          streak_alerts: true,
          weekly_summary: false,
          data_reset_at: null
        }
      });
    }

    const s = rows[0];
    return ok(res, 200, 'Settings retrieved.', {
      settings: {
        theme: s.theme,
        accent_color: s.accent_color,
        font_size: s.font_size,
        notifications_enabled: !!s.notifications_enabled,
        reminder_time: s.reminder_time,
        streak_alerts: !!s.streak_alerts,
        weekly_summary: !!s.weekly_summary,
        data_reset_at: s.data_reset_at
      }
    });
  } catch (e) {
    console.error('Get settings error:', e);
    return err(res, 500, 'Server error fetching settings.');
  } finally {
    if (conn) conn.release();
  }
};

/**
 * PUT /api/settings
 * Update user settings in MySQL
 */
const updateSettings = async (req, res) => {
  let conn;
  try {
    const { theme, accent_color, font_size, notifications_enabled, reminder_time, streak_alerts, weekly_summary } = req.body;
    
    const validThemes  = ['dark', 'light'];
    const validAccents = ['purple', 'blue', 'green', 'pink', 'orange', 'teal', 'yellow', 'red', 'amber'];
    const validFonts   = ['small', 'medium', 'large', 'xlarge'];

    if (theme && !validThemes.includes(theme)) return err(res, 400, `Invalid theme. Allowed: ${validThemes.join(', ')}`);
    if (accent_color && !validAccents.includes(accent_color)) return err(res, 400, `Invalid accent color.`);
    if (font_size && !validFonts.includes(font_size)) return err(res, 400, `Invalid font size.`);

    conn = await pool.getConnection();
    
    await conn.execute(
      `INSERT INTO user_settings (user_id, theme, accent_color, font_size, notifications_enabled, reminder_time, streak_alerts, weekly_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         theme = COALESCE(VALUES(theme), theme),
         accent_color = COALESCE(VALUES(accent_color), accent_color),
         font_size = COALESCE(VALUES(font_size), font_size),
         notifications_enabled = COALESCE(VALUES(notifications_enabled), notifications_enabled),
         reminder_time = COALESCE(VALUES(reminder_time), reminder_time),
         streak_alerts = COALESCE(VALUES(streak_alerts), streak_alerts),
         weekly_summary = COALESCE(VALUES(weekly_summary), weekly_summary),
         updated_at = NOW()`,
      [
        req.user.id,
        theme || null,
        accent_color || null,
        font_size || null,
        notifications_enabled !== undefined ? (notifications_enabled ? 1 : 0) : null,
        reminder_time || null,
        streak_alerts !== undefined ? (streak_alerts ? 1 : 0) : null,
        weekly_summary !== undefined ? (weekly_summary ? 1 : 0) : null
      ]
    );

    return ok(res, 200, 'Settings updated successfully.');
  } catch (e) {
    console.error('Update settings error:', e);
    return err(res, 500, 'Server error updating settings.');
  } finally {
    if (conn) conn.release();
  }
};

/**
 * DELETE /api/user/reset-data
 * Reset all habit tracking data for the authenticated user
 */
const resetUserData = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const userId = req.user.id;

    // Delete user dependent tracking data
    await conn.execute('DELETE FROM habit_logs WHERE user_id = ?', [userId]);
    await conn.execute('DELETE FROM reminders WHERE user_id = ?', [userId]);
    await conn.execute('DELETE FROM achievements WHERE user_id = ?', [userId]);
    await conn.execute('DELETE FROM export_history WHERE user_id = ?', [userId]);
    await conn.execute('DELETE FROM habits WHERE user_id = ?', [userId]);

    // Update settings data_reset_at timestamp
    await conn.execute(
      `INSERT INTO user_settings (user_id, data_reset_at)
       VALUES (?, NOW())
       ON DUPLICATE KEY UPDATE data_reset_at = NOW(), updated_at = NOW()`,
      [userId]
    );

    await conn.commit();
    return ok(res, 200, 'All user habit data has been reset successfully.');
  } catch (e) {
    if (conn) await conn.rollback();
    console.error('Reset user data error:', e);
    return err(res, 500, 'Server error resetting user data.');
  } finally {
    if (conn) conn.release();
  }
};

/**
 * GET /api/reminders
 * Fetch user reminders
 */
const getReminders = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.execute(
      `SELECT r.id, r.habit_id, h.name AS habit_name, r.reminder_time, r.is_enabled, r.days_of_week, r.message, r.last_sent_at, r.created_at
       FROM reminders r
       LEFT JOIN habits h ON h.id = r.habit_id
       WHERE r.user_id = ?
       ORDER BY r.reminder_time ASC`,
      [req.user.id]
    );

    return ok(res, 200, 'Reminders retrieved.', { reminders: rows });
  } catch (e) {
    console.error('Get reminders error:', e);
    return err(res, 500, 'Server error fetching reminders.');
  } finally {
    if (conn) conn.release();
  }
};

/**
 * POST /api/reminders
 * Save or update daily reminder settings & time
 */
const createOrUpdateReminder = async (req, res) => {
  let conn;
  try {
    const { habit_id, reminder_time, is_enabled, days_of_week, message } = req.body;
    
    if (!reminder_time) {
      return err(res, 400, 'Reminder time is required.');
    }

    conn = await pool.getConnection();

    // Check if reminder already exists for user (or specific habit)
    const habitIdVal = habit_id || null;
    const [existing] = await conn.execute(
      'SELECT id FROM reminders WHERE user_id = ? AND (habit_id IS NULL OR habit_id = ?) LIMIT 1',
      [req.user.id, habitIdVal]
    );

    const enabledVal = is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1;
    const msgVal     = message || 'Daily habit reminder from HabitFlow 🌱';
    const daysJson   = days_of_week ? JSON.stringify(days_of_week) : null;

    let reminderId;
    if (existing.length > 0) {
      reminderId = existing[0].id;
      await conn.execute(
        `UPDATE reminders
         SET reminder_time = ?, is_enabled = ?, days_of_week = ?, message = ?, updated_at = NOW()
         WHERE id = ?`,
        [reminder_time, enabledVal, daysJson, msgVal, reminderId]
      );
    } else {
      const [resIns] = await conn.execute(
        `INSERT INTO reminders (user_id, habit_id, reminder_time, is_enabled, days_of_week, message)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, habitIdVal, reminder_time, enabledVal, daysJson, msgVal]
      );
      reminderId = resIns.insertId;
    }

    // Also sync user_settings reminder_time and notifications_enabled
    await conn.execute(
      `INSERT INTO user_settings (user_id, reminder_time, notifications_enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE reminder_time = VALUES(reminder_time), notifications_enabled = VALUES(notifications_enabled), updated_at = NOW()`,
      [req.user.id, reminder_time, enabledVal]
    );

    return ok(res, 200, 'Reminder time saved successfully.', {
      reminder: {
        id: reminderId,
        user_id: req.user.id,
        habit_id: habitIdVal,
        reminder_time,
        is_enabled: !!enabledVal,
        days_of_week,
        message: msgVal
      }
    });
  } catch (e) {
    console.error('Create/Update reminder error:', e);
    return err(res, 500, 'Server error saving reminder.');
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetUserData,
  getReminders,
  createOrUpdateReminder
};
