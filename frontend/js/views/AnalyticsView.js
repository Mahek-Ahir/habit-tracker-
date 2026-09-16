/* ═══════════════════════════════════════════════════════════════
   HABITFLOW — AnalyticsView  (Phase 4 — Chart.js)
   All charts use Chart.js with smooth animations.
   Charts: Line (weekly) · Bar (monthly) · Pie (category) ·
           Radar (per-habit) · Doughnut (completion %) ·
           Activity heatmap · Streak leaderboard ·
           Missed analysis · Productivity score
═══════════════════════════════════════════════════════════════ */
'use strict';

const AnalyticsView = (() => {

  /* ── Chart instance registry (destroy before re-create) ── */
  const _charts = {};

  function _destroy(key) {
    if (_charts[key]) { _charts[key].destroy(); delete _charts[key]; }
  }

  /* ── Shared Chart.js theme helpers ── */
  function _isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }
  function _textColor()  { return _isDark() ? 'rgba(241,240,255,0.75)' : 'rgba(24,24,27,0.7)'; }
  function _gridColor()  { return _isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; }
  function _tooltipBg()  { return _isDark() ? '#1a1a26' : '#ffffff'; }
  function _accent()     { return '#7c3aed'; }
  function _accentLight(){ return '#a78bfa'; }

  const CATEGORY_COLORS = {
    health:'#ef4444', study:'#0ea5e9', fitness:'#22c55e',
    personal:'#f59e0b', productivity:'#ec4899',
  };

  /* ══════════════════════════════════
     MAIN ENTRY
  ══════════════════════════════════ */
  function render(habits) {
    renderDashboardCards(habits);
    renderProductivityScore(habits);
    renderWeeklyLineChart(habits);
    renderMonthlyBarChart(habits);
    renderCategoryPieChart(habits);
    renderCompletionDoughnut(habits);
    renderMissedAnalysis(habits);
    renderHeatmap(habits);
    renderBreakdown(habits);
    renderStreakLeaderboard(habits);
    renderBestWorstHabits(habits);
  }

  /* ══════════════════════════════════
     1. ANALYTICS DASHBOARD CARDS
  ══════════════════════════════════ */
  function renderDashboardCards(habits) {
    const last7  = getLastNDays(7);
    const last30 = getLastNDays(30);
    const total  = habits.length;
    const todayS = today();

    // Total completions (all-time)
    const totalCompletions = habits.reduce((s,h) => s + h.completedDates.length, 0);

    // Average streak
    const avgStreak = total > 0
      ? (habits.reduce((s,h) => s + h.streak, 0) / total).toFixed(1)
      : 0;

    // Completion % last 7 days
    let done7 = 0, slots7 = 0;
    habits.forEach(h => last7.forEach(d => { slots7++; if (h.completedDates.includes(d)) done7++; }));
    const completionPct = slots7 > 0 ? Math.round((done7/slots7)*100) : 0;

    // Weekly consistency: how many of last 7 days had ≥50% done
    const consistent = last7.filter(d => {
      const cnt = habits.filter(h => h.completedDates.includes(d)).length;
      return total > 0 && (cnt/total) >= 0.5;
    }).length;
    const weeklyConsistency = total > 0 ? Math.round((consistent/7)*100) : 0;

    // Completed today
    const todayDone = habits.filter(h => h.completedDates.includes(todayS)).length;

    setEl('card-total-completions',   totalCompletions);
    setEl('card-avg-streak',         `${avgStreak}d`);
    setEl('card-completion-pct',     `${completionPct}%`);
    setEl('card-weekly-consistency', `${weeklyConsistency}%`);
    setEl('card-today-done',         `${todayDone}/${total}`);
    setEl('card-longest-streak',     habits.reduce((m,h)=>Math.max(m,h.longestStreak||0,h.streak),0)+'d');

    // Ring for completion pct card
    const ring = document.querySelector('.ring-fill-ana');
    const lbl  = document.querySelector('.ring-label');
    if (ring) ring.setAttribute('stroke-dasharray', `${completionPct},100`);
    if (lbl)  lbl.textContent = `${completionPct}%`;

    // Old compatibility
    setEl('ana-best-value',   habits.length ? `${[...habits].sort((a,b)=>b.streak-a.streak)[0].icon} ${[...habits].sort((a,b)=>b.streak-a.streak)[0].name}` : '—');
    setEl('ana-best-meta',    habits.length ? `${[...habits].sort((a,b)=>b.streak-a.streak)[0].streak}-day streak` : '');
    setEl('ana-completion',   `${completionPct}%`);
    const worstHabit = [...habits].map(h=>({...h,ws:last7.filter(d=>h.completedDates.includes(d)).length})).sort((a,b)=>a.ws-b.ws)[0];
    setEl('ana-missed-value', worstHabit ? `${worstHabit.icon} ${worstHabit.name}` : '—');
    setEl('ana-missed-meta',  worstHabit ? `${7-worstHabit.ws} days missed this week` : '');
  }

  /* ══════════════════════════════════
     2. PRODUCTIVITY SCORE
  ══════════════════════════════════ */
  function renderProductivityScore(habits) {
    const el    = document.getElementById('productivityScore');
    const ring  = document.getElementById('productivityRing');
    const label = document.getElementById('productivityLabel');
    if (!el) return;

    const last7  = getLastNDays(7);
    const total  = habits.length;
    if (total === 0) {
      el.textContent = '0';
      if (ring) ring.setAttribute('stroke-dasharray','0,100');
      if (label) { label.textContent = 'No habits yet'; label.className = 'prod-label muted'; }
      return;
    }

    let done7 = 0;
    habits.forEach(h => last7.forEach(d => { if (h.completedDates.includes(d)) done7++; }));
    const completionRate = done7 / (total * 7);

    // Avg streak factor (capped at 30 days for scoring)
    const avgStreak = habits.reduce((s,h) => s + Math.min(h.streak, 30), 0) / (total * 30);

    // Variety factor: how many categories used
    const cats = new Set(habits.map(h=>h.category)).size;
    const varietyFactor = cats / 5;

    // Combine: 60% completion, 30% streak, 10% variety
    const score = Math.round((completionRate * 60) + (avgStreak * 30) + (varietyFactor * 10));

    el.textContent = score;
    if (ring) ring.setAttribute('stroke-dasharray', `${score},100`);

    let level, color;
    if      (score >= 85) { level = 'Excellent 🚀'; color = 'var(--success)'; }
    else if (score >= 70) { level = 'Great 🔥';     color = '#22c55e'; }
    else if (score >= 55) { level = 'Good 👍';       color = 'var(--accent-purple-light)'; }
    else if (score >= 35) { level = 'Fair 🌱';       color = 'var(--warning)'; }
    else                  { level = 'Building 💪';   color = 'var(--danger)'; }

    if (label) { label.textContent = level; label.style.color = color; }
    if (ring)  ring.style.stroke = color;
  }

  /* ══════════════════════════════════
     3. WEEKLY LINE CHART (Chart.js)
  ══════════════════════════════════ */
  function renderWeeklyLineChart(habits) {
    const canvas = document.getElementById('chartWeeklyLine');
    if (!canvas) return;
    _destroy('weeklyLine');

    const days   = getLastNDays(14);
    const labels = days.map(d => { const dt=new Date(d+'T00:00:00'); return DAYS[dt.getDay()]; });
    const data   = days.map(d => {
      const t = habits.length;
      const c = habits.filter(h=>h.completedDates.includes(d)).length;
      return t > 0 ? Math.round((c/t)*100) : 0;
    });

    _charts.weeklyLine = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Completion %',
          data,
          borderColor: _accentLight(),
          backgroundColor: _isDark()
            ? 'rgba(167,139,250,0.12)'
            : 'rgba(124,58,237,0.08)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.45,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: _accentLight(),
          pointBorderColor: _isDark() ? '#1a1a26' : '#fff',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: _tooltipBg(),
            titleColor: _textColor(), bodyColor: _textColor(),
            borderColor: _isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1, padding: 10, cornerRadius: 10,
            callbacks: { label: ctx => ` ${ctx.parsed.y}% completed` },
          },
        },
        scales: {
          x: { grid:{ color:_gridColor() }, ticks:{ color:_textColor(), font:{size:11} } },
          y: {
            min:0, max:100,
            grid:{ color:_gridColor() },
            ticks:{ color:_textColor(), font:{size:11}, callback: v => `${v}%` },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════
     4. MONTHLY BAR CHART (Chart.js)
  ══════════════════════════════════ */
  function renderMonthlyBarChart(habits) {
    const canvas = document.getElementById('chartMonthlyBar');
    if (!canvas) return;
    _destroy('monthlyBar');

    // Last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year  = d.getFullYear();
      const month = d.getMonth();
      const label = MONTHS[month].slice(0,3);
      const daysInMonth = new Date(year, month+1, 0).getDate();
      let done = 0, slots = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        habits.forEach(h => {
          slots++;
          if (h.completedDates.includes(ds)) done++;
        });
      }
      const pct = slots > 0 ? Math.round((done/slots)*100) : 0;
      months.push({ label, pct });
    }

    const palette = months.map((_,i) =>
      i === months.length-1 ? _accentLight() : (_isDark() ? 'rgba(124,58,237,0.55)' : 'rgba(124,58,237,0.4)')
    );

    _charts.monthlyBar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months.map(m=>m.label),
        datasets: [{
          label: 'Monthly Completion %',
          data: months.map(m=>m.pct),
          backgroundColor: palette,
          borderColor: palette.map(c => c.replace('0.55','0.9').replace('0.4','0.8')),
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutBounce' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: _tooltipBg(),
            titleColor: _textColor(), bodyColor: _textColor(),
            borderColor: _isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1, padding: 10, cornerRadius: 10,
            callbacks: { label: ctx => ` ${ctx.parsed.y}% completion` },
          },
        },
        scales: {
          x: { grid:{ display:false }, ticks:{ color:_textColor(), font:{size:11} } },
          y: {
            min:0, max:100,
            grid:{ color:_gridColor() },
            ticks:{ color:_textColor(), font:{size:11}, callback: v => `${v}%` },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════
     5. CATEGORY PIE CHART (Chart.js)
  ══════════════════════════════════ */
  function renderCategoryPieChart(habits) {
    const canvas = document.getElementById('chartCategoryPie');
    if (!canvas) return;
    _destroy('categoryPie');

    const catCounts = {};
    habits.forEach(h => { catCounts[h.category] = (catCounts[h.category]||0)+1; });
    const cats   = Object.keys(catCounts);
    const counts = cats.map(c => catCounts[c]);
    const colors = cats.map(c => CATEGORY_COLORS[c] || '#8b5cf6');

    if (cats.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      return;
    }

    _charts.categoryPie = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: cats.map(c => c.charAt(0).toUpperCase()+c.slice(1)),
        datasets: [{
          data: counts,
          backgroundColor: colors.map(c => c+'cc'),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 12,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { animateRotate: true, animateScale: true, duration: 900 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: _textColor(), padding: 14,
              font: { size: 12 },
              usePointStyle: true, pointStyleWidth: 10,
            },
          },
          tooltip: {
            backgroundColor: _tooltipBg(),
            titleColor: _textColor(), bodyColor: _textColor(),
            borderColor: _isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1, padding: 10, cornerRadius: 10,
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                const pct   = Math.round((ctx.parsed/total)*100);
                return ` ${ctx.label}: ${ctx.parsed} habit${ctx.parsed!==1?'s':''} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  /* ══════════════════════════════════
     6. COMPLETION DOUGHNUT (Chart.js)
  ══════════════════════════════════ */
  function renderCompletionDoughnut(habits) {
    const canvas = document.getElementById('chartCompletionDonut');
    if (!canvas) return;
    _destroy('completionDonut');

    const todayS = today();
    const done   = habits.filter(h => h.completedDates.includes(todayS)).length;
    const total  = habits.length;
    const pending = total - done;

    _charts.completionDonut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending'],
        datasets: [{
          data: total > 0 ? [done, pending] : [0, 1],
          backgroundColor: [
            'rgba(34,197,94,0.85)',
            _isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          ],
          borderColor: ['#22c55e', 'transparent'],
          borderWidth: [2, 0],
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '72%',
        animation: { animateRotate: true, duration: 900 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: _textColor(), padding: 16, font:{size:12}, usePointStyle:true, pointStyleWidth:10 },
          },
          tooltip: {
            backgroundColor: _tooltipBg(), titleColor:_textColor(), bodyColor:_textColor(),
            borderColor: _isDark()?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)',
            borderWidth:1, padding:10, cornerRadius:10,
          },
        },
      },
    });
  }

  /* ══════════════════════════════════
     7. MISSED HABIT ANALYSIS
  ══════════════════════════════════ */
  function renderMissedAnalysis(habits) {
    const container = document.getElementById('missedAnalysis');
    if (!container) return;

    if (!habits.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:1rem 0;">No habits to analyze.</p>';
      return;
    }

    const last14 = getLastNDays(14);
    const analyzed = habits.map(h => {
      const missed = last14.filter(d => !h.completedDates.includes(d) && d <= today()).length;
      const done   = last14.filter(d => h.completedDates.includes(d)).length;
      const pct    = Math.round((done/14)*100);
      return { ...h, missed14: missed, done14: done, pct14: pct };
    }).sort((a,b) => b.missed14 - a.missed14);

    container.innerHTML = analyzed.map(h => {
      const riskClass = h.missed14 >= 10 ? 'high' : h.missed14 >= 5 ? 'medium' : 'low';
      const riskLabel = h.missed14 >= 10 ? '🔴 High Risk' : h.missed14 >= 5 ? '🟡 Medium' : '🟢 On Track';
      return `
        <div class="missed-row glass-card">
          <div class="mr-left">
            <span class="mr-icon">${escapeHtml(h.icon)}</span>
            <div class="mr-info">
              <span class="mr-name">${escapeHtml(h.name)}</span>
              <span class="mr-meta">${h.done14}/14 days · ${h.pct14}% rate</span>
            </div>
          </div>
          <div class="mr-right">
            <span class="mr-risk ${riskClass}">${riskLabel}</span>
            <span class="mr-missed-count">${h.missed14} missed</span>
          </div>
        </div>`;
    }).join('');
  }

  /* ══════════════════════════════════
     8. BEST & WORST HABITS
  ══════════════════════════════════ */
  function renderBestWorstHabits(habits) {
    const bestEl  = document.getElementById('bestHabitCard');
    const worstEl = document.getElementById('worstHabitCard');
    if (!bestEl || !worstEl) return;

    if (!habits.length) {
      bestEl.innerHTML  = _emptyHabitCard('Best Habit', '🏆');
      worstEl.innerHTML = _emptyHabitCard('Needs Work', '⚠️');
      return;
    }

    const last14 = getLastNDays(14);
    const scored = habits.map(h => ({
      ...h,
      pct: Math.round((last14.filter(d=>h.completedDates.includes(d)).length/14)*100),
    })).sort((a,b) => b.pct - a.pct);

    const best  = scored[0];
    const worst = scored[scored.length-1];

    bestEl.innerHTML = _habitPerfCard(best, '🏆 Best Performer', 'best');
    worstEl.innerHTML = _habitPerfCard(worst, '💪 Needs Attention', 'worst');
  }

  function _habitPerfCard(h, label, type) {
    const color = type==='best' ? 'var(--success)' : 'var(--warning)';
    return `
      <div class="perf-card-inner">
        <span class="perf-label" style="color:${color};">${label}</span>
        <div class="perf-icon-row">
          <span class="perf-icon" style="background:${h.color}22;color:${h.color};">${escapeHtml(h.icon)}</span>
          <div>
            <div class="perf-name">${escapeHtml(h.name)}</div>
            <div class="perf-meta">${capitalize(h.category)}</div>
          </div>
        </div>
        <div class="perf-stats">
          <div class="perf-stat"><span class="ps-val" style="color:${color};">${h.pct}%</span><span class="ps-lbl">14-day rate</span></div>
          <div class="perf-stat"><span class="ps-val">${h.streak}d</span><span class="ps-lbl">Streak</span></div>
          <div class="perf-stat"><span class="ps-val">${h.longestStreak||0}d</span><span class="ps-lbl">Best</span></div>
        </div>
      </div>`;
  }

  function _emptyHabitCard(label, icon) {
    return `<div class="perf-card-inner"><span class="perf-label">${icon} ${label}</span>
      <p style="color:var(--text-muted);font-size:.85rem;margin-top:.75rem;">Add habits to see insights.</p></div>`;
  }

  /* ══════════════════════════════════
     9. ACTIVITY HEATMAP (CSS grid)
  ══════════════════════════════════ */
  function renderHeatmap(habits) {
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const now = new Date();
    for (let i = 69; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate()-i);
      const ds   = toDateString(d);
      const done = habits.filter(h=>h.completedDates.includes(ds)).length;
      const tot  = habits.length;
      let level = 0;
      if (tot > 0) {
        const p = done/tot;
        if (p>=0.75) level=4; else if (p>=0.5) level=3; else if (p>=0.25) level=2; else if (p>0) level=1;
      }
      const cell = document.createElement('div');
      cell.className = `heatmap-cell${level?` level-${level}`:''}`;
      cell.title = `${ds}: ${done}/${tot} habits`;
      grid.appendChild(cell);
    }
  }

  /* ══════════════════════════════════
     10. PER-HABIT BREAKDOWN BARS
  ══════════════════════════════════ */
  function renderBreakdown(habits) {
    const list = document.getElementById('habitBreakdown');
    if (!list) return;
    if (!habits.length) {
      list.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><p>No habits to analyze yet.</p></div>';
      return;
    }
    const last7 = getLastNDays(7);
    const scored = habits.map(h => {
      const done = last7.filter(d=>h.completedDates.includes(d)).length;
      return { ...h, pct: Math.round((done/7)*100) };
    }).sort((a,b)=>b.pct-a.pct);

    list.innerHTML = scored.map(h=>`
      <div class="breakdown-item glass-card">
        <span class="bi-icon">${escapeHtml(h.icon)}</span>
        <span class="bi-name">${escapeHtml(h.name)}</span>
        <div class="bi-bar-wrap">
          <div class="bi-bar" style="width:${h.pct}%;background:${h.color};"></div>
        </div>
        <span class="bi-pct" style="color:${h.pct>=75?'var(--success)':h.pct>=40?'var(--warning)':'var(--danger)'};">${h.pct}%</span>
      </div>`).join('');
  }

  /* ══════════════════════════════════
     11. STREAK LEADERBOARD
  ══════════════════════════════════ */
  function renderStreakLeaderboard(habits) {
    const c = document.getElementById('streakLeaderboard');
    if (!c) return;
    if (!habits.length) { c.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;">No habits yet.</p>'; return; }
    const sorted = [...habits].sort((a,b)=>b.streak-a.streak).slice(0,5);
    c.innerHTML = sorted.map((h,i)=>{
      const medal = ['🥇','🥈','🥉'][i] || '';
      return `
        <div class="streak-row glass-card">
          <span class="sr-rank">${medal||`#${i+1}`}</span>
          <span class="sr-icon">${escapeHtml(h.icon)}</span>
          <span class="sr-name">${escapeHtml(h.name)}</span>
          <div class="sr-bar-wrap"><div class="sr-bar" style="width:${Math.min(100,h.streak*4)}%;background:${h.color};"></div></div>
          <span class="sr-streak"><i class="fa-solid fa-fire" style="color:#f97316;"></i> ${h.streak}d</span>
        </div>`;
    }).join('');
  }

  /* ── Period buttons ── */
  function initPeriodBtns(onPeriodChange) {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        onPeriodChange(btn.textContent.toLowerCase());
      });
    });
  }

  /* ── Theme-change re-render (call from settings) ── */
  function refreshTheme(habits) {
    Object.keys(_charts).forEach(k => { _charts[k].destroy(); delete _charts[k]; });
    render(habits);
  }

  function setEl(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }

  return { render, initPeriodBtns, refreshTheme };
})();
