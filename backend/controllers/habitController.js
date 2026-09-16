'use strict';
const { pool } = require('../config/db');

function ok(res, code, msg, data = {}) { return res.status(code).json({ success: true,  message: msg, ...data }); }
function err(res, code, msg)           { return res.status(code).json({ success: false, message: msg }); }

const VALID_FREQ  = ['daily','weekdays','weekends','weekly','custom'];
const HEX_REGEX   = /^#[0-9A-Fa-f]{6}$/;
const DATE_REGEX  = /^\d{4}-\d{2}-\d{2}$/;

const SELECT_SQL = `
  SELECT h.*, c.slug AS category_slug, c.label AS category_label,
         c.icon_emoji AS category_icon, c.color_hex AS category_color
  FROM habits h JOIN categories c ON c.id = h.category_id`;

function fmt(r) {
  return {
    id: r.id, user_id: r.user_id, name: r.name, description: r.description,
    category_id: r.category_id, category: r.category_slug, category_label: r.category_label,
    category_icon: r.category_icon, category_color: r.category_color,
    icon_emoji: r.icon_emoji, color_hex: r.color_hex, frequency: r.frequency,
    custom_days: r.custom_days ? (typeof r.custom_days==='string' ? JSON.parse(r.custom_days) : r.custom_days) : null,
    start_date: r.start_date, current_streak: r.current_streak, longest_streak: r.longest_streak,
    total_completions: r.total_completions, missed_days: r.missed_days,
    is_archived: !!r.is_archived, sort_order: r.sort_order,
    created_at: r.created_at, updated_at: r.updated_at,
  };
}

function validate(body, partial = false) {
  const { name, category_id, start_date, frequency, custom_days, color_hex, icon_emoji, description } = body;
  if (!partial || name        !== undefined) { if (!name || !name.trim()) return 'Habit name is required.'; if (name.length > 120) return 'Name max 120 chars.'; }
  if (!partial || category_id !== undefined) { if (category_id === undefined || category_id === null || category_id === '') return 'Category is required.'; if (isNaN(parseInt(category_id,10))) return 'Invalid category id.'; }
  if (!partial || start_date  !== undefined) { if (!start_date) return 'Start date is required.'; if (!DATE_REGEX.test(start_date)) return 'Start date must be YYYY-MM-DD.'; }
  if (frequency !== undefined && frequency !== null && !VALID_FREQ.includes(frequency)) return `Frequency must be one of: ${VALID_FREQ.join(', ')}.`;
  if (frequency === 'custom') { if (!Array.isArray(custom_days)||custom_days.length===0) return 'custom_days required when frequency=custom.'; if (!custom_days.every(d=>Number.isInteger(d)&&d>=0&&d<=6)) return 'custom_days must be integers 0-6.'; }
  if (color_hex  !== undefined && color_hex  !== null && color_hex  !== '' && !HEX_REGEX.test(color_hex))  return 'color_hex must be #RRGGBB format.';
  if (icon_emoji !== undefined && icon_emoji !== null && icon_emoji.length > 10) return 'icon_emoji too long.';
  if (description !== undefined && description !== null && description.length > 2000) return 'Description max 2000 chars.';
  return '';
}

/* ── POST /api/habits ── */
const createHabit = async (req, res) => {
  let conn;
  try {
    const e = validate(req.body);
    if (e) return err(res, 400, e);
    const { name, description, category_id, icon_emoji, color_hex, frequency, custom_days, start_date } = req.body;
    conn = await pool.getConnection();
    const [cat] = await conn.execute('SELECT id FROM categories WHERE id=? LIMIT 1', [category_id]);
    if (cat.length === 0) return err(res, 400, 'Selected category does not exist.');
    const freq = frequency || 'daily';
    const [result] = await conn.execute(
      'INSERT INTO habits (user_id,category_id,name,description,icon_emoji,color_hex,frequency,custom_days,start_date) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.user.id, category_id, name.trim(), description ? description.trim() : null,
       icon_emoji||'⭐', color_hex||'#7c3aed', freq,
       freq==='custom' ? JSON.stringify(custom_days) : null, start_date]
    );
    const [rows] = await conn.execute(`${SELECT_SQL} WHERE h.id=? LIMIT 1`, [result.insertId]);
    return ok(res, 201, 'Habit created successfully! 🌱', { habit: fmt(rows[0]) });
  } catch (e) { console.error('Create habit error:', e); return err(res, 500, 'Server error creating habit.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/habits ── */
const getHabits = async (req, res) => {
  let conn;
  try {
    const { category, archived, sort } = req.query;
    conn = await pool.getConnection();
    let sql = `${SELECT_SQL} WHERE h.user_id=?`;
    const p = [req.user.id];
    if (archived === 'true')       sql += ' AND h.is_archived=1';
    else if (archived !== 'all')   sql += ' AND h.is_archived=0';
    if (category) { sql += ' AND c.slug=?'; p.push(category); }
    const sortMap = { streak: 'h.current_streak DESC', name: 'h.name ASC', newest: 'h.created_at DESC', oldest: 'h.created_at ASC' };
    sql += ` ORDER BY ${sortMap[sort] || 'h.sort_order ASC, h.created_at DESC'}`;
    const [rows] = await conn.execute(sql, p);
    return ok(res, 200, 'Habits fetched.', { count: rows.length, habits: rows.map(fmt) });
  } catch (e) { console.error('Get habits error:', e); return err(res, 500, 'Server error fetching habits.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/habits/:id ── */
const getHabitById = async (req, res) => {
  let conn;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return err(res, 400, 'Invalid habit id.');
    conn = await pool.getConnection();
    const [rows] = await conn.execute(`${SELECT_SQL} WHERE h.id=? AND h.user_id=? LIMIT 1`, [id, req.user.id]);
    if (rows.length === 0) return err(res, 404, 'Habit not found.');
    return ok(res, 200, 'Habit fetched.', { habit: fmt(rows[0]) });
  } catch (e) { console.error('Get habit error:', e); return err(res, 500, 'Server error fetching habit.'); }
  finally     { if (conn) conn.release(); }
};

/* ── PUT /api/habits/:id ── */
const updateHabit = async (req, res) => {
  let conn;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return err(res, 400, 'Invalid habit id.');
    const e = validate(req.body, true);
    if (e) return err(res, 400, e);
    conn = await pool.getConnection();
    const [existing] = await conn.execute('SELECT id, frequency AS cur_freq FROM habits WHERE id=? AND user_id=? LIMIT 1', [id, req.user.id]);
    if (existing.length === 0) return err(res, 404, 'Habit not found.');
    const { name, description, category_id, icon_emoji, color_hex, frequency, custom_days, start_date, is_archived, sort_order } = req.body;
    if (category_id !== undefined) {
      const [cat] = await conn.execute('SELECT id FROM categories WHERE id=? LIMIT 1', [category_id]);
      if (cat.length === 0) return err(res, 400, 'Selected category does not exist.');
    }
    const effFreq = frequency !== undefined ? frequency : existing[0].cur_freq;
    const fields = [], vals = [];
    if (name        !== undefined) { fields.push('name=?');        vals.push(name.trim()); }
    if (description !== undefined) { fields.push('description=?'); vals.push(description ? description.trim() : null); }
    if (category_id !== undefined) { fields.push('category_id=?'); vals.push(category_id); }
    if (icon_emoji  !== undefined) { fields.push('icon_emoji=?');  vals.push(icon_emoji); }
    if (color_hex   !== undefined) { fields.push('color_hex=?');   vals.push(color_hex); }
    if (frequency   !== undefined) { fields.push('frequency=?');   vals.push(frequency); }
    if (custom_days !== undefined) { fields.push('custom_days=?'); vals.push(effFreq==='custom' ? JSON.stringify(custom_days) : null); }
    if (start_date  !== undefined) { fields.push('start_date=?');  vals.push(start_date); }
    if (is_archived !== undefined) { fields.push('is_archived=?'); vals.push(is_archived ? 1 : 0); }
    if (sort_order  !== undefined) { fields.push('sort_order=?');  vals.push(sort_order); }
    if (fields.length === 0)       return err(res, 400, 'No valid fields provided to update.');
    fields.push('updated_at=NOW()');
    await conn.execute(`UPDATE habits SET ${fields.join(',')} WHERE id=? AND user_id=?`, [...vals, id, req.user.id]);
    const [rows] = await conn.execute(`${SELECT_SQL} WHERE h.id=? LIMIT 1`, [id]);
    return ok(res, 200, 'Habit updated.', { habit: fmt(rows[0]) });
  } catch (e) { console.error('Update habit error:', e); return err(res, 500, 'Server error updating habit.'); }
  finally     { if (conn) conn.release(); }
};

/* ── DELETE /api/habits/:id ── */
const deleteHabit = async (req, res) => {
  let conn;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return err(res, 400, 'Invalid habit id.');
    conn = await pool.getConnection();
    const [existing] = await conn.execute('SELECT id, name FROM habits WHERE id=? AND user_id=? LIMIT 1', [id, req.user.id]);
    if (existing.length === 0) return err(res, 404, 'Habit not found.');
    await conn.execute('DELETE FROM habits WHERE id=? AND user_id=?', [id, req.user.id]);
    return ok(res, 200, `Habit "${existing[0].name}" deleted.`);
  } catch (e) { console.error('Delete habit error:', e); return err(res, 500, 'Server error deleting habit.'); }
  finally     { if (conn) conn.release(); }
};

module.exports = { createHabit, getHabits, getHabitById, updateHabit, deleteHabit };
