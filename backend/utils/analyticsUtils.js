'use strict';
const { todayStr, subtractDays, dateRange, isScheduledDay } = require('./dateUtils');

const DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function normDate(d) { return d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10); }

function buildWeeklyChart(habits, logRows, endDateStr) {
  const end  = endDateStr || todayStr();
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(subtractDays(end, i));

  const completedByDate = {};
  for (const day of days) completedByDate[day] = new Set();
  for (const r of logRows) { const d = normDate(r.log_date); if (completedByDate[d]) completedByDate[d].add(r.habit_id); }

  const scheduledByDate = {};
  for (const day of days) {
    scheduledByDate[day] = habits.filter(h => day >= normDate(h.start_date) && isScheduledDay(h.frequency, h.custom_days, day)).length;
  }

  return {
    labels: days.map(d => DAY_SHORT[new Date(d+'T00:00:00Z').getUTCDay()]),
    dates:  days,
    datasets: [
      { label: 'Habits completed', data: days.map(d => completedByDate[d].size) },
      { label: 'Habits scheduled', data: days.map(d => scheduledByDate[d]) },
    ],
    completion_rate: days.map((d,i) => scheduledByDate[d] > 0 ? Math.round((completedByDate[d].size / scheduledByDate[d]) * 100) : 0),
  };
}

function buildMonthlyChart(logRows, endDateStr) {
  const end = endDateStr ? new Date(endDateStr+'T00:00:00Z') : new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
    buckets.push({ key, label: `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCFullYear()}`, completions: 0, activeDays: new Set() });
  }
  const byKey = Object.fromEntries(buckets.map(b => [b.key, b]));
  for (const r of logRows) { const k = normDate(r.log_date).slice(0,7); if (byKey[k]) { byKey[k].completions++; byKey[k].activeDays.add(normDate(r.log_date)); } }
  return {
    labels: buckets.map(b => b.label),
    month_keys: buckets.map(b => b.key),
    datasets: [
      { label: 'Total completions', data: buckets.map(b => b.completions) },
      { label: 'Active days',       data: buckets.map(b => b.activeDays.size) },
    ],
  };
}

function buildCategoryChart(habits) {
  const byCategory = {};
  for (const h of habits) {
    const k = h.category_slug || 'uncategorized';
    if (!byCategory[k]) byCategory[k] = { category: k, label: h.category_label||'Uncategorized', color: h.category_color||'#888', habitCount: 0, completions: 0 };
    byCategory[k].habitCount++;
    byCategory[k].completions += h.total_completions || 0;
  }
  const entries = Object.values(byCategory);
  return {
    labels: entries.map(e => e.label),
    colors: entries.map(e => e.color),
    datasets: [
      { label: 'Habits per category',      data: entries.map(e => e.habitCount) },
      { label: 'Completions per category', data: entries.map(e => e.completions) },
    ],
    raw: entries,
  };
}

function buildCompletionStats(habits, todayLogRows, windowLogRows, windowDays = 30) {
  const today = todayStr();
  const totalScheduledToday = habits.filter(h => today >= normDate(h.start_date) && isScheduledDay(h.frequency, h.custom_days, today)).length;
  const completedTodaySet   = new Set(todayLogRows.filter(r => r.completed === 1).map(r => r.habit_id));
  const completedToday      = completedTodaySet.size;
  const completionRateToday = totalScheduledToday > 0 ? Math.round((completedToday / totalScheduledToday) * 100) : 0;

  const days = dateRange(subtractDays(today, windowDays - 1), today);
  const completedByDate = {};
  for (const day of days) completedByDate[day] = new Set();
  for (const r of windowLogRows) { const d = normDate(r.log_date); if (completedByDate[d]) completedByDate[d].add(r.habit_id); }

  let sumRates = 0, countedDays = 0;
  for (const day of days) {
    const scheduled = habits.filter(h => day >= normDate(h.start_date) && isScheduledDay(h.frequency, h.custom_days, day)).length;
    if (scheduled === 0) continue;
    sumRates += (completedByDate[day].size / scheduled) * 100;
    countedDays++;
  }
  return {
    completion_rate_today:    completionRateToday,
    completed_today:          completedToday,
    total_scheduled_today:    totalScheduledToday,
    rolling_average_rate:     countedDays > 0 ? Math.round(sumRates / countedDays) : 0,
    rolling_window_days:      windowDays,
  };
}

function buildCalendarData(year, month, logRows, habits) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStr    = String(month).padStart(2,'0');
  const dayMap      = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${monthStr}-${String(d).padStart(2,'0')}`;
    dayMap[dateStr] = { date: dateStr, completed_habit_ids: [], completed_count: 0, scheduled_count: 0, completion_rate: 0 };
  }
  for (const r of logRows) {
    const dStr = normDate(r.log_date);
    if (dayMap[dStr] && r.completed === 1) { dayMap[dStr].completed_habit_ids.push(r.habit_id); dayMap[dStr].completed_count++; }
  }
  for (const dateStr of Object.keys(dayMap)) {
    const scheduled = habits.filter(h => dateStr >= normDate(h.start_date) && isScheduledDay(h.frequency, h.custom_days, dateStr)).length;
    dayMap[dateStr].scheduled_count  = scheduled;
    dayMap[dateStr].completion_rate  = scheduled > 0 ? Math.round((dayMap[dateStr].completed_count / scheduled) * 100) : 0;
  }
  return { year, month, days_in_month: daysInMonth, days: Object.values(dayMap) };
}

function findBestHabit(habits) {
  if (!habits || habits.length === 0) return null;
  let best = null, bestScore = -Infinity;
  for (const h of habits) {
    const score = (h.current_streak||0)*3 + (h.longest_streak||0)*2 + (h.total_completions||0) - (h.missed_days||0);
    if (score > bestScore) { bestScore = score; best = h; }
  }
  if (!best) return null;
  return { id: best.id, name: best.name, category: best.category_label||null, current_streak: best.current_streak, longest_streak: best.longest_streak, total_completions: best.total_completions, missed_days: best.missed_days, score: Math.round(bestScore) };
}

function buildMissedHabitAnalysis(habits, windowLogRows, windowDays = 14) {
  const today = todayStr();
  const windowStart = subtractDays(today, windowDays - 1);
  const completedByHabit = {};
  for (const r of windowLogRows) {
    if (r.completed !== 1) continue;
    const d = normDate(r.log_date);
    if (d < windowStart || d > today) continue;
    if (!completedByHabit[r.habit_id]) completedByHabit[r.habit_id] = new Set();
    completedByHabit[r.habit_id].add(d);
  }
  const results = habits.map(h => {
    const startToUse   = normDate(h.start_date) > windowStart ? normDate(h.start_date) : windowStart;
    const scheduled    = dateRange(startToUse, today).filter(d => isScheduledDay(h.frequency, h.custom_days, d));
    const completedSet = completedByHabit[h.id] || new Set();
    const done = scheduled.filter(d => completedSet.has(d)).length;
    const pct  = scheduled.length > 0 ? Math.round((done / scheduled.length) * 100) : 100;
    let risk;
    if (scheduled.length === 0) risk = 'None';
    else if (pct <= 30)         risk = 'High';
    else if (pct <= 60)         risk = 'Medium';
    else                        risk = 'Low';
    return { id: h.id, name: h.name, category: h.category_label||null, missed_days_total: h.missed_days, completions_in_window: done, scheduled_in_window: scheduled.length, completion_pct: pct, risk_level: risk };
  });
  const order = { High:0, Medium:1, Low:2, None:3 };
  results.sort((a,b) => (order[a.risk_level]-order[b.risk_level]) || (a.completion_pct-b.completion_pct));
  return { window_days: windowDays, habits: results, summary: { high_risk_count: results.filter(r=>r.risk_level==='High').length, medium_risk_count: results.filter(r=>r.risk_level==='Medium').length, low_risk_count: results.filter(r=>r.risk_level==='Low').length } };
}

function computeProductivityScore(completionStats, habits) {
  const todayRate   = completionStats.completion_rate_today;
  const rollingRate = completionStats.rolling_average_rate;
  let streakHealth  = 0;
  if (habits.length > 0) {
    const avg = habits.reduce((s,h) => s + (h.current_streak||0), 0) / habits.length;
    streakHealth = Math.min(100, Math.round((avg/14)*100));
  }
  const score = Math.round(todayRate*0.40 + rollingRate*0.35 + streakHealth*0.25);
  let label;
  if      (score >= 80) label = 'Excellent';
  else if (score >= 60) label = 'Good';
  else if (score >= 40) label = 'Fair';
  else if (score >= 20) label = 'Needs improvement';
  else                  label = 'Just getting started';
  return { score: Math.max(0, Math.min(100, score)), label, breakdown: { today_rate: todayRate, rolling_average_rate: rollingRate, streak_health: streakHealth } };
}

module.exports = { normDate, buildWeeklyChart, buildMonthlyChart, buildCategoryChart, buildCompletionStats, buildCalendarData, findBestHabit, buildMissedHabitAnalysis, computeProductivityScore };
