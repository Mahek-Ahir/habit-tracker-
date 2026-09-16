/* ═══════════════════════════════════════════════════════════════
   js/TrackingController.js — Phase 7
   Fetches streak details and today's tracking stats from MySQL.
═══════════════════════════════════════════════════════════════ */
'use strict';

const TrackingController = (() => {

  let _dashStats   = null;   // cached dashboard stats
  let _streakCache = {};     // { [habitId]: streakData }

  /* ── GET DASHBOARD STATS ─────────────────────────────────── */
  async function getDashboardStats(force = false) {
    if (_dashStats && !force) return _dashStats;
    const r = await TrackingAPI.getDashboard();
    if (!r || !r.success) return null;
    _dashStats = r;
    return _dashStats;
  }

  /* ── GET STREAK FOR ONE HABIT ────────────────────────────── */
  async function getStreak(habitId, force = false) {
    if (_streakCache[habitId] && !force) return _streakCache[habitId];
    const data = await TrackingAPI.getStreak(habitId);
    if (!data) return null;
    _streakCache[habitId] = data;
    return data;
  }

  /* ── INVALIDATE CACHE AFTER TOGGLE ──────────────────────── */
  function invalidate(habitId) {
    _dashStats = null;
    if (habitId) delete _streakCache[habitId];
  }

  /* ── BUILD STATS OBJECT FOR DASHBOARD VIEW ───────────────── */
  async function buildDashboardData() {
    const stats = await getDashboardStats(true);
    const habits = window.HabitController ? HabitController.getAll() : [];

    if (!stats) {
      // Fallback: calculate from local cache if API unreachable
      const todayStr = new Date().toISOString().slice(0, 10);
      const doneToday = habits.filter(h => h.completedDates && h.completedDates.includes(todayStr));
      return {
        totalHabits    : habits.length,
        completedToday : doneToday.length,
        pendingToday   : habits.length - doneToday.length,
        completionRate : habits.length ? Math.round((doneToday.length / habits.length) * 100) : 0,
        bestStreak     : Math.max(0, ...habits.map(h => h.streak || 0)),
        bestHabit      : null,
        totalMissed    : habits.reduce((s, h) => s + (h.missedDays || 0), 0),
        totalCompletions: habits.reduce((s, h) => s + (h.totalCompleted || 0), 0),
      };
    }

    return {
      totalHabits    : stats.total_habits       || 0,
      completedToday : stats.completed_today    || 0,
      pendingToday   : stats.pending_today      || 0,
      completionRate : stats.completion_rate_today || 0,
      bestStreak     : stats.best_streak        || 0,
      bestHabit      : stats.best_habit         || null,
      totalMissed    : stats.total_missed_days  || 0,
      totalCompletions: stats.total_completions || 0,
    };
  }

  /* ── GET RECENT DATES FOR CALENDAR/HISTORY ───────────────── */
  async function getRecentDates(habitId) {
    const data = await getStreak(habitId, true);
    return data ? (data.recent_dates || []) : [];
  }

  return { getDashboardStats, getStreak, invalidate, buildDashboardData, getRecentDates };
})();

window.TrackingController = TrackingController;
