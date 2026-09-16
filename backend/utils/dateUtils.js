'use strict';
function todayStr() { return toDateStr(new Date()); }
function toDateStr(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}
function isValidDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return !isNaN(new Date(s+'T00:00:00Z').getTime());
}
function isFutureDate(s) { return s > todayStr(); }
function subtractDays(dateStr, days) {
  const d = new Date(dateStr+'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0,10);
}
function addDays(dateStr, days) { return subtractDays(dateStr, -days); }
function diffInDays(a, b) {
  return Math.round((new Date(b+'T00:00:00Z') - new Date(a+'T00:00:00Z')) / 86400000);
}
function weekdayOf(dateStr) { return new Date(dateStr+'T00:00:00Z').getUTCDay(); }
function isScheduledDay(frequency, customDays, dateStr) {
  const wd = weekdayOf(dateStr);
  switch (frequency) {
    case 'daily':    return true;
    case 'weekdays': return wd >= 1 && wd <= 5;
    case 'weekends': return wd === 0 || wd === 6;
    case 'weekly':   return true;
    case 'custom':   return Array.isArray(customDays) && customDays.includes(wd);
    default:         return true;
  }
}
function dateRange(startStr, endStr) {
  const days = diffInDays(startStr, endStr);
  if (days < 0 || days > 1825) return [];
  const out = [];
  let cur = startStr;
  for (let i = 0; i <= days; i++) { out.push(cur); cur = addDays(cur, 1); }
  return out;
}
module.exports = { todayStr, toDateStr, isValidDateStr, isFutureDate, subtractDays, addDays, diffInDays, weekdayOf, isScheduledDay, dateRange };
