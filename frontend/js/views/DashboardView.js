/* ═══════════════════════════════════════════════════════════════
   HABITFLOW — DashboardView  (Phase 3)
   Stats · Quick habits · Hero · Progress summary · Weekly summary
   Motivational message · Achievements panel
═══════════════════════════════════════════════════════════════ */
'use strict';

const DashboardView = (() => {

  /* ══════════════════════════════════
     STATS CARDS
  ══════════════════════════════════ */
  function renderStats(habits) {
    const todayStr       = today();
    const total          = habits.length;
    const completedToday = habits.filter(h => h.completedDates.includes(todayStr)).length;
    const pending        = total - completedToday;
    const pct            = total > 0 ? Math.round((completedToday / total) * 100) : 0;

    const currentStreak = habits.length ? Math.max(...habits.map(h => h.streak), 0) : 0;
    const longestStreak = habits.reduce((m, h) => Math.max(m, h.longestStreak || 0, h.streak), 0);
    const totalCompleted = habits.reduce((s, h) => s + h.completedDates.length, 0);

    safeSet('stat-total',        total);
    safeSet('stat-completed',    `${completedToday} / ${total}`);
    safeSet('stat-streak',       `🔥 ${currentStreak} Day${currentStreak !== 1 ? 's' : ''}`);
    safeSet('stat-longest',      `🏆 ${longestStreak} Day${longestStreak !== 1 ? 's' : ''}`);
    safeSet('stat-pct',          `${pct}%`);



    updateRing('ring-total',     Math.min(100, total * 10));
    updateRing('ring-completed', pct);
    updateRing('ring-streak',    Math.min(100, currentStreak * 5));
    updateRing('ring-longest',   longestStreak > 0 ? Math.min(100, longestStreak * 3) : 0);

    renderDailyProgress(habits);
    renderMotivationalMessage(pct);
    renderWeeklySummary(habits);
  }

  /* ══════════════════════════════════
     DAILY PROGRESS BAR + STATUS
  ══════════════════════════════════ */
  function renderDailyProgress(habits) {
    const todayStr = today();
    const total    = habits.length;
    const done     = habits.filter(h => h.completedDates.includes(todayStr)).length;
    const pct      = total > 0 ? Math.round((done / total) * 100) : 0;

    const bar    = document.getElementById('dailyProgressBar');
    const label  = document.getElementById('dailyProgressLabel');
    const status = document.getElementById('dailyProgressStatus');

    if (bar)    { bar.style.width = `${pct}%`; bar.setAttribute('data-pct', pct); }
    if (label)  label.textContent = `${done} of ${total} habits completed today`;
    if (status) {
      status.className = 'daily-progress-status';
      if      (pct === 100) { status.textContent = '✅ Perfect!';     status.classList.add('perfect'); }
      else if (pct >= 75)   { status.textContent = '🔥 Almost!';      status.classList.add('great');   }
      else if (pct >= 50)   { status.textContent = '👍 Halfway!';     status.classList.add('good');    }
      else if (pct > 0)     { status.textContent = '🌱 Just started'; status.classList.add('started'); }
      else                  { status.textContent = '☀️ Let\'s go!';   status.classList.add('zero');    }
    }
  }

  /* ══════════════════════════════════
     MOTIVATIONAL MESSAGE
  ══════════════════════════════════ */
  function renderMotivationalMessage(pct) {
    const el  = document.getElementById('motivationalMsg');
    const msg = getMotivationalMessage(pct);
    if (!el) return;
    el.innerHTML = `
      <span class="motiv-emoji">${msg.emoji}</span>
      <span class="motiv-text">${msg.text}</span>`;
    el.className = `motivational-msg level-${msg.level}`;
  }

  /* ══════════════════════════════════
     WEEKLY SUMMARY
  ══════════════════════════════════ */
  function renderWeeklySummary(habits) {
    const container = document.getElementById('weeklySummaryGrid');
    if (!container) return;

    const last7 = getLastNDays(7);

    container.innerHTML = last7.map(dateStr => {
      const d      = new Date(dateStr + 'T00:00:00');
      const dayAbb = DAYS[d.getDay()];
      const total  = habits.length;
      const done   = habits.filter(h => h.completedDates.includes(dateStr)).length;
      const pct    = total > 0 ? Math.round((done / total) * 100) : 0;
      const isToday = dateStr === today();
      let cls = 'ws-day';
      if (isToday) cls += ' today';
      if (pct === 100 && total > 0) cls += ' perfect';
      else if (pct > 0)             cls += ' partial';
      else if (!isToday && total > 0) cls += ' missed';

      return `
        <div class="${cls}" title="${dateStr}: ${done}/${total}">
          <span class="ws-day-label">${dayAbb}</span>
          <div class="ws-day-fill" style="height:${pct}%"></div>
          <span class="ws-day-pct">${pct}%</span>
        </div>`;
    }).join('');
  }

  /* ══════════════════════════════════
     QUICK HABITS (today's checklist)
  ══════════════════════════════════ */
  function renderQuickHabits(habits, onToggle) {
    const container = document.getElementById('quickHabitsGrid');
    if (!container) return;
    const todayStr = today();

    if (habits.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:2rem;">
          <div class="empty-state-icon">✨</div>
          <h3>No habits yet</h3>
          <p>Add your first habit to get started!</p>
        </div>`;
      return;
    }

    // Sort: pending first, then completed
    const sorted = [...habits].sort((a, b) => {
      const ad = a.completedDates.includes(todayStr);
      const bd = b.completedDates.includes(todayStr);
      return ad - bd;
    });

    container.innerHTML = sorted.map(h => {
      const done   = h.completedDates.includes(todayStr);
      const status = getHabitStatus(h);
      const missed = countMissedDays(h);
      return `
        <div class="quick-habit-card glass-card ${done ? 'completed' : ''}" data-id="${escapeHtml(h.id)}">
          <div class="qh-left">
            <div class="qh-icon" style="background:${h.color}22;color:${h.color};">${escapeHtml(h.icon)}</div>
            <div class="qh-info">
              <span class="qh-name">${escapeHtml(h.name)}</span>
              <span class="qh-meta">${capitalize(h.category)} · ${capitalize(h.frequency)}</span>
            </div>
          </div>
          <div class="qh-right">
            <span class="habit-status-badge ${status}">${statusLabel(status)}</span>
            <div class="qh-streak"><i class="fa-solid fa-fire"></i> ${h.streak}</div>
            <button class="qh-check ${done ? 'done' : ''}" data-id="${escapeHtml(h.id)}" aria-label="${done ? 'Unmark' : 'Mark done'}">
              <i class="fa-solid fa-check"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.qh-check').forEach(btn => {
      btn.addEventListener('click', () => onToggle(btn.dataset.id));
    });
  }

  /* ══════════════════════════════════
     HERO TEXT
  ══════════════════════════════════ */
  function renderHero() {
    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    safeSet('heroDate',     dateStr);
    safeSet('heroGreeting', getGreeting());
    const q = getRandomQuote();
    safeSet('quoteText',   `"${q.text}"`);
    safeSet('quoteAuthor', `— ${q.author}`);
  }

  /* ══════════════════════════════════
     ACHIEVEMENTS PANEL
  ══════════════════════════════════ */
  function renderAchievements(earned) {
    const container = document.getElementById('achievementsGrid');
    if (!container) return;
    if (earned.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;grid-column:1/-1;">Complete habits to earn badges! 🏅</p>`;
      return;
    }
    container.innerHTML = earned.map(a => `
      <div class="achievement-badge earned" title="${a.desc}">
        <span class="ach-icon">${a.icon}</span>
        <span class="ach-title">${a.title}</span>
      </div>`).join('');
  }

  /* ── helpers ── */
  function safeSet(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
  function updateRing(id, pct) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('stroke-dasharray', `${Math.round(pct)}, 100`);
  }
  function statusLabel(s) {
    return s === 'completed' ? '✓ Done' : s === 'upcoming' ? '📅 Soon' : '○ Pending';
  }

  return { renderStats, renderQuickHabits, renderHero, renderAchievements };
})();
