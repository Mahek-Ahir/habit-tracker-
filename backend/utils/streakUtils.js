'use strict';
const { todayStr, subtractDays, isScheduledDay, dateRange } = require('./dateUtils');

function computeStreakStats(habit, completedDatesSet, asOfDate) {
  const today = asOfDate || todayStr();
  const { frequency, custom_days, start_date } = habit;
  const totalCompletions = completedDatesSet.size;
  const scheduled = dateRange(start_date, today).filter(d => isScheduledDay(frequency, custom_days, d));
  let missedDays = 0;
  for (const day of scheduled) { if (day !== today && !completedDatesSet.has(day)) missedDays++; }
  let currentStreak = 0;
  for (let i = scheduled.length - 1; i >= 0; i--) {
    const day = scheduled[i];
    if (day === today) { if (completedDatesSet.has(day)) currentStreak++; continue; }
    if (completedDatesSet.has(day)) currentStreak++;
    else break;
  }
  let longestStreak = 0, run = 0;
  for (const day of scheduled) {
    if (completedDatesSet.has(day)) { run++; if (run > longestStreak) longestStreak = run; }
    else run = 0;
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak;
  return { currentStreak, longestStreak, missedDays, totalCompletions };
}

module.exports = { computeStreakStats };
