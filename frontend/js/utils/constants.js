/* ═══════════════════════════════════════════════════════════════
   HABITFLOW — Constants & Utilities  (Phase 5 — Final)
═══════════════════════════════════════════════════════════════ */
'use strict';

const STORAGE_KEY        = 'habitflow_habits';
const SETTINGS_KEY       = 'habitflow_settings';
const ACHIEVEMENTS_KEY   = 'habitflow_achievements';
const NOTIF_TIMER_KEY    = 'habitflow_notif_timer';

const CATEGORIES = ['health', 'study', 'fitness', 'personal', 'productivity'];

const CATEGORY_META = {
  health:       { icon: '🏥', color: '#ef4444', label: 'Health' },
  study:        { icon: '📚', color: '#0ea5e9', label: 'Study' },
  fitness:      { icon: '💪', color: '#22c55e', label: 'Fitness' },
  personal:     { icon: '🌱', color: '#f59e0b', label: 'Personal' },
  productivity: { icon: '⚡', color: '#ec4899', label: 'Productivity' },
};

const HABIT_ICONS = ['💧','🏃','📚','🧘','✍️','🥗','💤','🎯','🎵','🧠','💊','🌅','🏋️','🚶','🍎','💻','📝','🎨','🧹','💆'];
const PRESET_COLORS = ['#7c3aed','#0ea5e9','#16a34a','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FONT_SIZES = { small: '14px', medium: '16px', large: '18px', xlarge: '20px' };

const MOTIVATIONAL_QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "You don't rise to the level of your goals, you fall to the level of your systems.", author: "James Clear" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "It's not about being the best. It's about being better than you were yesterday.", author: "Unknown" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Either you run the day, or the day runs you.", author: "Jim Rohn" },
];

const MOTIVATIONAL_MESSAGES = {
  perfect: { emoji: '🏆', text: "Perfect day! You're absolutely unstoppable!", level: 'gold' },
  great:   { emoji: '🔥', text: "Amazing progress! Keep that fire burning!", level: 'green' },
  good:    { emoji: '👍', text: "Good work! Just a few more habits to go!", level: 'blue' },
  half:    { emoji: '💪', text: "Halfway there! You've totally got this!", level: 'purple' },
  started: { emoji: '🌱', text: "Great start! Build that momentum!", level: 'yellow' },
  zero:    { emoji: '☀️', text: "Fresh day ahead — let's absolutely crush it!", level: 'muted' },
};

const ACHIEVEMENTS = [
  { id: 'first_habit',   icon: '🌱', title: 'First Step',      desc: 'Added your first habit',           check: h => h.length >= 1 },
  { id: 'five_habits',   icon: '🎯', title: 'Goal Setter',     desc: 'Added 5 habits',                   check: h => h.length >= 5 },
  { id: 'ten_habits',    icon: '🌟', title: 'Habit Collector', desc: 'Added 10 habits',                  check: h => h.length >= 10 },
  { id: 'streak_3',      icon: '🔥', title: 'On Fire',         desc: '3-day streak on any habit',        check: h => h.some(x => x.streak >= 3) },
  { id: 'streak_7',      icon: '⚡', title: 'Week Warrior',    desc: '7-day streak on any habit',        check: h => h.some(x => x.streak >= 7) },
  { id: 'streak_14',     icon: '🌙', title: 'Fortnight Flow',  desc: '14-day streak on any habit',       check: h => h.some(x => x.streak >= 14) },
  { id: 'streak_30',     icon: '👑', title: 'Month Master',    desc: '30-day streak on any habit',       check: h => h.some(x => x.streak >= 30) },
  { id: 'streak_60',     icon: '🏆', title: 'Double-Month Champion', desc: '60-day streak on any habit',   check: h => h.some(x => x.streak >= 60) },
  { id: 'streak_90',     icon: '🌟', title: 'Quarter Quest',   desc: '90-day streak on any habit',       check: h => h.some(x => x.streak >= 90) },
  { id: 'streak_180',    icon: '🛡️', title: 'Half-Year Hero',  desc: '180-day streak on any habit',      check: h => h.some(x => x.streak >= 180) },
  { id: 'streak_365',    icon: '💎', title: 'HabitFlow Pro',   desc: '365-day streak on any habit',      check: h => h.some(x => x.streak >= 365) },
  { id: 'perfect_day',   icon: '🎉', title: 'Perfect Day',     desc: 'Completed all habits in a day',    check: h => { const t=today(); return h.length>0 && h.every(x=>x.completedDates.includes(t)); } },
  { id: 'completed_10',  icon: '✅', title: 'Centurion',       desc: '10 total completions',             check: h => h.reduce((s,x)=>s+x.completedDates.length,0) >= 10 },
  { id: 'completed_50',  icon: '🚀', title: 'Rocket',          desc: '50 total completions',             check: h => h.reduce((s,x)=>s+x.completedDates.length,0) >= 50 },
  { id: 'completed_100', icon: '🏅', title: 'Century Club',    desc: '100 total completions',            check: h => h.reduce((s,x)=>s+x.completedDates.length,0) >= 100 },
  { id: 'all_cats',      icon: '🌈', title: 'All Rounder',     desc: 'Have a habit in every category',   check: h => CATEGORIES.every(c=>h.some(x=>x.category===c)) },
  { id: 'early_bird',    icon: '🌅', title: 'Early Bird',      desc: 'Complete a habit before 8am',      check: h => false }, // time-based, checked separately
  { id: 'night_owl',     icon: '🦉', title: 'Night Owl',       desc: '7-day streak after 9pm',           check: h => false },
];

/* ════════════════ UTILITY FUNCTIONS ════════════════ */

function generateId() {
  return `habit_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
}
function toDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function today() { return toDateString(new Date()); }
function formatDisplayDate(ds) {
  return new Date(ds+'T00:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
}
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function getRandomQuote() {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random()*MOTIVATIONAL_QUOTES.length)];
}
function getMotivationalMessage(pct) {
  if (pct===100) return MOTIVATIONAL_MESSAGES.perfect;
  if (pct>=75)   return MOTIVATIONAL_MESSAGES.great;
  if (pct>=50)   return MOTIVATIONAL_MESSAGES.good;
  if (pct>=25)   return MOTIVATIONAL_MESSAGES.half;
  if (pct>0)     return MOTIVATIONAL_MESSAGES.started;
  return MOTIVATIONAL_MESSAGES.zero;
}
function calculateStreak(completedDates) {
  if (!completedDates.length) return 0;
  const sorted = [...completedDates].sort().reverse();
  let streak=0, cursor=new Date(); cursor.setHours(0,0,0,0);
  for (const ds of sorted) {
    if (ds===toDateString(cursor)) { streak++; cursor.setDate(cursor.getDate()-1); }
    else break;
  }
  return streak;
}
function countMissedDays(habit) {
  const start=new Date(habit.startDate+'T00:00:00'), todayD=new Date(today()+'T00:00:00');
  let missed=0, cursor=new Date(start);
  while (cursor<todayD) {
    if (!habit.completedDates.includes(toDateString(cursor))) missed++;
    cursor.setDate(cursor.getDate()+1);
  }
  return missed;
}
function getLastNDays(n=7) {
  return Array.from({length:n},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(n-1-i)); return toDateString(d); });
}
function getHabitStatus(habit) {
  if (habit.completedDates.includes(today())) return 'completed';
  return new Date(habit.startDate+'T00:00:00') > new Date(today()+'T00:00:00') ? 'upcoming' : 'pending';
}
function debounce(fn, delay=300) {
  let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a),delay); };
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function capitalize(str) { return str ? str.charAt(0).toUpperCase()+str.slice(1) : ''; }

/* ── Phase 5: Font size apply ── */
function applyFontSize(size) {
  document.documentElement.style.fontSize = FONT_SIZES[size] || '16px';
}
