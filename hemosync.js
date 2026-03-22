/* ═══════════════════════════════════════════════
   HemoSync — Landing Page Logic
   Wired to the Node/PostgreSQL backend API
   ═══════════════════════════════════════════════ */

// ── API BASE URL ───────────────────────────────────────────
// Change this to your deployed backend URL in production
const API = 'https://hemosync-backend-production.up.railway.app';

// ── TOKEN HELPERS ──────────────────────────────────────────
const Tokens = {
  getAccess:  () => localStorage.getItem('hs_access'),
  getRefresh: () => localStorage.getItem('hs_refresh'),
  set: (access, refresh) => {
    localStorage.setItem('hs_access',  access);
    localStorage.setItem('hs_refresh', refresh);
  },
  clear: () => {
    localStorage.removeItem('hs_access');
    localStorage.removeItem('hs_refresh');
    localStorage.removeItem('hs_user');
  },
  setUser: (user) => localStorage.setItem('hs_user', JSON.stringify(user)),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('hs_user')); } catch { return null; }
  },
};

// ── API REQUEST WRAPPER ────────────────────────────────────
async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const token = Tokens.getAccess();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && Tokens.getRefresh()) {
    const refreshRes = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: Tokens.getRefresh() }),
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      Tokens.set(refreshData.data.accessToken, refreshData.data.refreshToken);
      headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
      res = await fetch(`${API}${path}`, { ...options, headers });
    } else {
      Tokens.clear();
      updateNavForUser(null);
      updateOrderSection();
      showToast('🔐', 'Session Expired', 'Please sign in again.');
      return null;
    }
  }

  return res;
}

// ── BLOOD GRID ─────────────────────────────────────────────
const statusLabel = { ok: 'Available', low: 'Low Stock', critical: 'Critical', out: 'Out of Stock' };
let bloodData = [];

async function renderBloodGrid() {
  const grid = document.getElementById('bloodGrid');
  if (!grid) return;

  try {
    const res  = await fetch(`${API}/inventory`);
    const json = await res.json();
    bloodData  = json.data || [];
  } catch {
    // Fallback to static data if API unavailable
    bloodData = [
      { blood_type:'A+', units_available:84, max_capacity:120, status:'ok' },
      { blood_type:'A-', units_available:12, max_capacity:80,  status:'low' },
      { blood_type:'B+', units_available:67, max_capacity:100, status:'ok' },
      { blood_type:'B-', units_available:5,  max_capacity:60,  status:'critical' },
      { blood_type:'AB+',units_available:31, max_capacity:60,  status:'ok' },
      { blood_type:'AB-',units_available:8,  max_capacity:40,  status:'low' },
      { blood_type:'O+', units_available:102,max_capacity:150, status:'ok' },
      { blood_type:'O-', units_available:3,  max_capacity:60,  status:'critical' },
    ];
  }

  grid.innerHTML = bloodData.map(b => `
    <div class="col-6 col-md-3">
      <div class="blood-card status-${b.status} reveal" onclick="quickFill('${b.blood_type}')">
        <div class="blood-type-label">${b.blood_type}</div>
        <div class="blood-units"><strong>${b.units_available}</strong> units available</div>
        <div class="status-chip"><span class="chip-dot"></span>${statusLabel[b.status] || b.status}</div>
        <button class="request-btn" onclick="event.stopPropagation(); quickFill('${b.blood_type}')">
          Request Units →
        </button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function quickFill(type) {
  if (!currentUser) {
    document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('🔐', 'Login Required', 'Please sign in to place a blood request.');
    setTimeout(() => openModal('login'), 800);
    return;
  }
  const el = document.getElementById('reqBloodType');
  if (el) { el.value = type; updateSummary(); }
  document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── ORDER FORM ─────────────────────────────────────────────
let currentUrgency = 'Normal';
let myRequests     = [];
let currentUser    = Tokens.getUser();

function setUrgency(btn, level) {
  document.querySelectorAll('.urgency-btn').forEach(b => b.className = 'urgency-btn');
  const map = { Normal: 'active-normal', Urgent: 'active-urgent', Critical: 'active-critical' };
  btn.classList.add(map[level]);
  currentUrgency = level;
  updateSummary();
}

function updateSummary() {
  const type  = document.getElementById('reqBloodType')?.value;
  const units = document.getElementById('reqUnits')?.value;
  const comp  = document.getElementById('reqComponent')?.value;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('sumBlood',     type   || '—');
  set('sumUnits',     units  || '0');
  set('sumComponent', comp   || 'Whole Blood');
  set('sumUrgency',   currentUrgency);
  if (currentUser) set('sumUser', currentUser.name);

  if (type) {
    const entry = bloodData.find(b => b.blood_type === type);
    const avail = document.getElementById('sumAvail');
    if (avail && entry) {
      avail.textContent = `${entry.units_available} units · ${statusLabel[entry.status]}`;
      avail.style.color = entry.status === 'ok' ? 'var(--hs-green)'
        : entry.status === 'low' ? 'var(--hs-amber)' : 'var(--hs-red)';
    }
  }
}

async function submitOrder() {
  if (!currentUser) { openModal('login'); return; }

  const phone    = document.getElementById('reqPhone')?.value.trim();
  const blood    = document.getElementById('reqBloodType')?.value;
  const units    = document.getElementById('reqUnits')?.value;
  const patient  = document.getElementById('reqPatient')?.value.trim();
  const location = document.getElementById('reqLocation')?.value.trim();

  if (!phone || !blood || !units) {
    showToast('⚠️', 'Missing Fields', 'Please fill in contact number, blood type, and units.');
    return;
  }

  const btn = document.querySelector('.submit-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Submitting...'; }

  try {
    const res = await apiRequest('/requests', {
      method: 'POST',
      body: JSON.stringify({
        blood_type:        blood,
        units_requested:   parseInt(units),
        component:         document.getElementById('reqComponent')?.value,
        urgency:           currentUrgency,
        patient_name:      patient  || undefined,
        delivery_location: location || undefined,
        contact_phone:     phone,
        notes:             document.getElementById('reqNotes')?.value || undefined,
      }),
    });

    if (!res) return;
    const json = await res.json();

    if (!json.success) {
      showToast('❌', 'Error', json.message || 'Failed to submit request');
      return;
    }

    myRequests.unshift(json.data);
    renderMyRequests();
    showToast('✅', 'Request Submitted!', `ID: ${json.data.request_number} — response within 30 min.`);

    ['reqPhone','reqBloodType','reqUnits','reqPatient','reqLocation','reqNotes'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    updateSummary();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-send-fill"></i> Submit Blood Request'; }
  }
}

function renderMyRequests() {
  const list = document.getElementById('myRequestsList');
  if (!list) return;
  const count = document.getElementById('reqCount');
  if (count) count.textContent = myRequests.length;

  if (myRequests.length === 0) {
    list.innerHTML = `
      <div style="padding:28px;text-align:center;color:var(--hs-text-3);font-size:0.8rem;">
        <i class="bi bi-inbox" style="font-size:1.4rem;display:block;margin-bottom:8px;opacity:0.4"></i>
        No requests yet.
      </div>`;
    return;
  }

  const statusMap = {
    pending:   { label:'Pending',  cls:'status-pending',    icon:'⏳', bg:'var(--hs-amber-bg)' },
    approved:  { label:'Approved', cls:'status-dispatched', icon:'✅', bg:'var(--hs-blue-bg)'  },
    enroute:   { label:'En Route', cls:'status-dispatched', icon:'🚚', bg:'var(--hs-blue-bg)'  },
    done:      { label:'Done',     cls:'status-fulfilled',  icon:'✅', bg:'var(--hs-green-bg)' },
    cancelled: { label:'Cancelled',cls:'status-pending',    icon:'❌', bg:'var(--hs-red-subtle)'},
  };

  list.innerHTML = myRequests.map(r => {
    const s = statusMap[r.status] || statusMap.pending;
    return `
      <div class="request-history-item">
        <div class="rh-icon" style="background:${s.bg}">${s.icon}</div>
        <div style="flex:1">
          <div class="rh-blood">${r.blood_type}
            <span style="font-family:'DM Sans',sans-serif;font-size:0.72rem;font-weight:400;color:var(--hs-text-3)">
              · ${r.units_requested}u · ${(r.component || 'Whole Blood').split(' ')[0]}
            </span>
          </div>
          <div class="rh-meta">${r.request_number} · ${r.urgency}</div>
        </div>
        <span class="rh-status ${s.cls}">${s.label}</span>
      </div>`;
  }).join('');
}

// ── AUTH ───────────────────────────────────────────────────
async function handleLogin() {
  const emailInput = document.querySelector('#tab-login input[type="email"]');
  const passInput  = document.querySelector('#tab-login input[type="password"]');
  const email      = emailInput.value.trim();
  const password   = passInput.value;

  if (!email || !password) { showToast('⚠️', 'Missing Fields', 'Please enter your email and password.'); return; }

  const submitBtn = document.querySelector('#tab-login .modal-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in...'; }

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const json = await res.json();

    if (!json.success) {
      showToast('❌', 'Login Failed', json.message || 'Invalid credentials');
      return;
    }

    const { user, accessToken, refreshToken } = json.data;
    Tokens.set(accessToken, refreshToken);
    Tokens.setUser(user);
    currentUser = user;
    bsModal.hide();

    const firstName = user.name.split(' ')[0];

    if (user.role === 'hospital') {
      showToast('🏥', `Welcome, ${firstName}!`, 'Redirecting to Hospital Dashboard...');
      setTimeout(() => {
        window.location.href = `hospital-dashboard.html?name=${encodeURIComponent(user.name)}&email=${user.email}`;
      }, 900);
      return;
    }
    if (user.role === 'donor') {
      showToast('❤️', `Welcome, ${firstName}!`, 'Redirecting to Donor Dashboard...');
      setTimeout(() => {
        window.location.href = `donor-dashboard.html?name=${encodeURIComponent(user.name)}&email=${user.email}&blood=${encodeURIComponent(user.blood_type || 'B+')}`;
      }, 900);
      return;
    }
    if (user.role === 'individual') {
      showToast('👤', `Welcome, ${firstName}!`, 'Redirecting to your dashboard...');
      setTimeout(() => {
        window.location.href = `individual-dashboard.html?name=${encodeURIComponent(user.name)}&email=${user.email}&blood=${encodeURIComponent(user.blood_type || 'O+')}`;
      }, 900);
      return;
    }

    updateNavForUser(user);
    updateOrderSection(user);
    emailInput.value = '';
    passInput.value  = '';
  } catch (err) {
    showToast('❌', 'Network Error', 'Could not reach the server. Please try again.');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign In to HemoSync'; }
  }
}

async function handleRegister() {
  const nameInput  = document.querySelector('#tab-register input[type="text"]');
  const emailInput = document.querySelector('#tab-register input[type="email"]');
  const passInput  = document.querySelector('#tab-register input[type="password"]');
  const roleEl     = document.querySelector('.role-option.selected .role-option-name');

  const name     = nameInput.value.trim();
  const email    = emailInput.value.trim();
  const password = passInput.value;
  const role     = (roleEl?.textContent || 'individual').toLowerCase();

  if (!name || !email || !password) { showToast('⚠️', 'Missing Fields', 'Please fill in all fields.'); return; }
  if (password.length < 8)          { showToast('⚠️', 'Weak Password', 'Password must be at least 8 characters.'); return; }

  const submitBtn = document.querySelector('#tab-register .modal-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account...'; }

  try {
    const res  = await fetch(`${API}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password, role }),
    });
    const json = await res.json();

    if (!json.success) {
      showToast('❌', 'Registration Failed', json.message || 'Could not create account');
      return;
    }

    const { user, accessToken, refreshToken } = json.data;
    Tokens.set(accessToken, refreshToken);
    Tokens.setUser(user);
    currentUser = user;
    bsModal.hide();
    updateNavForUser(user);
    updateOrderSection(user);
    showToast('🎉', 'Account Created!', `Welcome to HemoSync, ${name.split(' ')[0]}!`);
    nameInput.value = ''; emailInput.value = ''; passInput.value = '';
  } catch {
    showToast('❌', 'Network Error', 'Could not reach the server.');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Account'; }
  }
}

async function logout() {
  try {
    await fetch(`${API}/auth/logout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: Tokens.getRefresh() }),
    });
  } catch { /* ignore network errors on logout */ }

  Tokens.clear();
  currentUser = null;
  myRequests  = [];
  closeDropdown();
  updateNavForUser(null);
  updateOrderSection(null);
  showToast('👋', 'Signed Out', 'You have been signed out successfully.');
}

// ── UI STATE ───────────────────────────────────────────────
function updateNavForUser(user) {
  if (user) {
    document.getElementById('navAuthBtns').style.display = 'none';
    document.getElementById('navUserArea').style.display = 'block';
    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('navAvatar').textContent     = initials;
    document.getElementById('navUserName').textContent   = user.name.split(' ')[0];
    document.getElementById('navUserRole').textContent   = user.role;
    document.getElementById('dropdownName').textContent  = user.name;
    document.getElementById('dropdownEmail').textContent = user.email;
  } else {
    document.getElementById('navAuthBtns').style.display = 'flex';
    document.getElementById('navUserArea').style.display = 'none';
  }
}

function updateOrderSection(user) {
  const gate = document.getElementById('orderGate');
  const form = document.getElementById('orderForm');
  if (!gate || !form) return;
  if (user) {
    gate.style.display = 'none';
    form.style.display = 'block';
    const nameEl = document.getElementById('reqName');   if (nameEl)  nameEl.value  = user.name;
    const emailEl = document.getElementById('reqEmail'); if (emailEl) emailEl.value = user.email;
    const greetName = document.getElementById('greetName'); if (greetName) greetName.textContent = user.name.split(' ')[0];
    const greetRole = document.getElementById('greetRole'); if (greetRole) greetRole.textContent = user.role;
    renderMyRequests();
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    gate.style.display = 'block';
    form.style.display = 'none';
  }
}

// ── MODAL ──────────────────────────────────────────────────
let bsModal;
function openModal(tab = 'login') {
  if (!bsModal) bsModal = new bootstrap.Modal(document.getElementById('authModal'));
  bsModal.show();
  if (tab === 'register') document.getElementById('registerTab').click();
  else                    document.getElementById('loginTab').click();
}
function updateModalMeta(tab) {
  document.getElementById('modalTitle').textContent = tab === 'login' ? 'Welcome back' : 'Create account';
  document.getElementById('modalSub').textContent   = tab === 'login' ? 'Sign in to your HemoSync account' : "Join HemoSync — it's free";
}
function selectRole(el) {
  document.querySelectorAll('.role-option').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
}

// ── DROPDOWN ───────────────────────────────────────────────
function toggleDropdown() { document.getElementById('userDropdown').classList.toggle('open'); }
function closeDropdown()  { document.getElementById('userDropdown').classList.remove('open'); }
document.addEventListener('click', e => {
  const area = document.getElementById('navUserArea');
  if (area && !area.contains(e.target)) closeDropdown();
});

// ── TOAST ──────────────────────────────────────────────────
function showToast(icon, title, msg) {
  const container = document.getElementById('toastContainer');
  const id = 'toast-' + Date.now();
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center border-0 mb-2" role="alert"
         style="background:var(--hs-surface);border:1px solid var(--hs-border)!important;border-radius:10px;min-width:290px">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-start gap-3 py-3 px-3">
          <span style="font-size:1rem">${icon}</span>
          <div>
            <div style="font-weight:600;font-size:0.83rem;color:#F4F4F5">${title}</div>
            <div style="font-size:0.75rem;color:var(--hs-text-2);margin-top:1px">${msg}</div>
          </div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>`);
  const el = document.getElementById(id);
  new bootstrap.Toast(el, { delay: 4200 }).show();
  el.addEventListener('hidden.bs.toast', () => el?.remove());
}

// ── SCROLL REVEAL ──────────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  if (nav) nav.style.borderBottomColor = window.scrollY > 40 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)';
});

// ── INIT ───────────────────────────────────────────────────
(async function init() {
  // Restore session if token exists
  if (Tokens.getAccess() && currentUser) {
    updateNavForUser(currentUser);
    updateOrderSection(currentUser);
  } else {
    updateNavForUser(null);
    updateOrderSection(null);
  }
  await renderBloodGrid();
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();
