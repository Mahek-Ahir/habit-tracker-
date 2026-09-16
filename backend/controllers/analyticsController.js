'use strict';
const { pool } = require('../config/db');
const { todayStr, subtractDays } = require('../utils/dateUtils');
const { buildWeeklyChart, buildMonthlyChart, buildCategoryChart, buildCompletionStats, buildCalendarData, findBestHabit, buildMissedHabitAnalysis, computeProductivityScore } = require('../utils/analyticsUtils');

function ok(res, code, msg, data = {}) { return res.status(code).json({ success: true,  message: msg, ...data }); }
function err(res, code, msg)           { return res.status(code).json({ success: false, message: msg }); }

async function getActiveHabits(conn, userId) {
  const [rows] = await conn.execute(
    `SELECT h.id, h.name, h.frequency, h.custom_days, h.start_date, h.current_streak,
            h.longest_streak, h.total_completions, h.missed_days, h.category_id,
            c.slug AS category_slug, c.label AS category_label, c.color_hex AS category_color
     FROM habits h JOIN categories c ON c.id = h.category_id
     WHERE h.user_id = ? AND h.is_archived = 0`,
    [userId]
  );
  return rows.map(h => ({
    ...h,
    custom_days: h.custom_days ? (typeof h.custom_days === 'string' ? JSON.parse(h.custom_days) : h.custom_days) : null,
  }));
}

/* ── GET /api/analytics/weekly ── */
const getWeeklyAnalytics = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const userId = req.user.id;
    const today  = todayStr();
    const from   = subtractDays(today, 6);
    const habits = await getActiveHabits(conn, userId);
    const [logs] = await conn.execute(
      'SELECT habit_id, log_date, completed FROM habit_logs WHERE user_id=? AND completed=1 AND log_date BETWEEN ? AND ?',
      [userId, from, today]
    );
    const chart = buildWeeklyChart(habits, logs, today);
    return ok(res, 200, 'Weekly analytics fetched.', { chart_type:'bar', range:{ from, to:today }, ...chart });
  } catch (e) { console.error('Weekly analytics error:', e); return err(res, 500, 'Server error fetching weekly analytics.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/analytics/monthly ── */
const getMonthlyAnalytics = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const userId = req.user.id;
    const today  = todayStr();
    const d      = new Date(today + 'T00:00:00Z');
    const from   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 5, 1)).toISOString().slice(0,10);
    const [logs] = await conn.execute(
      'SELECT log_date, completed FROM habit_logs WHERE user_id=? AND completed=1 AND log_date BETWEEN ? AND ?',
      [userId, from, today]
    );
    const chart = buildMonthlyChart(logs, today);
    return ok(res, 200, 'Monthly analytics fetched.', { chart_type:'bar', range:{ from, to:today }, ...chart });
  } catch (e) { console.error('Monthly analytics error:', e); return err(res, 500, 'Server error fetching monthly analytics.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/analytics/category ── */
const getCategoryAnalytics = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const habits = await getActiveHabits(conn, req.user.id);
    const chart  = buildCategoryChart(habits);
    return ok(res, 200, 'Category analytics fetched.', { chart_type:'doughnut', ...chart });
  } catch (e) { console.error('Category analytics error:', e); return err(res, 500, 'Server error fetching category analytics.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/analytics/completion ── */
const getCompletionAnalytics = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const userId = req.user.id;
    const today  = todayStr();
    const window = 30;
    const from   = subtractDays(today, window - 1);
    const habits = await getActiveHabits(conn, userId);
    const [todayLogs]  = await conn.execute('SELECT habit_id, completed FROM habit_logs WHERE user_id=? AND log_date=?', [userId, today]);
    const [windowLogs] = await conn.execute('SELECT habit_id, log_date, completed FROM habit_logs WHERE user_id=? AND completed=1 AND log_date BETWEEN ? AND ?', [userId, from, today]);
    const stats = buildCompletionStats(habits, todayLogs, windowLogs, window);
    const prod  = computeProductivityScore(stats, habits);
    return ok(res, 200, 'Completion analytics fetched.', { ...stats, productivity_score: prod.score, productivity_label: prod.label, productivity_breakdown: prod.breakdown });
  } catch (e) { console.error('Completion analytics error:', e); return err(res, 500, 'Server error fetching completion analytics.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/calendar/:month/:year ── */
const getCalendarData = async (req, res) => {
  let conn;
  try {
    const month = parseInt(req.params.month, 10);
    const year  = parseInt(req.params.year,  10);
    if (isNaN(month) || month < 1 || month > 12)     return err(res, 400, 'Month must be 1-12.');
    if (isNaN(year)  || year < 2000 || year > 2100)  return err(res, 400, 'Year must be a valid 4-digit year.');
    conn = await pool.getConnection();
    const userId      = req.user.id;
    const monthStr    = String(month).padStart(2,'0');
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const from        = `${year}-${monthStr}-01`;
    const to          = `${year}-${monthStr}-${String(daysInMonth).padStart(2,'0')}`;
    const habits      = await getActiveHabits(conn, userId);
    const [logs]      = await conn.execute('SELECT habit_id, log_date, completed FROM habit_logs WHERE user_id=? AND log_date BETWEEN ? AND ?', [userId, from, to]);
    const calendar    = buildCalendarData(year, month, logs, habits);
    return ok(res, 200, 'Calendar data fetched.', calendar);
  } catch (e) { console.error('Calendar data error:', e); return err(res, 500, 'Server error fetching calendar data.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/analytics/best-habit ── */
const getBestHabit = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const habits = await getActiveHabits(conn, req.user.id);
    const best   = findBestHabit(habits);
    if (!best) return ok(res, 200, 'No habits found yet.', { best_habit: null });
    return ok(res, 200, 'Best habit fetched.', { best_habit: best });
  } catch (e) { console.error('Best habit error:', e); return err(res, 500, 'Server error fetching best habit.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/analytics/missed-habits ── */
const getMissedHabits = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const userId  = req.user.id;
    const today   = todayStr();
    let   window  = parseInt(req.query.days, 10);
    if (isNaN(window) || window < 1 || window > 90) window = 14;
    const from   = subtractDays(today, window - 1);
    const habits = await getActiveHabits(conn, userId);
    const [logs] = await conn.execute('SELECT habit_id, log_date, completed FROM habit_logs WHERE user_id=? AND log_date BETWEEN ? AND ?', [userId, from, today]);
    const analysis = buildMissedHabitAnalysis(habits, logs, window);
    return ok(res, 200, 'Missed habit analysis fetched.', analysis);
  } catch (e) { console.error('Missed habits error:', e); return err(res, 500, 'Server error fetching missed habit analysis.'); }
  finally     { if (conn) conn.release(); }
};

module.exports = { getWeeklyAnalytics, getMonthlyAnalytics, getCategoryAnalytics, getCompletionAnalytics, getCalendarData, getBestHabit, getMissedHabits };
