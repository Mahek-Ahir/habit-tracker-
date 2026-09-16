'use strict';
const { pool } = require('../config/db');
const { todayStr, isValidDateStr, isFutureDate } = require('../utils/dateUtils');
const { computeStreakStats } = require('../utils/streakUtils');

function ok(res, code, msg, data = {}) { return res.status(code).json({ success: true,  message: msg, ...data }); }
function err(res, code, msg)           { return res.status(code).json({ success: false, message: msg }); }

async function getOwnedHabit(conn, habitId, userId) {
  const [rows] = await conn.execute(
    'SELECT id, user_id, name, frequency, custom_days, start_date, current_streak, longest_streak, total_completions, missed_days FROM habits WHERE id=? AND user_id=? LIMIT 1',
    [habitId, userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function recalculate(conn, habit) {
  const [logRows] = await conn.execute('SELECT log_date FROM habit_logs WHERE habit_id=? AND completed=1', [habit.id]);
  const dset = new Set(logRows.map(r => r.log_date instanceof Date ? r.log_date.toISOString().slice(0,10) : String(r.log_date)));
  const cd   = habit.custom_days ? (typeof habit.custom_days==='string' ? JSON.parse(habit.custom_days) : habit.custom_days) : null;
  const sd   = habit.start_date instanceof Date ? habit.start_date.toISOString().slice(0,10) : String(habit.start_date);
  const stats = computeStreakStats({ frequency: habit.frequency, custom_days: cd, start_date: sd }, dset);
  await conn.execute(
    'UPDATE habits SET current_streak=?, longest_streak=?, missed_days=?, total_completions=?, updated_at=NOW() WHERE id=?',
    [stats.currentStreak, stats.longestStreak, stats.missedDays, stats.totalCompletions, habit.id]
  );
  return stats;
}

/* ── POST /api/habits/:id/complete ── */
const markComplete = async (req, res) => {
  let conn;
  try {
    const habitId = parseInt(req.params.id, 10);
    if (isNaN(habitId)) return err(res, 400, 'Invalid habit id.');
    const date = req.body && req.body.date ? req.body.date : todayStr();
    const note = req.body && req.body.note ? String(req.body.note).slice(0,255) : null;
    if (!isValidDateStr(date)) return err(res, 400, 'Date must be YYYY-MM-DD.');
    if (isFutureDate(date))    return err(res, 400, 'Cannot mark a future date complete.');
    conn = await pool.getConnection();
    const habit = await getOwnedHabit(conn, habitId, req.user.id);
    if (!habit) return err(res, 404, 'Habit not found.');
    const startStr = habit.start_date instanceof Date ? habit.start_date.toISOString().slice(0,10) : String(habit.start_date);
    if (date < startStr) return err(res, 400, "Cannot mark a date before the habit's start date.");
    const [existing] = await conn.execute('SELECT id, completed FROM habit_logs WHERE habit_id=? AND log_date=? LIMIT 1', [habitId, date]);
    if (existing.length > 0 && existing[0].completed === 1) return err(res, 409, `Already marked complete for ${date}.`);
    if (existing.length > 0) {
      await conn.execute('UPDATE habit_logs SET completed=1, note=?, logged_at=NOW() WHERE id=?', [note, existing[0].id]);
    } else {
      try {
        await conn.execute('INSERT INTO habit_logs (habit_id, user_id, log_date, completed, note) VALUES (?,?,?,1,?)', [habitId, req.user.id, date, note]);
      } catch (insErr) {
        if (insErr.code === 'ER_DUP_ENTRY') return err(res, 409, `Already marked complete for ${date}.`);
        throw insErr;
      }
    }
    const stats = await recalculate(conn, habit);
    return ok(res, 201, `Habit marked complete for ${date}! 🎉`, { habit_id: habitId, date, completed: true, current_streak: stats.currentStreak, longest_streak: stats.longestStreak, missed_days: stats.missedDays, total_completions: stats.totalCompletions });
  } catch (e) { console.error('Mark complete error:', e); return err(res, 500, 'Server error marking habit complete.'); }
  finally     { if (conn) conn.release(); }
};

/* ── DELETE /api/habits/:id/complete ── */
const markIncomplete = async (req, res) => {
  let conn;
  try {
    const habitId = parseInt(req.params.id, 10);
    if (isNaN(habitId)) return err(res, 400, 'Invalid habit id.');
    const date = req.body && req.body.date ? req.body.date : todayStr();
    if (!isValidDateStr(date)) return err(res, 400, 'Date must be YYYY-MM-DD.');
    conn = await pool.getConnection();
    const habit = await getOwnedHabit(conn, habitId, req.user.id);
    if (!habit) return err(res, 404, 'Habit not found.');
    const [existing] = await conn.execute('SELECT id, completed FROM habit_logs WHERE habit_id=? AND log_date=? LIMIT 1', [habitId, date]);
    if (existing.length === 0 || existing[0].completed === 0) return err(res, 404, `Habit was not marked complete for ${date}.`);
    await conn.execute('UPDATE habit_logs SET completed=0, logged_at=NOW() WHERE id=?', [existing[0].id]);
    const stats = await recalculate(conn, habit);
    return ok(res, 200, `Habit unmarked for ${date}.`, { habit_id: habitId, date, completed: false, current_streak: stats.currentStreak, longest_streak: stats.longestStreak, missed_days: stats.missedDays, total_completions: stats.totalCompletions });
  } catch (e) { console.error('Mark incomplete error:', e); return err(res, 500, 'Server error unmarking habit.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/habits/:id/streak ── */
const getHabitStreak = async (req, res) => {
  let conn;
  try {
    const habitId = parseInt(req.params.id, 10);
    if (isNaN(habitId)) return err(res, 400, 'Invalid habit id.');
    conn = await pool.getConnection();
    const habit = await getOwnedHabit(conn, habitId, req.user.id);
    if (!habit) return err(res, 404, 'Habit not found.');
    const stats = await recalculate(conn, habit);
    const today = todayStr();
    const [todayRow] = await conn.execute('SELECT completed FROM habit_logs WHERE habit_id=? AND log_date=? LIMIT 1', [habitId, today]);
    const [recent]   = await conn.execute('SELECT log_date FROM habit_logs WHERE habit_id=? AND completed=1 ORDER BY log_date DESC LIMIT 30', [habitId]);
    return ok(res, 200, 'Streak data fetched.', {
      habit_id: habitId, habit_name: habit.name,
      current_streak: stats.currentStreak, longest_streak: stats.longestStreak,
      missed_days: stats.missedDays, total_completions: stats.totalCompletions,
      completed_today: todayRow.length > 0 && todayRow[0].completed === 1,
      recent_dates: recent.map(r => r.log_date instanceof Date ? r.log_date.toISOString().slice(0,10) : String(r.log_date)),
    });
  } catch (e) { console.error('Get streak error:', e); return err(res, 500, 'Server error fetching streak.'); }
  finally     { if (conn) conn.release(); }
};

/* ── GET /api/dashboard/stats ── */
const getDashboardStats = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const userId = req.user.id;
    const today  = todayStr();
    const [habits] = await conn.execute(
      'SELECT id, name, frequency, custom_days, start_date, current_streak, longest_streak, total_completions, missed_days FROM habits WHERE user_id=? AND is_archived=0',
      [userId]
    );
    if (habits.length === 0) return ok(res, 200, 'Dashboard stats fetched.', { total_habits:0, completed_today:0, pending_today:0, completion_rate_today:0, best_streak:0, best_habit:null, total_missed_days:0, total_completions:0, habits_today:[] });
    const [todayLogs] = await conn.execute('SELECT habit_id, completed FROM habit_logs WHERE user_id=? AND log_date=?', [userId, today]);
    const doneSet = new Set(todayLogs.filter(r => r.completed===1).map(r => r.habit_id));
    let bestStreak=0, bestHabit=null, totalMissed=0, totalComp=0;
    const habitsToday = [];
    for (const h of habits) {
      if (h.current_streak > bestStreak) { bestStreak = h.current_streak; bestHabit = { id:h.id, name:h.name, current_streak:h.current_streak }; }
      totalMissed += h.missed_days; totalComp += h.total_completions;
      habitsToday.push({ id:h.id, name:h.name, completed_today:doneSet.has(h.id), current_streak:h.current_streak });
    }
    const completedToday = doneSet.size;
    return ok(res, 200, 'Dashboard stats fetched.', {
      total_habits: habits.length, completed_today: completedToday, pending_today: habits.length - completedToday,
      completion_rate_today: Math.round((completedToday/habits.length)*100),
      best_streak: bestStreak, best_habit: bestHabit, total_missed_days: totalMissed,
      total_completions: totalComp, habits_today: habitsToday,
    });
  } catch (e) { console.error('Dashboard stats error:', e); return err(res, 500, 'Server error fetching dashboard stats.'); }
  finally     { if (conn) conn.release(); }
};

module.exports = { markComplete, markIncomplete, getHabitStreak, getDashboardStats };
