'use strict';
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

function ok(res, code, msg, data = {}) { return res.status(code).json({ success: true,  message: msg, ...data }); }
function err(res, code, msg)           { return res.status(code).json({ success: false, message: msg }); }

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
function isValidEmail(e)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function isValidUsername(u) { return /^[a-zA-Z0-9_]{3,30}$/.test(u); }

/* ── POST /api/auth/register ── */
const register = async (req, res) => {
  let conn;
  try {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) return err(res, 400, 'Username, email, and password are required.');
    if (!isValidUsername(username))        return err(res, 400, 'Username must be 3-30 chars: letters, numbers, underscores only.');
    if (!isValidEmail(email))              return err(res, 400, 'Please provide a valid email address.');
    if (password.length < 6)              return err(res, 400, 'Password must be at least 6 characters.');

    conn = await pool.getConnection();

    const [emailRows] = await conn.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase().trim()]);
    if (emailRows.length > 0) return err(res, 409, 'An account with this email already exists.');

    const [userRows] = await conn.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [username.trim()]);
    if (userRows.length > 0) return err(res, 409, 'This username is taken. Please choose another.');

    const hash = await bcrypt.hash(password, 12);

    const [result] = await conn.execute(
      'INSERT INTO users (username, email, password_hash, display_name, is_active, email_verified) VALUES (?,?,?,?,1,0)',
      [username.trim(), email.toLowerCase().trim(), hash, display_name ? display_name.trim() : username.trim()]
    );
    const newId = result.insertId;

    await conn.execute('INSERT INTO user_settings (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id=user_id', [newId]);

    const token = generateToken({ id: newId, username: username.trim(), email: email.toLowerCase().trim() });

    return ok(res, 201, 'Account created successfully! Welcome to HabitFlow 🌱', {
      token,
      user: { id: newId, username: username.trim(), email: email.toLowerCase().trim(), display_name: display_name ? display_name.trim() : username.trim() },
    });
  } catch (e) { console.error('Register error:', e); return err(res, 500, 'Server error during registration.'); }
  finally     { if (conn) conn.release(); }
};

/* ── POST /api/auth/login ── */
const login = async (req, res) => {
  let conn;
  try {
    const { email, password } = req.body;
    if (!email || !password) return err(res, 400, 'Email and password are required.');
    if (!isValidEmail(email)) return err(res, 400, 'Please provide a valid email address.');

    conn = await pool.getConnection();
    const [rows] = await conn.execute(
      'SELECT id, username, email, password_hash, display_name, avatar_url, is_active FROM users WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );
    if (rows.length === 0) return err(res, 401, 'Invalid email or password.');

    const user = rows[0];
    if (!user.is_active) return err(res, 403, 'Account is deactivated. Please contact support.');

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return err(res, 401, 'Invalid email or password.');

    await conn.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const [settingsRows] = await conn.execute(
      'SELECT theme, accent_color, font_size, notifications_enabled, reminder_time, streak_alerts, weekly_summary FROM user_settings WHERE user_id = ? LIMIT 1',
      [user.id]
    );

    const token = generateToken({ id: user.id, username: user.username, email: user.email });

    return ok(res, 200, 'Login successful! Welcome back 👋', {
      token,
      user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name, avatar_url: user.avatar_url, settings: settingsRows[0] || {} },
    });
  } catch (e) { console.error('Login error:', e); return err(res, 500, 'Server error during login.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/auth/profile ── */
const getProfile = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.execute(
      `SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.email_verified, u.last_login_at, u.created_at,
              s.theme, s.accent_color, s.font_size, s.notifications_enabled, s.reminder_time, s.streak_alerts, s.weekly_summary
       FROM users u LEFT JOIN user_settings s ON s.user_id = u.id
       WHERE u.id = ? AND u.is_active = 1 LIMIT 1`,
      [req.user.id]
    );
    if (rows.length === 0) return err(res, 404, 'User not found.');
    const u = rows[0];
    return ok(res, 200, 'Profile fetched.', {
      user: {
        id: u.id, username: u.username, email: u.email, display_name: u.display_name,
        avatar_url: u.avatar_url, email_verified: !!u.email_verified,
        last_login_at: u.last_login_at, created_at: u.created_at,
        settings: { theme: u.theme, accent_color: u.accent_color, font_size: u.font_size,
          notifications_enabled: !!u.notifications_enabled, reminder_time: u.reminder_time,
          streak_alerts: !!u.streak_alerts, weekly_summary: !!u.weekly_summary },
      },
    });
  } catch (e) { console.error('Get profile error:', e); return err(res, 500, 'Server error fetching profile.'); }
  finally     { if (conn) conn.release(); }
};

/* ── PUT /api/auth/profile ── */
const updateProfile = async (req, res) => {
  let conn;
  try {
    const { display_name, avatar_url } = req.body;
    if (!display_name && !avatar_url) return err(res, 400, 'Provide at least one field to update.');
    conn = await pool.getConnection();
    await conn.execute(
      'UPDATE users SET display_name=COALESCE(?,display_name), avatar_url=COALESCE(?,avatar_url), updated_at=NOW() WHERE id=?',
      [display_name || null, avatar_url || null, req.user.id]
    );
    return ok(res, 200, 'Profile updated successfully.');
  } catch (e) { console.error('Update profile error:', e); return err(res, 500, 'Server error updating profile.'); }
  finally     { if (conn) conn.release(); }
};

/* ── PUT /api/auth/change-password ── */
const changePassword = async (req, res) => {
  let conn;
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return err(res, 400, 'Both current and new password are required.');
    if (new_password.length < 6)            return err(res, 400, 'New password must be at least 6 characters.');
    if (current_password === new_password)  return err(res, 400, 'New password must differ from current password.');
    conn = await pool.getConnection();
    const [rows] = await conn.execute('SELECT password_hash FROM users WHERE id=? LIMIT 1', [req.user.id]);
    if (rows.length === 0) return err(res, 404, 'User not found.');
    const match = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!match) return err(res, 401, 'Current password is incorrect.');
    const newHash = await bcrypt.hash(new_password, 12);
    await conn.execute('UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?', [newHash, req.user.id]);
    return ok(res, 200, 'Password changed successfully.');
  } catch (e) { console.error('Change password error:', e); return err(res, 500, 'Server error changing password.'); }
  finally     { if (conn) conn.release(); }
};

/* ── PUT /api/auth/settings ── */
const updateSettings = async (req, res) => {
  let conn;
  try {
    const { theme, accent_color, font_size, notifications_enabled, reminder_time, streak_alerts, weekly_summary } = req.body;
    const validThemes  = ['dark','light'];
    const validAccents = ['purple','blue','green','pink','orange','teal','yellow','red'];
    const validFonts   = ['small','medium','large','xlarge'];
    if (theme        && !validThemes.includes(theme))        return err(res, 400, `Invalid theme. Allowed: ${validThemes.join(', ')}`);
    if (accent_color && !validAccents.includes(accent_color)) return err(res, 400, `Invalid accent_color.`);
    if (font_size    && !validFonts.includes(font_size))     return err(res, 400, `Invalid font_size.`);
    conn = await pool.getConnection();
    await conn.execute(
      `INSERT INTO user_settings (user_id,theme,accent_color,font_size,notifications_enabled,reminder_time,streak_alerts,weekly_summary)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         theme=COALESCE(VALUES(theme),theme),
         accent_color=COALESCE(VALUES(accent_color),accent_color),
         font_size=COALESCE(VALUES(font_size),font_size),
         notifications_enabled=COALESCE(VALUES(notifications_enabled),notifications_enabled),
         reminder_time=COALESCE(VALUES(reminder_time),reminder_time),
         streak_alerts=COALESCE(VALUES(streak_alerts),streak_alerts),
         weekly_summary=COALESCE(VALUES(weekly_summary),weekly_summary),
         updated_at=NOW()`,
      [req.user.id, theme||null, accent_color||null, font_size||null,
       notifications_enabled !== undefined ? (notifications_enabled?1:0) : null,
       reminder_time||null,
       streak_alerts !== undefined ? (streak_alerts?1:0) : null,
       weekly_summary !== undefined ? (weekly_summary?1:0) : null]
    );
    return ok(res, 200, 'Settings updated successfully.');
  } catch (e) { console.error('Update settings error:', e); return err(res, 500, 'Server error updating settings.'); }
  finally     { if (conn) conn.release(); }
};

/* ── POST /api/auth/logout ── */
const logout = (_req, res) => ok(res, 200, 'Logged out successfully. See you soon! 👋');

module.exports = { register, login, getProfile, updateProfile, changePassword, updateSettings, logout };
