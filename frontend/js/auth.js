'use strict';
const API_BASE = window.HABITFLOW_API_BASE || (
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? `http://${window.location.hostname}:5000/api`
    : `https://habit-tracker-r9a5.onrender.com/api`
);

/* ── Token helpers ── */
const HFAuth = {
  setToken : t => localStorage.setItem('hf_token', t),
  getToken : ()  => localStorage.getItem('hf_token'),
  removeToken: () => localStorage.removeItem('hf_token'),
  setUser  : u => localStorage.setItem('hf_user', JSON.stringify(u)),
  getUser  : ()  => { try { return JSON.parse(localStorage.getItem('hf_user')); } catch { return null; } },
  removeUser: () => localStorage.removeItem('hf_user'),
  isLoggedIn: () => !!localStorage.getItem('hf_token'),
  logout : () => { HFAuth.removeToken(); HFAuth.removeUser(); },
};

/* ── Route guards ── */
function guardPublicPage()  { if (HFAuth.isLoggedIn())  window.location.replace('index.html'); }
function guardPrivatePage() { if (!HFAuth.isLoggedIn()) window.location.replace('login.html'); }

/* ── Toast ── */
const Toast = (() => {
  const ICONS = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
  function show(msg, type='success', duration=3500) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid ${ICONS[type]||ICONS.success}"></i><span>${esc(msg)}</span>`;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => { t.classList.remove('visible'); t.classList.add('hiding'); setTimeout(() => t.remove(), 300); }, duration);
  }
  return { show };
})();

/* ── Helpers ── */
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function showAlert(id, msg, type='error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `auth-alert ${type} visible`;
  el.innerHTML = `<i class="fa-solid ${type==='error'?'fa-circle-xmark':type==='success'?'fa-circle-check':'fa-circle-info'}"></i><span>${esc(msg)}</span>`;
}
function hideAlert(id) { const el=document.getElementById(id); if(el) el.className='auth-alert'; }
function setLoading(btn, on) { if(!btn) return; btn.classList.toggle('loading',on); btn.disabled=on; }
function markInput(el, ok) { if(!el) return; el.classList.toggle('error',!ok); el.classList.toggle('success',ok); }
function setFieldMsg(id, text, type='error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text; el.className = text ? `field-msg ${type} visible` : 'field-msg';
}

function validateField(name, value) {
  if (name === 'username') {
    if (!value) return 'Username is required.';
    if (value.length < 3) return 'At least 3 characters.';
    if (value.length > 30) return 'Max 30 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Letters, numbers and underscores only.';
  }
  if (name === 'email') {
    if (!value) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email.';
  }
  if (name === 'password') {
    if (!value) return 'Password is required.';
    if (value.length < 6) return 'Minimum 6 characters.';
  }
  return '';
}

/* ── Password strength ── */
function getStrength(pw) {
  if (!pw || pw.length < 4) return { level:'', label:'' };
  let s=0;
  if (pw.length>=8) s++; if (pw.length>=12) s++;
  if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^a-zA-Z0-9]/.test(pw)) s++;
  if (s<=1) return { level:'weak',   label:'Weak' };
  if (s===2) return { level:'fair',  label:'Fair' };
  if (s===3) return { level:'good',  label:'Good' };
  return       { level:'strong', label:'Strong 🔒' };
}
function updateStrengthBar(pw) {
  const fill  = document.getElementById('pwStrengthFill');
  const label = document.getElementById('pwStrengthLabel');
  if (!fill || !label) return;
  const { level, label: text } = getStrength(pw);
  fill.className = `pw-strength-fill ${level}`;
  label.className = `pw-strength-label ${level}`;
  label.textContent = text;
}

/* ── API call ── */
async function apiCall(endpoint, body) {
  try {
    const res  = await fetch(`${API_BASE}${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { success: false, message: '❌ Cannot connect to server. Make sure the backend is running and accessible.' } };
  }
}

/* ── Eye toggle ── */
function wireEye(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inputId);
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    const icon = btn.querySelector('i');
    if (icon) icon.className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });
}

/* ══ REGISTER PAGE ══════════════════════════════════════════════ */
function initRegisterPage() {
  guardPublicPage();
  const pwEl = document.getElementById('reg-password');
  if (pwEl) pwEl.addEventListener('input', () => updateStrengthBar(pwEl.value));
  ['reg-username','reg-display-name','reg-email','reg-password','reg-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur',  () => validateRegField(el));
    el.addEventListener('input', () => { if (el.classList.contains('error')) validateRegField(el); });
  });
  wireEye('eye-password','reg-password');
  wireEye('eye-confirm', 'reg-confirm');
  const form = document.getElementById('registerForm');
  if (form) form.addEventListener('submit', handleRegister);
}

function validateRegField(el) {
  const id = el.id, val = el.value.trim(), msgId = id+'-msg';
  if (id === 'reg-username') { const e=validateField('username',val); setFieldMsg(msgId,e,'error'); markInput(el,!e); return !e; }
  if (id === 'reg-display-name') { setFieldMsg(msgId,''); markInput(el,!!val); return true; }
  if (id === 'reg-email') { const e=validateField('email',val); setFieldMsg(msgId,e,'error'); markInput(el,!e); return !e; }
  if (id === 'reg-password') { const e=validateField('password',val); setFieldMsg(msgId,e,'error'); markInput(el,!e); const c=document.getElementById('reg-confirm'); if(c&&c.value) validateRegConfirm(); return !e; }
  if (id === 'reg-confirm') return validateRegConfirm();
  return true;
}
function validateRegConfirm() {
  const pw=document.getElementById('reg-password')?.value||'';
  const c =document.getElementById('reg-confirm')?.value||'';
  const cEl=document.getElementById('reg-confirm');
  if (!c) { setFieldMsg('reg-confirm-msg','Please confirm your password.','error'); markInput(cEl,false); return false; }
  if (pw!==c) { setFieldMsg('reg-confirm-msg','Passwords do not match.','error'); markInput(cEl,false); return false; }
  setFieldMsg('reg-confirm-msg','Passwords match ✓','success'); markInput(cEl,true); return true;
}

async function handleRegister(e) {
  e.preventDefault();
  hideAlert('reg-alert');
  const username    = document.getElementById('reg-username')?.value.trim()||'';
  const displayName = document.getElementById('reg-display-name')?.value.trim()||'';
  const email       = document.getElementById('reg-email')?.value.trim()||'';
  const password    = document.getElementById('reg-password')?.value||'';
  const confirm     = document.getElementById('reg-confirm')?.value||'';
  const terms       = document.getElementById('reg-terms')?.checked;
  const btn         = document.getElementById('reg-btn');

  let valid = true;
  ['reg-username','reg-display-name','reg-email','reg-password','reg-confirm'].forEach(id => {
    const el = document.getElementById(id); if (el && !validateRegField(el)) valid = false;
  });
  if (!validateRegConfirm()) valid = false;
  if (!terms)     { showAlert('reg-alert','Please accept the Terms of Service.','error'); return; }
  if (password !== confirm) { showAlert('reg-alert','Passwords do not match.','error'); return; }
  if (!valid)     { showAlert('reg-alert','Please fix the errors above.','error'); return; }

  setLoading(btn, true);
  const { ok, data } = await apiCall('/auth/register', { username, email, password, display_name: displayName||username });
  setLoading(btn, false);

  if (ok && data.success) {
    HFAuth.setToken(data.token); HFAuth.setUser(data.user);
    showAlert('reg-alert', `🎉 Welcome to HabitFlow, ${data.user.display_name||data.user.username}! Redirecting…`, 'success');
    Toast.show('Account created! Redirecting…', 'success');
    setTimeout(() => window.location.replace('index.html'), 1400);
  } else {
    showAlert('reg-alert', data.message || 'Registration failed. Please try again.', 'error');
    Toast.show(data.message || 'Registration failed.', 'error');
  }
}

/* ══ LOGIN PAGE ═════════════════════════════════════════════════ */
function initLoginPage() {
  guardPublicPage();
  ['login-email','login-password'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur',  () => validateLoginField(el));
    el.addEventListener('input', () => { if (el.classList.contains('error')) validateLoginField(el); });
  });
  wireEye('eye-login-pw','login-password');
  const form = document.getElementById('loginForm');
  if (form) form.addEventListener('submit', handleLogin);
  autoFillLogin();
}

function validateLoginField(el) {
  const id=el.id, val=el.value.trim();
  if (id==='login-email') { const e=validateField('email',val); setFieldMsg('login-email-msg',e,'error'); markInput(el,!e); return !e; }
  if (id==='login-password') { const e=validateField('password',val); setFieldMsg('login-password-msg',e,'error'); markInput(el,!e); return !e; }
  return true;
}

async function handleLogin(e) {
  e.preventDefault();
  hideAlert('login-alert');
  const email    = document.getElementById('login-email')?.value.trim()||'';
  const password = document.getElementById('login-password')?.value||'';
  const remember = document.getElementById('login-remember')?.checked;
  const btn      = document.getElementById('login-btn');
  let valid = true;
  ['login-email','login-password'].forEach(id => { const el=document.getElementById(id); if(el&&!validateLoginField(el)) valid=false; });
  if (!valid) { showAlert('login-alert','Please fill in all fields correctly.','error'); return; }
  setLoading(btn, true);
  const { ok, data } = await apiCall('/auth/login', { email, password });
  setLoading(btn, false);
  if (ok && data.success) {
    HFAuth.setToken(data.token); HFAuth.setUser(data.user);
    if (remember) localStorage.setItem('hf_remember_email', email);
    else          localStorage.removeItem('hf_remember_email');
    Toast.show(`Welcome back, ${data.user.display_name||data.user.username}! 👋`, 'success');
    showAlert('login-alert','✅ Login successful! Redirecting…','success');
    setTimeout(() => window.location.replace('index.html'), 1000);
  } else {
    showAlert('login-alert', data.message || 'Login failed. Please check your credentials.', 'error');
    Toast.show(data.message || 'Login failed.', 'error');
    const card = document.querySelector('.auth-card');
    if (card) { card.style.animation='none'; card.offsetHeight; card.style.animation='shakeCard .4s ease'; }
  }
}

/* ── Logout ── */
function handleLogout() {
  const token = HFAuth.getToken();
  if (token) fetch(`${API_BASE}/auth/logout`, { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' } }).catch(()=>{});
  HFAuth.logout();
  Toast.show('Logged out. See you soon! 👋','info');
  setTimeout(() => window.location.replace('login.html'), 600);
}

/* ── Inject user into dashboard ── */
function injectUserIntoDashboard() {
  const user = HFAuth.getUser();
  if (!user) return;
  const name = user.display_name || user.username || 'Champ';
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) { const gs=heroTitle.querySelector('.gradient-text'); if(gs) gs.textContent=name; }
  const avatarImg = document.querySelector('.nav-avatar img');
  const avatarEmoji = user.avatar_url || user.avatar || user.settings?.avatar || '';
  if (avatarImg && avatarEmoji) {
    avatarImg.style.display = 'none';
    let emoji = document.querySelector('.nav-avatar .nav-avatar-emoji');
    if (!emoji) {
      emoji = document.createElement('span');
      emoji.className = 'nav-avatar-emoji';
      avatarImg.parentNode.insertBefore(emoji, avatarImg);
    }
    emoji.textContent = avatarEmoji;
    emoji.setAttribute('aria-label', `${name}'s profile avatar`);
  } else if (avatarImg) {
    avatarImg.src=`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username||name)}`;
    avatarImg.alt=name;
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

function autoFillLogin() {
  const saved=localStorage.getItem('hf_remember_email');
  const emailEl=document.getElementById('login-email');
  const remEl=document.getElementById('login-remember');
  if (saved && emailEl) { emailEl.value=saved; if(remEl) remEl.checked=true; }
}

/* Shake animation */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `@keyframes shakeCard{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`;
document.head.appendChild(shakeStyle);

window.HFAuth=HFAuth; window.handleLogout=handleLogout; window.initRegisterPage=initRegisterPage; window.initLoginPage=initLoginPage; window.guardPrivatePage=guardPrivatePage; window.guardPublicPage=guardPublicPage; window.injectUserIntoDashboard=injectUserIntoDashboard; window.autoFillLogin=autoFillLogin;
