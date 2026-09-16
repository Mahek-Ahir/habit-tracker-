/* ═══════════════════════════════════════════════════════════════
   HABITFLOW — SettingsView  (Phase 5 — Final)
   Theme · Accent · Font size · Notifications · Export (CSV/JSON/PDF) ·
   Reset confirmation · Live stats · Accessibility
═══════════════════════════════════════════════════════════════ */
'use strict';

const SettingsView = (() => {

  function init(settings, onThemeToggle, onAccentChange, onExport, onReset, onAvatarChange) {

    /* ── Dark mode toggle ── */
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
      darkToggle.checked = (settings.theme === 'dark');
      const fresh = darkToggle.cloneNode(true);
      darkToggle.parentNode.replaceChild(fresh, darkToggle);
      fresh.addEventListener('change', onThemeToggle);
    }

    /* ── Profile avatar ── */
    const avatarPicker = document.getElementById('avatarPicker');
    if (avatarPicker) {
      avatarPicker.querySelectorAll('.avatar-choice').forEach(choice => {
        choice.classList.toggle('active', choice.dataset.avatar === (settings.avatar || '🧑'));
        choice.addEventListener('click', () => {
          avatarPicker.querySelectorAll('.avatar-choice').forEach(item => item.classList.remove('active'));
          choice.classList.add('active');
          if (typeof onAvatarChange === 'function') onAvatarChange(choice.dataset.avatar);
        });
      });
    }

    /* ── Accent swatches ── */
    document.querySelectorAll('.settings-group .swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === (settings.accent||'purple'));
      const f=s.cloneNode(true); s.parentNode.replaceChild(f,s);
    });
    document.querySelectorAll('.settings-group .swatch').forEach(s => {
      s.addEventListener('click', () => {
        document.querySelectorAll('.settings-group .swatch').forEach(x=>x.classList.remove('active'));
        s.classList.add('active'); onAccentChange(s.dataset.color);
      });
    });

    /* ── Font size selector ── */
    const fontSel = document.getElementById('fontSizeSelect');
    if (fontSel) {
      fontSel.value = settings.fontSize || 'medium';
      fontSel.addEventListener('change', () => {
        if (typeof window._habitflowSetFontSize === 'function')
          window._habitflowSetFontSize(fontSel.value);
      });
    }

    /* ── Notification toggle ── */
    const notifToggle = document.getElementById('notificationToggle');
    if (notifToggle) {
      notifToggle.checked = !!settings.notificationsEnabled;
      notifToggle.addEventListener('change', async () => {
        const timeInput = document.getElementById('reminderTimeInput');
        const time = timeInput?.value || '08:00';
        if (typeof window._habitflowNotifToggle === 'function') {
          const ok = await window._habitflowNotifToggle(notifToggle.checked, time);
          if (!ok) notifToggle.checked = false;
          else if (typeof Model !== 'undefined') Model.updateSettings({ notificationsEnabled: notifToggle.checked, reminderTime: time });
        }
      });
    }

    /* ── Streak alert toggle ── */
    const streakToggle = document.getElementById('streakAlertToggle');
    if (streakToggle) {
      streakToggle.checked = settings.streakAlerts !== false;
      streakToggle.addEventListener('change', () => {
        if (typeof Model !== 'undefined') Model.updateSettings({ streakAlerts: streakToggle.checked });
        if (typeof ToastView !== 'undefined') ToastView.show(`Streak alerts ${streakToggle.checked?'enabled':'disabled'}`, 'success');
      });
    }

    /* ── Weekly summary toggle ── */
    const weeklyToggle = document.getElementById('weeklySummaryToggle');
    if (weeklyToggle) {
      weeklyToggle.checked = !!settings.weeklySummary;
      weeklyToggle.addEventListener('change', () => {
        if (typeof Model !== 'undefined') Model.updateSettings({ weeklySummary: weeklyToggle.checked });
        if (typeof ToastView !== 'undefined') ToastView.show(`Weekly summary ${weeklyToggle.checked?'enabled':'disabled'}`, 'success');
      });
    }

    /* ── Reminder time ── */
    const timeInput = document.getElementById('reminderTimeInput');
    if (timeInput) {
      timeInput.value = settings.reminderTime || '08:00';
      timeInput.addEventListener('change', () => {
        if (typeof Model !== 'undefined') Model.updateSettings({ reminderTime: timeInput.value });
        if (typeof ToastView !== 'undefined') ToastView.show(`Reminder set for ${timeInput.value}`, 'success');
      });
    }

    /* ── Export buttons ── */
    [['exportCsvBtn','csv'],['exportJsonBtn','json'],['exportPdfBtn','pdf']].forEach(([id,fmt]) => {
      const btn = document.getElementById(id);
      if (btn) {
        const f=btn.cloneNode(true); btn.parentNode.replaceChild(f,btn);
        f.addEventListener('click', () => onExport(fmt));
      }
    });

    /* ── Reset button → custom modal ── */
    const resetBtn = document.getElementById('resetDataBtn');
    if (resetBtn) {
      const f=resetBtn.cloneNode(true); resetBtn.parentNode.replaceChild(f,resetBtn);
      f.addEventListener('click', onReset);
    }

    /* ── Test notification ── */
    const testBtn = document.getElementById('testNotifBtn');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const granted = await NotificationService.requestPermission();
        if (granted) {
          NotificationService.sendNotification('🔔 HabitFlow Test', 'Notifications are working! Great job setting up HabitFlow.');
          ToastView.show('Test notification sent!','success');
        } else {
          ToastView.show('Notification permission denied','error');
        }
      });
    }

    /* ── Live stats ── */
    renderSettingsStats();
  }

  function renderSettingsStats() {
    const el = document.getElementById('settingsStats');
    if (!el || typeof Model === 'undefined') return;
    const habits = Model.getHabits();
    const total  = habits.length;
    const done   = habits.reduce((s,h)=>s+h.completedDates.length,0);
    const best   = habits.reduce((m,h)=>Math.max(m,h.longestStreak||0,h.streak),0);
    const ach    = typeof AchievementEngine !== 'undefined' ? AchievementEngine.getEarned().length : 0;
    el.innerHTML = `
      <div class="settings-stat"><span class="ss-val">${total}</span><span class="ss-lbl">Habits</span></div>
      <div class="settings-stat"><span class="ss-val">${done}</span><span class="ss-lbl">Completions</span></div>
      <div class="settings-stat"><span class="ss-val">${best}d</span><span class="ss-lbl">Best Streak</span></div>
      <div class="settings-stat"><span class="ss-val">${ach}</span><span class="ss-lbl">Achievements</span></div>`;
  }

  function applyAccent(accent) {
    document.documentElement.setAttribute('data-accent', accent||'purple');
  }

  return { init, applyAccent, refreshStats: renderSettingsStats };
})();
