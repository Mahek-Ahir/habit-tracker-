/* ═══════════════════════════════════════════════════════════════
   HABITFLOW — HabitView  (Phase 3)
   Habit cards with status badges, missed days, progress bars,
   streak display, filter/search, CRUD modals
═══════════════════════════════════════════════════════════════ */
'use strict';

const HabitView = (() => {

  let _currentEditId   = null;
  let _currentDeleteId = null;
  let _selectedIcon    = '💧';
  let _selectedColor   = '#7c3aed';
  let _selectedFreq    = 'daily';
  let _activeFilter    = 'all';
  let _searchQuery     = '';

  /* ══════════════════════════════════
     RENDER HABIT CARDS
  ══════════════════════════════════ */
  function renderHabits(habits, onToggle, onEdit, onDelete) {
    const grid = document.getElementById('habitsGrid');
    if (!grid) return;

    const todayStr = today();
    const filtered = applyFilterSearch(habits, todayStr);
    updateFilterCounts(habits, todayStr);

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌱</div>
          <h3>${habits.length === 0 ? 'No habits yet' : 'No habits match your filter'}</h3>
          <p>${habits.length === 0
            ? 'Click "Add Habit" to build your first habit.'
            : 'Try a different filter or clear your search.'}</p>
          <button class="btn btn-primary sm mt-2" onclick="window.openHabitModal()"><i class="fa-solid fa-plus"></i> Add Habit</button>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(h => buildHabitCard(h, todayStr)).join('');

    // Animate progress bars after paint
    requestAnimationFrame(() => {
      grid.querySelectorAll('.hc-progress-fill[data-width]').forEach(bar => {
        setTimeout(() => { bar.style.width = bar.dataset.width; }, 60);
      });
    });

    // Events
    grid.querySelectorAll('.hc-complete-btn').forEach(btn =>
      btn.addEventListener('click', () => onToggle(btn.dataset.id)));
    grid.querySelectorAll('.hc-btn.edit').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); onEdit(btn.dataset.id); }));
    grid.querySelectorAll('.hc-btn.delete').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); onDelete(btn.dataset.id); }));
  }

  /* ── Build one card ── */
  function buildHabitCard(h, todayStr) {
    const status  = getHabitStatus(h);
    const done    = status === 'completed';
    const last7   = getLastNDays(7);
    const weekDone = last7.filter(d => h.completedDates && h.completedDates.includes(d)).length;
    const weekPct  = Math.round((weekDone / 7) * 100);
    const missed   = countMissedDays(h);

    // 7-day mini heatmap dots
    const dots = last7.map(d => {
      const cls = (h.completedDates && h.completedDates.includes(d)) ? 'dot done' : (d < todayStr ? 'dot missed' : 'dot future');
      return `<span class="${cls}" title="${d}"></span>`;
    }).join('');

    // Streak badge colour
    const streakColour = h.streak >= 30 ? '#f59e0b' : h.streak >= 7 ? '#f97316' : h.streak >= 3 ? '#ef4444' : 'var(--text-muted)';

    return `
      <div class="habit-card glass-card ${status}" data-id="${escapeHtml(h.id)}" data-category="${escapeHtml(h.category)}">
        <div class="hc-top">
          <div class="hc-icon-wrap" style="background:${h.color}22;">
            <span class="hc-icon">${escapeHtml(h.icon)}</span>
          </div>
          <div class="hc-info">
            <h3 class="hc-title">${escapeHtml(h.name)}</h3>
            <div class="hc-badges">
              <span class="hc-badge cat-badge ${escapeHtml(h.category)}">${capitalize(h.category)}</span>
              <span class="hc-badge status-badge ${status}">${statusLabel(status)}</span>
            </div>
          </div>
          <div class="hc-actions">
            <button class="hc-btn edit"   data-id="${escapeHtml(h.id)}" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="hc-btn delete" data-id="${escapeHtml(h.id)}" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>

        ${h.description ? `<p class="hc-desc">${escapeHtml(h.description)}</p>` : ''}

        <!-- Weekly dot track -->
        <div class="hc-dots" title="Last 7 days">${dots}</div>

        <!-- Progress bar -->
        <div class="hc-progress-wrap">
          <div class="hc-progress-label">
            <span>Weekly progress</span>
            <span>${weekDone}/7 days</span>
          </div>
          <div class="hc-progress-bar">
            <div class="hc-progress-fill" data-width="${weekPct}%" style="width:0%;background:${h.color};"></div>
          </div>
        </div>

        <!-- Footer row -->
        <div class="hc-footer">
          <div class="hc-stat-pill" style="color:${streakColour};">
            <i class="fa-solid fa-fire"></i>
            <strong>${h.streak}</strong> streak
          </div>
          <div class="hc-stat-pill">
            <i class="fa-solid fa-trophy" style="color:#f59e0b;"></i>
            <strong>${h.longestStreak || 0}</strong> best
          </div>
          ${missed > 0
            ? `<div class="hc-stat-pill missed-pill"><i class="fa-solid fa-triangle-exclamation"></i> ${missed} missed</div>`
            : ''}
          <button class="hc-complete-btn ${done ? 'done' : ''}" data-id="${escapeHtml(h.id)}">
            ${done
              ? '<i class="fa-solid fa-check"></i> Done'
              : '<i class="fa-regular fa-circle"></i> Mark Done'}
          </button>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════
     FILTER + SEARCH
  ══════════════════════════════════ */
  function applyFilterSearch(habits, todayStr) {
    return habits.filter(h => {
      let matchFilter;
      const completed = h.completedDates || [];
      if      (_activeFilter === 'all')       matchFilter = true;
      else if (_activeFilter === 'completed') matchFilter = completed.includes(todayStr);
      else if (_activeFilter === 'pending')   matchFilter = !completed.includes(todayStr);
      else if (_activeFilter === 'missed') {
        matchFilter = !completed.includes(todayStr) && new Date(h.startDate) < new Date(todayStr);
      }
      else matchFilter = h.category === _activeFilter;

      const q = _searchQuery.toLowerCase();
      const matchSearch = !q || h.name.toLowerCase().includes(q) || h.category.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }

  function updateFilterCounts(habits, todayStr) {
    const safeHabits = Array.isArray(habits) ? habits : [];
    const counts = {
      all:          safeHabits.length,
      completed:    safeHabits.filter(h => h.completedDates && h.completedDates.includes(todayStr)).length,
      pending:      safeHabits.filter(h => !h.completedDates || !h.completedDates.includes(todayStr)).length,
      missed:       safeHabits.filter(h => (!h.completedDates || !h.completedDates.includes(todayStr)) && new Date(h.startDate) < new Date(todayStr)).length,
      health:       safeHabits.filter(h => h.category === 'health').length,
      fitness:      safeHabits.filter(h => h.category === 'fitness').length,
      study:        safeHabits.filter(h => h.category === 'study').length,
      personal:     safeHabits.filter(h => h.category === 'personal').length,
      productivity: safeHabits.filter(h => h.category === 'productivity').length,
    };
    document.querySelectorAll('.filter-tab').forEach(tab => {
      const el = tab.querySelector('.tab-count');
      if (el) el.textContent = counts[tab.dataset.filter] ?? 0;
    });
  }

  function initFilters(onFilterChange) {
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        _activeFilter = tab.dataset.filter;
        onFilterChange();
      });
    });
    const si = document.querySelector('.search-input');
    if (si) si.addEventListener('input', debounce(() => { _searchQuery = si.value.trim(); onFilterChange(); }, 200));
  }

  /* ══════════════════════════════════
     MODAL — ADD / EDIT
  ══════════════════════════════════ */
  function openModal(habit = null) {
    _currentEditId = habit ? habit.id : null;
    const isEdit = !!habit;
    const titleEl = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveHabit');
    if (titleEl) titleEl.innerHTML = isEdit
      ? '<i class="fa-solid fa-pen-to-square"></i> Edit Habit'
      : '<i class="fa-solid fa-plus-circle"></i> New Habit';
    if (saveBtn) saveBtn.innerHTML = isEdit
      ? '<i class="fa-solid fa-floppy-disk"></i> Save Changes'
      : '<i class="fa-solid fa-plus"></i> Add Habit';
    isEdit ? prefillForm(habit) : resetForm();
    document.getElementById('habitModal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('habitName')?.focus(), 50);
  }

  function closeModal() {
    document.getElementById('habitModal')?.classList.remove('open');
    document.body.style.overflow = '';
    _currentEditId = null;
  }

  function prefillForm(h) {
    setValue('habitName', h.name);
    setValue('habitDesc', h.description);
    setValue('habitCategory', h.category || 'health');
    setValue('habitStart', h.startDate || today());
    _selectedIcon = h.icon || '💧';
    _selectedColor = h.color || '#7c3aed';
    _selectedFreq = h.frequency || 'daily';
    setFreqBtn(_selectedFreq);
    setActiveIcon(_selectedIcon);
    setActiveColor(_selectedColor);
    clearErrors();
  }

  function resetForm() {
    setValue('habitName','');
    setValue('habitDesc','');
    setValue('habitCategory','health'); // Default to Health
    setValue('habitStart', today());
    _selectedIcon = '💧';
    _selectedColor = '#7c3aed';
    _selectedFreq = 'daily';
    setFreqBtn('daily');
    document.querySelectorAll('.icon-btn').forEach((b,i) => b.classList.toggle('active', i===0));
    document.querySelectorAll('.cp-swatch').forEach((b,i) => b.classList.toggle('active', i===0));
    clearErrors();
    const hint = document.getElementById('habitNameHint');
    if (hint) hint.textContent = '0/60 characters';
  }

  function setValue(id, val) { const el=document.getElementById(id); if(el) el.value=val??''; }
  function setFreqBtn(freq)  { document.querySelectorAll('.freq-btn').forEach(b=>b.classList.toggle('active',b.dataset.freq===freq)); }
  function setActiveIcon(ic) { document.querySelectorAll('.icon-btn').forEach(b=>b.classList.toggle('active',b.textContent.trim()===ic)); }
  function setActiveColor(c) {
    const norm = c ? c.toLowerCase().trim() : '';
    document.querySelectorAll('.cp-swatch').forEach(b => {
      const dc = (b.dataset.color || '').toLowerCase().trim();
      const bg = _rgbToHex(b.style.background || '').toLowerCase().trim();
      b.classList.toggle('active', dc === norm || bg === norm);
    });
  }

  function getFormData() {
    const cat = document.getElementById('habitCategory')?.value || 'health';
    const categoryMap = { health: 1, study: 2, fitness: 3, personal: 4, productivity: 5 };
    const dateVal = document.getElementById('habitStart')?.value || today();
    return {
      name:        document.getElementById('habitName')?.value.trim() || '',
      description: document.getElementById('habitDesc')?.value.trim() || '',
      category:    cat,
      category_id: categoryMap[cat] || 1,
      startDate:   dateVal,
      start_date:  dateVal,
      icon:        _selectedIcon,
      icon_emoji:  _selectedIcon,
      color:       _selectedColor,
      color_hex:   _selectedColor,
      frequency:   _selectedFreq,
    };
  }

  function validateForm(data, habits) {
    clearErrors();
    let ok = true;
    if (!data.name) { showFieldError('habitName', 'Habit name is required'); ok = false; }
    if (!data.category) { showFieldError('habitCategory', 'Please select a category'); ok = false; }
    const habitsList = Array.isArray(habits) ? habits : [];
    const dup = habitsList.find(h => h && h.name && h.name.toLowerCase() === data.name.toLowerCase() && Number(h.id) !== Number(_currentEditId));
    if (dup) { showFieldError('habitName', `A habit named "${data.name}" already exists`); ok = false; }
    return ok;
  }

  function showFieldError(id, msg) {
    const field = document.getElementById(id);
    if (!field) return;
    field.classList.add('error','shake');
    field.addEventListener('animationend', ()=>field.classList.remove('shake'), {once:true});
    let e = field.parentElement.querySelector('.form-error');
    if (!e) { e=document.createElement('span'); e.className='form-error'; field.parentElement.appendChild(e); }
    e.textContent = msg;
  }

  function clearErrors() {
    document.querySelectorAll('#habitModal .form-input.error').forEach(e=>e.classList.remove('error'));
    document.querySelectorAll('#habitModal .form-error').forEach(e=>e.remove());
  }

  /* ── Delete confirm ── */
  function openDeleteModal(id) {
    _currentDeleteId = id;
    document.getElementById('deleteModal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDeleteModal() {
    document.getElementById('deleteModal')?.classList.remove('open');
    document.body.style.overflow = '';
    _currentDeleteId = null;
  }

  function getCurrentEditId() {
    return _currentEditId;
  }

  /* ── Wire all modal events ── */
  function initModal(onSave, onDelete) {
    document.querySelectorAll('#openAddHabit, .open-add-habit-btn, [data-action="open-add-habit"]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    });

    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('cancelHabit')?.addEventListener('click', closeModal);
    
    const saveBtn = document.getElementById('saveHabit');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        onSave(_currentEditId);
      });
    }

    document.querySelectorAll('#habitModal input, #habitModal select').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSave(_currentEditId);
        }
      });
    });

    document.getElementById('closeDeleteModal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDelete')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete')?.addEventListener('click', () => {
      if (_currentDeleteId) onDelete(_currentDeleteId);
      closeDeleteModal();
    });
    document.querySelectorAll('.modal-overlay').forEach(o =>
      o.addEventListener('click', e => { if(e.target===o){closeModal();closeDeleteModal();} }));
    document.addEventListener('keydown', e => { if(e.key==='Escape'){closeModal();closeDeleteModal();} });

    document.querySelectorAll('.freq-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('.freq-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active'); _selectedFreq = btn.dataset.freq;
      }));
    document.querySelectorAll('.icon-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('.icon-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active'); _selectedIcon = btn.textContent.trim();
      }));
    document.querySelectorAll('.cp-swatch').forEach(sw =>
      sw.addEventListener('click', () => {
        document.querySelectorAll('.cp-swatch').forEach(s=>s.classList.remove('active'));
        sw.classList.add('active');
        // Use data-color attribute if available, otherwise extract from style.background
        _selectedColor = sw.dataset.color || sw.getAttribute('data-color') || _rgbToHex(sw.style.background) || '#7c3aed';
      }));
    document.getElementById('customColor')?.addEventListener('input', e => {
      document.querySelectorAll('.cp-swatch').forEach(s=>s.classList.remove('active'));
      _selectedColor = e.target.value;
    });
    const habitName = document.getElementById('habitName');
    const hint      = document.getElementById('habitNameHint');
    habitName?.addEventListener('input', () => {
      const len = habitName.value.length;
      if (hint) { hint.textContent=`${len}/60 characters`; hint.style.color=len>50?'var(--warning)':''; }
    });
  }

  /* ── Global Event Delegation ── */
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('#openAddHabit, .open-add-habit-btn, [data-action="open-add-habit"]');
    if (addBtn) {
      e.preventDefault();
      openModal();
    }
  });

  /* ── helpers ── */
  function statusLabel(s) {
    if (s==='completed') return '✓ Completed';
    if (s==='upcoming')  return '📅 Upcoming';
    return '○ Pending';
  }

  // Convert rgb(r,g,b) to #rrggbb for backend validation
  function _rgbToHex(rgb) {
    if (!rgb) return '#7c3aed';
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#7c3aed';
    return '#' + [match[1], match[2], match[3]].map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
  }

  window.openHabitModal = openModal;

  return {
    renderHabits, initFilters, initModal,
    openModal, closeModal, openDeleteModal,
    getFormData, validateForm, resetForm, getCurrentEditId,
  };
})();
