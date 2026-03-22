/* ═══════════════════════════════════════════════
   HemoSync — Shared API Client
   Include this BEFORE any dashboard-specific JS
   ═══════════════════════════════════════════════ */

// Change to your production URL when deploying
const API = 'https://hemosync-backend-production.up.railway.app/api';

// ── TOKEN STORAGE ──────────────────────────────────────────
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
  setUser: (u) => localStorage.setItem('hs_user', JSON.stringify(u)),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('hs_user')); } catch { return null; }
  },
};

// ── HTTP WRAPPER ───────────────────────────────────────────
async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = Tokens.getAccess();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refresh = Tokens.getRefresh();
    if (refresh) {
      const rRes = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (rRes.ok) {
        const rJson = await rRes.json();
        Tokens.set(rJson.data.accessToken, rJson.data.refreshToken);
        headers['Authorization'] = `Bearer ${rJson.data.accessToken}`;
        res = await fetch(`${API}${path}`, { ...options, headers });
      } else {
        Tokens.clear();
        window.location.href = 'index.html';
        return null;
      }
    } else {
      Tokens.clear();
      window.location.href = 'index.html';
      return null;
    }
  }

  return res;
}

// ── GUARD: redirect to login if no valid session ───────────
function requireAuth() {
  if (!Tokens.getAccess() || !Tokens.getUser()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ── LOGOUT ─────────────────────────────────────────────────
async function apiLogout() {
  try {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: Tokens.getRefresh() }),
    });
  } catch { /* ignore */ }
  Tokens.clear();
  window.location.href = 'index.html';
}

// ── SHARED TOAST ───────────────────────────────────────────
function showToast(icon, title, msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
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
