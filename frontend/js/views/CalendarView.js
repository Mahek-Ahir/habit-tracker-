/* ═══════════════════════════════════════════════════════════════
   HABITFLOW — CalendarView  (Phase 3)
   Monthly calendar · day-status dots · day detail with per-habit
   status, streak info, and daily score badge
═══════════════════════════════════════════════════════════════ */
'use strict';

const CalendarView = (() => {

  let _habits   = [];
  let _calDate  = new Date();
  let _selected = toDateString(new Date());

  /* ══════════════════════════════
     RENDER CALENDAR GRID
  ══════════════════════════════ */
  function renderCalendar(habits) {
    _habits = habits;

    const year  = _calDate.getFullYear();
    const month = _calDate.getMonth();

    const titleEl = document.getElementById('calMonthTitle');
    if (titleEl) titleEl.textContent = `${MONTHS[month]} ${year}`;

    const grid = document.getElementById('calGrid');
    if (!grid) return;

    const firstDay  = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const todayD    = new Date();
    const todayStr  = toDateString(todayD);

    grid.innerHTML = '';

    // Prev-month filler
    const prevMax = new Date(year, month, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day faded';
      cell.textContent = prevMax - firstDay + i + 1;
      grid.appendChild(cell);
    }

    // Current month days
    for (let d = 1; d <= daysCount; d++) {
      const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell     = document.createElement('div');
      cell.className  = 'cal-day';
      cell.textContent = d;
      cell.dataset.date = dateStr;

      // Status class
      if (habits.length > 0) {
        const done  = habits.filter(h => h.completedDates.includes(dateStr)).length;
        const total = habits.length;
        const pct   = done / total;
        if (pct === 1 && total > 0)         cell.classList.add('completed');
        else if (pct > 0)                   cell.classList.add('partial');
        else if (dateStr < todayStr)        cell.classList.add('missed');
      }

      if (dateStr === todayStr) cell.classList.add('today');
      if (dateStr === _selected) cell.classList.add('selected');

      grid.appendChild(cell);
    }

    // Next-month filler
    const filled = firstDay + daysCount;
    const rem    = filled % 7 === 0 ? 0 : 7 - (filled % 7);
    for (let i = 1; i <= rem; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day faded';
      cell.textContent = i;
      grid.appendChild(cell);
    }
  }

  /* ══════════════════════════════
     DAY DETAIL PANEL
  ══════════════════════════════ */
  function renderDayDetail(habits, dateStr) {
    _habits  = habits;
    _selected = dateStr;

    const todayStr = toDateString(new Date());
    const isFuture = dateStr > todayStr;
    const isToday  = dateStr === todayStr;

    // Header date
    const dateEl = document.getElementById('ddDate');
    if (dateEl) dateEl.textContent = formatDisplayDate(dateStr);

    // Done / missed lists
    const done   = habits.filter(h => h.completedDates.includes(dateStr));
    const missed = habits.filter(h => !h.completedDates.includes(dateStr));
    const total  = habits.length;
    const pct    = total > 0 ? Math.round((done.length / total) * 100) : 0;

    // Badge
    const badgeEl = document.getElementById('ddBadge');
    if (badgeEl) {
      if (isFuture)         { badgeEl.textContent = '📅 Upcoming'; badgeEl.className = 'dd-badge'; }
      else if (pct === 100 && total > 0) { badgeEl.textContent = '🏆 Perfect!';  badgeEl.className = 'dd-badge'; }
      else if (pct >= 75)  { badgeEl.textContent = '🎉 Great Day!'; badgeEl.className = 'dd-badge'; }
      else if (pct >= 50)  { badgeEl.textContent = '👍 Good Job';   badgeEl.className = 'dd-badge'; }
      else if (pct > 0)    { badgeEl.textContent = '📈 Keep Going'; badgeEl.className = 'dd-badge warn'; }
      else if (isToday)    { badgeEl.textContent = '☀️ Start Now';  badgeEl.className = 'dd-badge warn'; }
      else                 { badgeEl.textContent = '💪 Missed';     badgeEl.className = 'dd-badge warn'; }
    }

    // Stats
    const setEl = (id, v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    setEl('ddCompleted', done.length);
    setEl('ddMissed',    isFuture ? '—' : missed.length);
    setEl('ddScore',     isFuture ? '—' : `${pct}%`);

    // Habit list with streaks
    const listEl = document.getElementById('ddHabits');
    if (!listEl) return;

    if (habits.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;">No habits tracked yet.</p>';
      return;
    }

    listEl.innerHTML =
      done.map(h => `
        <div class="dd-habit done">
          <i class="fa-solid fa-check-circle"></i>
          <span>${escapeHtml(h.icon)} ${escapeHtml(h.name)}</span>
          <span class="dd-streak"><i class="fa-solid fa-fire" style="color:#f97316;"></i>${h.streak}d</span>
        </div>`).join('') +
      (isFuture ? '' : missed.map(h => `
        <div class="dd-habit missed">
          <i class="fa-solid fa-times-circle"></i>
          <span>${escapeHtml(h.icon)} ${escapeHtml(h.name)}</span>
          <span class="dd-streak" style="opacity:.5;"><i class="fa-solid fa-fire"></i>${h.streak}d</span>
        </div>`).join(''));
  }

  /* ══════════════════════════════
     INIT + EVENTS
  ══════════════════════════════ */
  function init(habits) {
    _habits = habits;
    renderCalendar(habits);
    renderDayDetail(habits, _selected);

    document.getElementById('prevMonth')?.addEventListener('click', () => {
      _calDate.setMonth(_calDate.getMonth() - 1);
      renderCalendar(_habits);
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
      _calDate.setMonth(_calDate.getMonth() + 1);
      renderCalendar(_habits);
    });

    document.getElementById('calGrid')?.addEventListener('click', e => {
      const day = e.target.closest('.cal-day');
      if (!day || day.classList.contains('faded')) return;
      document.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
      day.classList.add('selected');
      if (day.dataset.date) renderDayDetail(_habits, day.dataset.date);
    });

    // Highlight today on load
    document.querySelector('.cal-day.today')?.classList.add('selected');
  }

  /* ── Refresh after data changes ── */
  function refresh(habits) {
    _habits = habits;
    renderCalendar(habits);
    renderDayDetail(habits, _selected);
  }

  return { init, refresh, renderCalendar };
})();
