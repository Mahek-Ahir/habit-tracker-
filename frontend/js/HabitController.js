/* ═══════════════════════════════════════════════════════════════
   js/HabitController.js — Phase 7/8 Complete
   In-memory habit cache that syncs CRUD operations with MySQL
   and provides instant resilient UI fallback.
═══════════════════════════════════════════════════════════════ */
'use strict';

const HabitController = (() => {
  let _habits         = [];
  let _completedToday = new Set();
  let _loading        = false;

  const todayStr = () => new Date().toISOString().slice(0, 10);

  function toast(msg, type = 'success') {
    if (window.ToastView && ToastView.show) ToastView.show(msg, type);
  }

  function formatToIsoDate(val) {
    if (!val) return todayStr();
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (typeof val === 'string') {
      const parts = val.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
        if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      }
    }
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    } catch (e) {}
    return todayStr();
  }

  function normalizeHabit(h) {
    if (!h) return h;
    const catMap = { 1: 'health', 2: 'study', 3: 'fitness', 4: 'personal', 5: 'productivity' };
    const categorySlug = h.category || h.category_slug || catMap[h.category_id] || 'personal';
    const startDateFormatted = formatToIsoDate(h.startDate || h.start_date);

    return {
      ...h,
      id:             h.id,
      name:           h.name || 'Untitled Habit',
      description:    h.description || '',
      category:       categorySlug,
      category_id:    h.category_id || 1,
      icon:           h.icon || h.icon_emoji || '💧',
      color:          h.color || h.color_hex || '#7c3aed',
      frequency:      h.frequency || 'daily',
      streak:         h.streak !== undefined ? Number(h.streak) : Number(h.current_streak || 0),
      longestStreak:  h.longestStreak !== undefined ? Number(h.longestStreak) : Number(h.longest_streak || 0),
      totalCompleted: h.totalCompleted !== undefined ? Number(h.totalCompleted) : Number(h.total_completions || 0),
      missedDays:     h.missedDays !== undefined ? Number(h.missedDays) : Number(h.missed_days || 0),
      startDate:      startDateFormatted,
      completedDates: h.completedDates || (_completedToday.has(Number(h.id)) ? [todayStr()] : []),
    };
  }

  function applyCompletions(habits) {
    const td = todayStr();
    return habits.map(h => ({
      ...h,
      completedDates: _completedToday.has(Number(h.id)) ? [td] : (h.completedDates || []),
    }));
  }

  /* ── LOAD ─────────────────────────────────────────────────── */
  async function load() {
    if (_loading) return _habits;
    _loading = true;
    try {
      const res = await HabitsAPI.getAll();
      let rawList = [];
      if (res.ok && res.data) {
        rawList = res.data.habits || (Array.isArray(res.data) ? res.data : []);
      } else if (Array.isArray(res)) {
        rawList = res;
      }

      if (!res.ok) {
        throw new Error(res.data?.message || 'Unable to load habits from the backend.');
      }
      _habits = rawList.map(normalizeHabit);

      const dash = await TrackingAPI.getDashboard();
      if (dash && dash.data && dash.data.habits_today) {
        _completedToday = new Set(
          dash.data.habits_today.filter(h => h.completed_today).map(h => Number(h.id))
        );
      } else if (dash && dash.habits_today) {
        _completedToday = new Set(
          dash.habits_today.filter(h => h.completed_today).map(h => Number(h.id))
        );
      }

      _habits = applyCompletions(_habits);
      return _habits;
    } catch (e) {
      console.warn('HabitController.load fallback:', e);
      return _habits;
    } finally {
      _loading = false;
    }
  }

  /* ── READ ─────────────────────────────────────────────────── */
  function getAll()    { return _habits; }
  function getById(id) { return _habits.find(h => String(h.id) === String(id)) || null; }

  /* ── CREATE ───────────────────────────────────────────────── */
  async function create(formData) {
    const categoryMap = { health: 1, study: 2, fitness: 3, personal: 4, productivity: 5 };
    const payload = {
      name:        formData.name,
      description: formData.description || '',
      category_id: formData.category_id || categoryMap[formData.category] || 1,
      start_date:  formatToIsoDate(formData.start_date || formData.startDate),
      icon_emoji:  formData.icon_emoji || formData.icon || '💧',
      color_hex:   formData.color_hex  || formData.color || '#7c3aed',
      frequency:   formData.frequency  || 'daily',
    };

    let createdHabit = null;

    try {
      const result = await HabitsAPI.create(payload);
      if (result.ok && result.data) {
        const createdRaw = result.data.habit || result.data;
        createdHabit = normalizeHabit({ ...createdRaw, completedDates: [] });
      } else if (result.data && result.data.message) {
        console.warn('Backend returned error during create:', result.data.message);
      }
    } catch (err) {
      console.warn('HabitsAPI.create failed, falling back to instant local addition:', err);
    }

    if (!createdHabit) {
      throw new Error('Habit was not saved. Please check that the backend is running and try again.');
    }

    _habits = [createdHabit, ..._habits];
    toast(`✅ "${createdHabit.name}" added!`, 'success');
    return createdHabit;
  }

  /* ── UPDATE ───────────────────────────────────────────────── */
  async function update(id, formData) {
    const categoryMap = { health: 1, study: 2, fitness: 3, personal: 4, productivity: 5 };
    const payload = {
      name:        formData.name,
      description: formData.description || '',
      category_id: formData.category_id || categoryMap[formData.category] || 1,
      start_date:  formatToIsoDate(formData.start_date || formData.startDate),
      icon_emoji:  formData.icon_emoji || formData.icon || '💧',
      color_hex:   formData.color_hex  || formData.color || '#7c3aed',
      frequency:   formData.frequency  || 'daily',
    };

    let updatedHabit = null;

    try {
      const result = await HabitsAPI.update(id, payload);
      if (result.ok && result.data) {
        const updatedRaw = result.data.habit || result.data;
        const td = todayStr();
        updatedHabit = normalizeHabit({
          ...updatedRaw,
          completedDates: _completedToday.has(Number(id)) ? [td] : []
        });
      }
    } catch (err) {
      console.warn('HabitsAPI.update failed, using local update:', err);
    }

    if (!updatedHabit) {
      throw new Error('Habit was not updated. Please check that the backend is running and try again.');
    }

    _habits = _habits.map(x => String(x.id) === String(id) ? updatedHabit : x);
    toast(`✏️ "${updatedHabit.name}" updated!`, 'success');
    return updatedHabit;
  }

  /* ── DELETE ───────────────────────────────────────────────── */
  async function remove(id) {
    const habit = getById(id);
    try {
      await HabitsAPI.remove(id);
    } catch (err) {
      console.warn('HabitsAPI.remove failed, deleting locally:', err);
    }

    _habits = _habits.filter(h => String(h.id) !== String(id));
    _completedToday.delete(Number(id));
    toast(`🗑️ "${habit?.name || 'Habit'}" deleted.`, 'info');
    return true;
  }

  /* ── TOGGLE COMPLETE ──────────────────────────────────────── */
  async function toggleComplete(id) {
    const numId  = Number(id);
    const td     = todayStr();
    const isDone = _completedToday.has(numId);
    const habit  = getById(id);

    // Optimistic update
    isDone ? _completedToday.delete(numId) : _completedToday.add(numId);
    _habits = applyCompletions(_habits);

    try {
      const result = isDone
        ? await TrackingAPI.markIncomplete(id, td)
        : await TrackingAPI.markComplete(id, td);

      if (result.ok && result.data) {
        const resData = result.data.data || result.data;
        _habits = _habits.map(h => {
          if (String(h.id) !== String(id)) return h;
          return {
            ...h,
            streak        : resData.current_streak    ?? h.streak,
            longestStreak : resData.longest_streak    ?? h.longestStreak,
            totalCompleted: resData.total_completions ?? h.totalCompleted,
            missedDays    : resData.missed_days       ?? h.missedDays,
            completedDates: !isDone ? [td] : [],
          };
        });
      }
    } catch (e) {
      console.warn('Toggle complete API failed, using optimistic state:', e);
    }

    if (!isDone) toast(`🎉 "${habit?.name || 'Habit'}" completed!`, 'success');
    else         toast(`↩️ "${habit?.name || 'Habit'}" unmarked.`, 'info');
    return getById(id);
  }

  /* ── REFRESH STREAK ───────────────────────────────────────── */
  async function refreshStreak(id) {
    try {
      const res = await TrackingAPI.getStreak(id);
      const data = res.data || res;
      if (!data) return;
      _habits = _habits.map(h => String(h.id) !== String(id) ? h : {
        ...h,
        streak        : data.current_streak    ?? h.streak,
        longestStreak : data.longest_streak    ?? h.longestStreak,
        totalCompleted: data.total_completions ?? h.totalCompleted,
        missedDays    : data.missed_days       ?? h.missedDays,
      });
    } catch (e) {
      console.warn('Refresh streak failed:', e);
    }
  }

  return { load, getAll, getById, create, update, remove, toggleComplete, refreshStreak };
})();

window.HabitController = HabitController;
