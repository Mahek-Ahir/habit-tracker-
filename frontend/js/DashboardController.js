/* ═══════════════════════════════════════════════════════════════
   js/DashboardController.js — Phase 7
   Fetches all analytics data from MySQL for charts and calendar.
   Returns data in the exact shape the existing view files expect.
═══════════════════════════════════════════════════════════════ */
'use strict';

const DashboardController = (() => {

  /* ── WEEKLY CHART DATA ────────────────────────────────────── */
  async function getWeeklyData() {
    const r = await AnalyticsAPI.weekly();
    if (!r.ok || !r.data) return null;
    const d = r.data;
    // Shape → { labels: ['Mon',...], datasets: [...], completion_rate: [...] }
    return {
      labels         : d.labels         || [],
      dates          : d.dates          || [],
      datasets       : d.datasets       || [],
      completion_rate: d.completion_rate || [],
    };
  }

  /* ── MONTHLY CHART DATA ───────────────────────────────────── */
  async function getMonthlyData() {
    const r = await AnalyticsAPI.monthly();
    if (!r.ok || !r.data) return null;
    const d = r.data;
    return {
      labels    : d.labels     || [],
      month_keys: d.month_keys || [],
      datasets  : d.datasets   || [],
    };
  }

  /* ── CATEGORY CHART DATA ──────────────────────────────────── */
  async function getCategoryData() {
    const r = await AnalyticsAPI.category();
    if (!r.ok || !r.data) return null;
    const d = r.data;
    return {
      labels  : d.labels   || [],
      colors  : d.colors   || [],
      datasets: d.datasets || [],
      raw     : d.raw      || [],
    };
  }

  /* ── COMPLETION % + PRODUCTIVITY SCORE ───────────────────── */
  async function getCompletionData() {
    const r = await AnalyticsAPI.completion();
    if (!r.ok || !r.data) return null;
    return r.data;
  }

  /* ── BEST HABIT ───────────────────────────────────────────── */
  async function getBestHabit() {
    const r = await AnalyticsAPI.bestHabit();
    if (!r.ok || !r.data) return null;
    return r.data.best_habit || null;
  }

  /* ── MISSED HABIT ANALYSIS ───────────────────────────────── */
  async function getMissedHabits(days = 14) {
    const r = await AnalyticsAPI.missedHabits(days);
    if (!r.ok || !r.data) return { habits: [], summary: {} };
    return {
      habits : r.data.habits  || [],
      summary: r.data.summary || {},
      window : r.data.window_days || days,
    };
  }

  /* ── CALENDAR DATA ────────────────────────────────────────── */
  async function getCalendarData(month, year) {
    const r = await AnalyticsAPI.calendar(month, year);
    if (!r.ok || !r.data) return null;
    const d = r.data;
    // Build a Map of date → { completed_count, scheduled_count, completion_rate }
    const dayMap = {};
    (d.days || []).forEach(day => {
      dayMap[day.date] = {
        completed : day.completed_count  || 0,
        scheduled : day.scheduled_count  || 0,
        rate      : day.completion_rate  || 0,
        ids       : day.completed_habit_ids || [],
      };
    });
    return {
      year        : d.year,
      month       : d.month,
      daysInMonth : d.days_in_month,
      dayMap,            // { '2026-06-01': { completed, scheduled, rate } }
      days        : d.days || [],
    };
  }

  /* ── FULL ANALYTICS BUNDLE (load all at once for Analytics tab) ── */
  async function loadAll() {
    const [weekly, monthly, category, completion, bestHabit, missed] = await Promise.allSettled([
      getWeeklyData(),
      getMonthlyData(),
      getCategoryData(),
      getCompletionData(),
      getBestHabit(),
      getMissedHabits(),
    ]);

    return {
      weekly    : weekly.value     || null,
      monthly   : monthly.value    || null,
      category  : category.value   || null,
      completion: completion.value || null,
      bestHabit : bestHabit.value  || null,
      missed    : missed.value     || { habits: [], summary: {} },
    };
  }

  return {
    getWeeklyData,
    getMonthlyData,
    getCategoryData,
    getCompletionData,
    getBestHabit,
    getMissedHabits,
    getCalendarData,
    loadAll,
  };
})();

window.DashboardController = DashboardController;
