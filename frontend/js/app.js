/* ═══════════════════════════════════════════════════════════════
   HABITFLOW — app.js  (Phase 7 — Full-Stack with MySQL Backend)
   All habit data now reads/writes from MySQL via the API.
   localStorage is used only for settings (theme, accent, etc.)
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════
   TOAST VIEW
════════════════════════════════════ */
const ToastView = (() => {
  const container = () => document.getElementById('toastContainer');
  const ICONS = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info:    'fa-circle-info',
  };
  function show(message, type='success', duration=3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role','alert');
    toast.innerHTML = `
      <i class="fa-solid ${ICONS[type]||ICONS.success}" aria-hidden="true"></i>
      <span>${escapeHtml(String(message))}</span>
      <button class="toast-dismiss" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;
    toast.querySelector('.toast-dismiss').onclick = () => dismiss(toast);
    container()?.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => dismiss(toast), duration);
  }
  function dismiss(toast) {
    toast.classList.remove('visible'); toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 350);
  }
  return { show };
})();

/* ════════════════════════════════════
   SKELETON LOADER
════════════════════════════════════ */
const SkeletonLoader = (() => {
  function showHabits(container) {
    if (!container) return;
    container.innerHTML = Array(3).fill(0).map(() => `
      <div class="habit-card glass-card skeleton-card" aria-hidden="true">
        <div class="hc-top">
          <div class="skeleton-box" style="width:46px;height:46px;border-radius:14px;flex-shrink:0;"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:.5rem;">
            <div class="skeleton-box" style="width:60%;height:16px;border-radius:8px;"></div>
            <div class="skeleton-box" style="width:35%;height:12px;border-radius:8px;"></div>
          </div>
        </div>
        <div class="skeleton-box" style="width:100%;height:5px;border-radius:99px;"></div>
        <div style="display:flex;gap:.75rem;">
          <div class="skeleton-box" style="width:80px;height:12px;border-radius:8px;"></div>
          <div class="skeleton-box" style="width:90px;height:28px;border-radius:99px;margin-left:auto;"></div>
        </div>
      </div>`).join('');
  }
  function showStats(container) {
    // DO NOT replace innerHTML — the real stat card IDs must stay in the DOM
    // for renderStats() to update them. Just add a visual loading class.
    if (!container) return;
    container.querySelectorAll('.stat-card').forEach(card => {
      card.classList.add('skeleton-loading');
    });
  }
  function hideStats(container) {
    if (!container) return;
    container.querySelectorAll('.stat-card').forEach(card => {
      card.classList.remove('skeleton-loading');
    });
  }
  return { showHabits, showStats, hideStats };
})();

/* ════════════════════════════════════
   NOTIFICATION SERVICE
════════════════════════════════════ */
const NotificationService = (() => {
  let _timerId = null;
  async function requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  return false;
    return (await Notification.requestPermission()) === 'granted';
  }
  function getPermissionStatus() { return 'Notification' in window ? Notification.permission : 'unsupported'; }
  function sendNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, { body, tag: 'habitflow-reminder' });
    n.onclick = () => { window.focus(); n.close(); };
  }
  function scheduleDaily(timeStr, habits) {
    clearDailySchedule();
    if (!timeStr) return;
    const [hh, mm] = timeStr.split(':').map(Number);
    function msUntilNext() {
      const now=new Date(), next=new Date();
      next.setHours(hh,mm,0,0); if (next<=now) next.setDate(next.getDate()+1);
      return next-now;
    }
    function fire() {
      const pending = habits.filter(h => !h.completedDates.includes(today()));
      if (pending.length > 0) sendNotification('🔔 HabitFlow Reminder', `${pending.length} habit${pending.length>1?'s':''} pending today!`);
      _timerId = setTimeout(fire, 24*60*60*1000);
    }
    _timerId = setTimeout(fire, msUntilNext());
  }
  function clearDailySchedule() { if (_timerId) { clearTimeout(_timerId); _timerId=null; } }
  function sendStreakAlert(name, streak) { sendNotification(`🔥 ${streak}-Day Streak!`, `Keep going on "${name}"!`); }
  return { requestPermission, getPermissionStatus, sendNotification, scheduleDaily, clearDailySchedule, sendStreakAlert };
})();

/* ════════════════════════════════════
   PDF EXPORT
════════════════════════════════════ */
const PDFExport = (() => {
  function generate(habits) {
    if (typeof window.jspdf === 'undefined') { ToastView.show('PDF library loading… try again', 'info'); return; }
    const { jsPDF } = window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const W=doc.internal.pageSize.getWidth();
    const now=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    const todayStr=today();
    doc.setFillColor(124,58,237); doc.rect(0,0,W,28,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(20); doc.setFont('helvetica','bold');
    doc.text('HabitFlow — Habit Report', 14, 12);
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text(`Generated: ${now}`, 14, 22);
    let y=38; doc.setTextColor(30,30,40);
    const doneToday=habits.filter(h=>h.completedDates.includes(todayStr)).length;
    const bestStreak=habits.reduce((m,h)=>Math.max(m,h.streak||0),0);
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.text('Summary', 14, y); y+=7;
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,100);
    doc.text(`Total Habits: ${habits.length}`, 14, y); y+=6;
    doc.text(`Completed Today: ${doneToday} / ${habits.length}`, 14, y); y+=6;
    doc.text(`Best Active Streak: ${bestStreak} days`, 14, y); y+=10;
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,40);
    doc.text('Habit Details', 14, y); y+=7;
    doc.setFillColor(240,237,255); doc.rect(12,y-5,W-24,8,'F');
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(80,50,180);
    ['Habit','Category','Streak','Best','Done Today'].forEach((h,i)=>doc.text(h,[14,60,95,112,145][i],y));
    y+=6;
    habits.forEach((h,idx)=>{
      if (y>270){doc.addPage();y=20;}
      if (idx%2===0){doc.setFillColor(250,249,255);doc.rect(12,y-4,W-24,7,'F');}
      doc.setFont('helvetica','normal'); doc.setTextColor(30,30,40); doc.setFontSize(9);
      const doneT=h.completedDates.includes(todayStr)?'✓':'✗';
      [h.name.slice(0,22),capitalize(h.category),`${h.streak||0}d`,`${h.longestStreak||0}d`,doneT]
        .forEach((v,i)=>{
          if(i===4)doc.setTextColor(v==='✓'?22:200,v==='✓'?160:50,40);
          else doc.setTextColor(30,30,40);
          doc.text(v,[14,60,95,112,145][i],y);
        });
      y+=7;
    });
    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(8);doc.setTextColor(160,160,180);doc.text(`HabitFlow Report · Page ${p}/${pages}`,14,290);}
    doc.save(`HabitFlow-Report-${today()}.pdf`);
  }
  return { generate };
})();

/* ════════════════════════════════════
   MODEL — settings only (habits go to MySQL via HabitController)
════════════════════════════════════ */
const Model = (() => {
  const DEFAULT_SETTINGS = {
    theme:'dark', accent:'purple', fontSize:'medium',
    avatar:'🧑',
    notificationsEnabled:false, reminderTime:'08:00',
    streakAlerts:true, weeklySummary:false,
  };
  function getHabits()  { return HabitController.getAll(); }
  function getSettings() { try { return { ...DEFAULT_SETTINGS, avatar: HFAuth.getUser()?.avatar_url || DEFAULT_SETTINGS.avatar, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }; } catch { return { ...DEFAULT_SETTINGS }; } }
  function updateSettings(p) { const s={...getSettings(),...p}; localStorage.setItem(SETTINGS_KEY,JSON.stringify(s)); return s; }
  function getEarnedAchievements()      { try { return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY))||[]; } catch { return []; } }
  function saveEarnedAchievements(list) { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(list)); }
  function exportJSON() {
    const h=HabitController.getAll();
    _dl('habitflow-export.json', JSON.stringify({habits:h,settings:getSettings(),exportedAt:new Date().toISOString()},null,2),'application/json');
  }
  function exportCSV() {
    const habits=HabitController.getAll();
    const header=['ID','Name','Category','Icon','Frequency','Streak','LongestStreak','TotalCompleted'];
    const rows=habits.map(h=>[h.id,`"${h.name}"`,h.category,h.icon,h.frequency,h.streak||0,h.longestStreak||0,h.totalCompleted||0]);
    _dl('habitflow-export.csv',[header,...rows].map(r=>r.join(',')).join('\n'),'text/csv');
  }
  function _dl(name,content,type){const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([content],{type})),download:name});a.click();URL.revokeObjectURL(a.href);}
  return { getHabits, getSettings, updateSettings, getEarnedAchievements, saveEarnedAchievements, exportJSON, exportCSV };
})();

/* ════════════════════════════════════
   ACHIEVEMENT ENGINE
════════════════════════════════════ */
const AchievementEngine = (() => {
  function check(habits) {
    const earned=Model.getEarnedAchievements(), ids=earned.map(a=>a.id), newOnes=[];
    ACHIEVEMENTS.forEach(a => {
      if (!ids.includes(a.id) && a.check(habits)) {
        newOnes.push(a); earned.push({id:a.id,earnedAt:new Date().toISOString()});
      }
    });
    if (newOnes.length) { Model.saveEarnedAchievements(earned); newOnes.forEach((a,i)=>setTimeout(()=>_toast(a),400+i*600)); }
    return earned;
  }
  function getEarned() { const ids=Model.getEarnedAchievements().map(a=>a.id); return ACHIEVEMENTS.filter(a=>ids.includes(a.id)); }
  function _toast(a) {
    const t=document.createElement('div'); t.className='toast achievement-toast'; t.setAttribute('role','alert');
    t.innerHTML=`<span class="ach-toast-icon">${a.icon}</span><div><div class="ach-toast-title">Achievement Unlocked! 🎊</div><div class="ach-toast-desc">${a.title} — ${a.desc}</div></div>`;
    document.getElementById('toastContainer')?.appendChild(t);
    requestAnimationFrame(()=>t.classList.add('visible'));
    setTimeout(()=>{t.classList.remove('visible');t.classList.add('hiding');setTimeout(()=>t.remove(),350);},5000);
  }
  return { check, getEarned };
})();

/* ════════════════════════════════════
   APP CONTROLLER (Phase 7 — API-backed)
════════════════════════════════════ */
const App = (() => {
  let _initialized = false;

  async function init() {
    if (_initialized) return;
    _initialized = true;

    // Apply settings immediately (from localStorage — instant, no API needed)
    const settings = Model.getSettings();
    NavbarView.applyTheme(settings.theme);
    SettingsView.applyAccent(settings.accent);
    applyFontSize(settings.fontSize);

    // Show skeleton loaders while data loads
    SkeletonLoader.showStats(document.querySelector('.stats-grid'));
    SkeletonLoader.showHabits(document.getElementById('habitsGrid'));

    // Wire up all UI handlers
    NavbarView.init(navigateTo, handleThemeToggle);
    HabitView.initModal(handleSaveHabit, handleDeleteHabit);
    HabitView.initFilters(() => renderCurrentHabits());
    SettingsView.init(settings, handleThemeToggle, handleAccentChange, handleExport, handleReset, handleAvatarChange);
    AnalyticsView.initPeriodBtns(() => renderAnalytics());
    _wireKeyboard();
    _wireNotifications(settings);

    DashboardView.renderHero();

    // ── LOAD HABITS FROM MYSQL ────────────────────────────────
    try {
      await HabitController.load();
    } catch (e) {
      console.error('Failed to load habits from backend:', e);
      ToastView.show('⚠️ Could not connect to backend. Check that node server.js is running.', 'error', 6000);
    }

    // Render everything with real data
    AchievementEngine.check(HabitController.getAll());
    renderDashboard();
    SettingsView.refreshStats();
    navigateTo('dashboard');
  }

  /* ── Navigation ── */
  function navigateTo(sectionId) {
    NavbarView.showSection(sectionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if      (sectionId === 'dashboard')  renderDashboard();
    else if (sectionId === 'habits')     renderCurrentHabits();
    else if (sectionId === 'analytics')  renderAnalytics();
    else if (sectionId === 'calendar')   renderCalendar();
  }

  /* ── Render dashboard ── */
  function renderDashboard() {
    const habits = HabitController.getAll();
    DashboardView.renderStats(habits);
    DashboardView.renderQuickHabits(habits, handleToggleFromDashboard);
    DashboardView.renderAchievements(AchievementEngine.getEarned());
  }

  /* ── Render habits tab ── */
  function renderCurrentHabits() {
    HabitView.renderHabits(HabitController.getAll(), handleToggle, handleEditHabit, handleOpenDelete);
  }

  /* ── Render analytics tab (uses MySQL data) ── */
  async function renderAnalytics() {
    const habits = HabitController.getAll();
    // First render with local data for instant feel
    AnalyticsView.render(habits);
    // Then fetch real analytics from MySQL and re-render if the view supports it
    try {
      const analytics = await DashboardController.loadAll();
      if (analytics.weekly && AnalyticsView.renderFromAPI) {
        AnalyticsView.renderFromAPI(habits, analytics);
      } else {
        AnalyticsView.render(habits);
      }
    } catch (e) {
      console.warn('Analytics API unavailable, using local data:', e);
    }
  }

  /* ── Render calendar tab ── */
  async function renderCalendar() {
    const habits = HabitController.getAll();
    CalendarView.init(habits);
    try {
      const now  = new Date();
      const calData = await DashboardController.getCalendarData(now.getMonth() + 1, now.getFullYear());
      if (calData && CalendarView.renderFromAPI) {
        CalendarView.renderFromAPI(habits, calData);
      } else {
        CalendarView.refresh(habits);
      }
    } catch (e) {
      CalendarView.refresh(habits);
    }
  }

  /* ── Toggle complete (from habits tab) ── */
  async function handleToggle(id) {
    const updated = await HabitController.toggleComplete(id);
    if (!updated) return;
    const done = updated.completedDates && updated.completedDates.includes(today());
    if (done) { fireCelebration(); checkStreakMilestone(updated); }
    AchievementEngine.check(HabitController.getAll());
    renderCurrentHabits();
    renderDashboard();
    SettingsView.refreshStats();
    CalendarView.refresh(HabitController.getAll());
  }

  /* ── Toggle complete (from dashboard quick list) ── */
  async function handleToggleFromDashboard(id) {
    const updated = await HabitController.toggleComplete(id);
    if (!updated) return;
    const done = updated.completedDates && updated.completedDates.includes(today());
    if (done) { fireCelebration(); checkStreakMilestone(updated); }
    AchievementEngine.check(HabitController.getAll());
    renderDashboard();
    SettingsView.refreshStats();
    CalendarView.refresh(HabitController.getAll());
  }

  /* ── Save habit (create or update) ── */
  async function handleSaveHabit(editId) {
    const data   = HabitView.getFormData();
    const habits = HabitController.getAll();
    if (!HabitView.validateForm(data, habits)) return;

    const saveBtn = document.getElementById('saveHabit');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }

    try {
      let result;
      if (editId) {
        result = await HabitController.update(editId, data);
      } else {
        result = await HabitController.create(data);
      }
      if (!result) return;

      HabitView.closeModal();
      AchievementEngine.check(HabitController.getAll());
      renderCurrentHabits();
      renderDashboard();
      SettingsView.refreshStats();
      if (typeof AnalyticsView !== 'undefined' && AnalyticsView.render) AnalyticsView.render(HabitController.getAll());
      if (typeof CalendarView  !== 'undefined' && CalendarView.refresh) CalendarView.refresh(HabitController.getAll());
    } catch (err) {
      console.error('Error saving habit:', err);
      ToastView.show('An error occurred while saving habit.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = editId ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes' : '<i class="fa-solid fa-plus"></i> Add Habit';
      }
    }
  }

  window.triggerSaveHabit = () => handleSaveHabit(HabitView.getCurrentEditId ? HabitView.getCurrentEditId() : null);

  /* ── Edit habit — open modal prefilled ── */
  function handleEditHabit(id) {
    const h = HabitController.getById(id);
    if (h) HabitView.openModal(h);
  }

  /* ── Open delete confirmation modal ── */
  function handleOpenDelete(id) { HabitView.openDeleteModal(id); }

  /* ── Delete habit ── */
  async function handleDeleteHabit(id) {
    const ok = await HabitController.remove(id);
    if (!ok) return;
    const habits = HabitController.getAll();
    renderCurrentHabits();
    renderDashboard();
    SettingsView.refreshStats();
    CalendarView.refresh(habits);
    AnalyticsView.render(habits);
  }

  /* ── Settings handlers ── */
  async function handleThemeToggle() {
    const next = Model.getSettings().theme === 'dark' ? 'light' : 'dark';
    Model.updateSettings({ theme: next });
    NavbarView.applyTheme(next);
    SettingsView.init(Model.getSettings(), handleThemeToggle, handleAccentChange, handleExport, handleReset, handleAvatarChange);
    setTimeout(() => AnalyticsView.refreshTheme(HabitController.getAll()), 50);
    ToastView.show(`Switched to ${next} mode`, 'success');
    if (typeof SettingsAPI !== 'undefined') {
      await SettingsAPI.update({ theme: next });
    }
  }

  async function handleAccentChange(accent) {
    Model.updateSettings({ accent }); SettingsView.applyAccent(accent);
    ToastView.show('Accent color updated!', 'success');
    if (typeof SettingsAPI !== 'undefined') {
      await SettingsAPI.update({ accent_color: accent });
    }
  }

  async function handleAvatarChange(avatar) {
    const user = HFAuth.getUser() || {};
    const updatedUser = { ...user, avatar_url: avatar };
    HFAuth.setUser(updatedUser);
    Model.updateSettings({ avatar });
    injectUserIntoDashboard();
    ToastView.show('Profile avatar updated!', 'success');
    if (typeof AuthAPI !== 'undefined') {
      const result = await AuthAPI.updateProfile({ avatar_url: avatar });
      if (!result.ok) ToastView.show(result.data?.message || 'Could not save avatar.', 'error');
    }
  }

  async function handleExport(fmt) {
    const habits = HabitController.getAll();
    if (!habits.length) { ToastView.show('No habits to export yet', 'warning'); return; }

    if (fmt === 'csv') {
      ToastView.show('Generating CSV export… 📊', 'info');
      if (typeof ExportAPI !== 'undefined') {
        const res = await ExportAPI.downloadCsv();
        if (res.ok) { ToastView.show('CSV exported successfully! 📊', 'success'); return; }
      }
      Model.exportCSV();
      ToastView.show('Exported as CSV! 📊', 'success');
    } else if (fmt === 'json') {
      Model.exportJSON();
      ToastView.show('Exported as JSON! 📦', 'success');
    } else if (fmt === 'pdf') {
      ToastView.show('Generating PDF report… 📄', 'info');
      if (typeof ExportAPI !== 'undefined') {
        const res = await ExportAPI.downloadPdf();
        if (res.ok) { ToastView.show('PDF report downloaded! 📄', 'success'); return; }
      }
      PDFExport.generate(habits);
      ToastView.show('PDF generated successfully! 📄', 'success');
    }
  }

  function handleReset() {
    const modal = document.getElementById('resetConfirmModal');
    if (modal) {
      modal.classList.add('open');
      document.getElementById('confirmResetBtn')?.addEventListener('click', async () => {
        modal.classList.remove('open');
        let resetSuccess = false;
        if (typeof UserAPI !== 'undefined') {
          const res = await UserAPI.resetData();
          if (res.ok) resetSuccess = true;
        }

        if (!resetSuccess) {
          // Fallback deletion
          const habits = HabitController.getAll();
          await Promise.all(habits.map(h => HabitController.remove(h.id)));
        }

        await HabitController.load();
        ToastView.show('All habit data reset successfully', 'warning');
        renderDashboard(); renderCurrentHabits(); SettingsView.refreshStats();
        CalendarView.refresh([]); AnalyticsView.render([]);
      }, { once: true });
      document.getElementById('cancelResetBtn')?.addEventListener('click', () => modal.classList.remove('open'), { once: true });
    }
  }

  async function handleFontSizeChange(size) {
    Model.updateSettings({ fontSize: size }); applyFontSize(size);
    ToastView.show(`Font size set to ${size}`, 'success');
    if (typeof SettingsAPI !== 'undefined') {
      await SettingsAPI.update({ font_size: size });
    }
  }

  /* ── Notifications ── */
  function _wireNotifications(settings) {
    if (settings.notificationsEnabled) {
      NotificationService.requestPermission().then(granted => {
        if (granted) NotificationService.scheduleDaily(settings.reminderTime, HabitController.getAll());
      });
    }
    window._habitflowNotifToggle = async (enabled, time) => {
      if (enabled) {
        const granted = await NotificationService.requestPermission();
        if (!granted) { ToastView.show('Notifications permission denied', 'error'); return false; }
        NotificationService.scheduleDaily(time || '08:00', HabitController.getAll());
        ToastView.show('Daily reminders enabled! 🔔', 'success');
      } else {
        NotificationService.clearDailySchedule();
        ToastView.show('Reminders disabled', 'warning');
      }
      if (typeof RemindersAPI !== 'undefined') {
        await RemindersAPI.save({ reminder_time: time || '08:00:00', is_enabled: enabled });
      }
      return true;
    };
    window._habitflowSetFontSize  = handleFontSizeChange;
    window._habitflowHandleExport = handleExport;
  }

  /* ── Keyboard shortcuts ── */
  function _wireKeyboard() {
    document.addEventListener('keydown', e => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Escape') {
        HabitView.closeModal();
        document.getElementById('deleteModal')?.classList.remove('open');
        document.getElementById('resetConfirmModal')?.classList.remove('open');
      }
      if (e.altKey) {
        const map = {'1':'dashboard','2':'habits','3':'analytics','4':'calendar','5':'settings'};
        if (map[e.key]) navigateTo(map[e.key]);
        if (e.key === 'n') HabitView.openModal();
      }
    });
  }

  /* ── Streak milestone toast ── */
  function checkStreakMilestone(habit) {
    if ([3,7,14,21,30,60,100,365].includes(habit.streak))
      setTimeout(() => ToastView.show(`🔥 ${habit.streak}-day streak on "${habit.name}"!`, 'success', 4500), 700);
  }

  /* ── Celebration burst ── */
  function fireCelebration() {
    const emojis = ['✨','🎉','⭐','🌟','💫','🔥','🎊','🎈'];
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        const x  = Math.random() * (window.innerWidth - 80) + 40;
        el.style.cssText = `position:fixed;left:${x}px;top:${window.innerHeight*0.35}px;pointer-events:none;z-index:9999;font-size:${1.1+Math.random()}rem;animation:burstUp 1s ease forwards;user-select:none;`;
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1000);
      }, i * 60);
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
