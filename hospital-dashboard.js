/* ═══════════════════════════════════════════════
   HemoSync — Hospital Dashboard (API-wired)
   Depends on: api-client.js loaded before this
   ═══════════════════════════════════════════════ */

// ── GUARD ──────────────────────────────────────
if (!requireAuth()) { /* api-client.js redirects */ }
const sessionUser = Tokens.getUser();

// ── STATE ──────────────────────────────────────
let allRequests  = [];
let bloodData    = [];
let currentPage  = 'overview';
let currentUrgency = 'Normal';

const statusLabel = { ok:'Available', low:'Low Stock', critical:'Critical', out:'Out of Stock' };
const statusColor = { ok:'var(--hs-green)', low:'var(--hs-amber)', critical:'var(--hs-red)', out:'var(--hs-red)' };
const barColor    = { ok:'var(--hs-green)', low:'var(--hs-amber)', critical:'var(--hs-red)', out:'var(--hs-red)' };

// ── INIT ───────────────────────────────────────
async function init() {
  const user = sessionUser || {};
  const name = user.name || 'Hospital';
  const initials = name.split(' ').filter(w => /[A-Za-z]/.test(w)).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'H';

  setEl('sideHospAvatar', initials);
  setEl('topbarAvatar',   initials);
  setEl('topbarName',     name.split(' ').slice(0, 2).join(' '));
  setEl('profileAvatar',  initials);
  setEl('profileName',    name);
  setEl('profileEmail',   user.email || '');

  await Promise.all([loadInventory(), loadRequests()]);
  loadHospitalProfile();
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── INVENTORY ──────────────────────────────────
async function loadInventory() {
  try {
    const res  = await apiRequest('/inventory');
    if (!res) return;
    const json = await res.json();
    bloodData  = json.data || [];
    renderInventorySnapshot();
    renderInventoryPage();
    renderAlerts();
  } catch (e) { console.error('Inventory load failed', e); }
}

function renderInventorySnapshot() {
  const el = document.getElementById('inventorySnapshot');
  if (!el) return;
  el.innerHTML = bloodData.map(b => {
    const pct = Math.round((b.units_available / b.max_capacity) * 100);
    return `
      <div class="inv-item">
        <div class="inv-type" style="color:${statusColor[b.status]}">${b.blood_type}</div>
        <div class="inv-bar-wrap">
          <div class="inv-bar-track"><div class="inv-bar-fill" style="width:${pct}%;background:${barColor[b.status]};"></div></div>
          <div class="inv-units">${b.units_available} / ${b.max_capacity}</div>
        </div>
        <span class="inv-chip" style="background:${b.status==='ok'?'var(--hs-green-bg)':b.status==='low'?'var(--hs-amber-bg)':'var(--hs-red-subtle)'};color:${statusColor[b.status]};">${statusLabel[b.status]}</span>
      </div>`;
  }).join('');
}

function renderAlerts() {
  const el = document.getElementById('alertsContainer');
  if (!el) return;
  const critical = bloodData.filter(b => b.status === 'critical' || b.status === 'out');
  el.innerHTML = critical.map(b => `
    <div class="alert-banner">
      <span class="alert-banner-icon">⚠️</span>
      <div class="alert-banner-text">
        <strong>${b.blood_type} is critically low</strong> — only ${b.units_available} units remaining.
        <a href="#" onclick="showPage('newrequest');quickSetBlood('${b.blood_type}');return false;" style="color:var(--hs-red);margin-left:6px;font-weight:600;">Request Now →</a>
      </div>
    </div>`).join('');
}

function renderInventoryPage() {
  const critical = bloodData.filter(b => b.status !== 'ok');
  const critEl = document.getElementById('criticalStockCards');
  if (critEl) {
    critEl.innerHTML = critical.map(b => `
      <div class="col-md-6 col-lg-3">
        <div class="stat-card" style="border-color:${b.status==='critical'?'rgba(232,33,42,0.25)':'rgba(217,119,6,0.2)'};">
          <div class="stat-card-label">${b.blood_type} Stock</div>
          <div class="stat-card-value" style="color:${statusColor[b.status]}">${b.units_available}</div>
          <div class="stat-card-delta" style="color:${statusColor[b.status]};"><i class="bi bi-exclamation-triangle-fill"></i> ${statusLabel[b.status]}</div>
          <div class="d-flex gap-2 mt-2">
            <button class="btn-hs-primary" style="flex:1;font-size:0.7rem;padding:5px 8px;" onclick="openInventoryEdit('${b.blood_type}')">
              <i class="bi bi-pencil"></i> Update
            </button>
            <button class="btn-hs-secondary" style="flex:1;font-size:0.7rem;padding:5px 8px;" onclick="showPage('newrequest');quickSetBlood('${b.blood_type}')">
              Request
            </button>
          </div>
        </div>
      </div>`).join('');
  }

  const gridEl = document.getElementById('inventoryFullGrid');
  if (gridEl) {
    gridEl.innerHTML = bloodData.map(b => {
      const pct = Math.round((b.units_available / b.max_capacity) * 100);
      return `
        <div class="col-md-6 col-lg-3">
          <div style="background:var(--hs-bg2);border:1px solid var(--hs-border2);border-radius:9px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
              <span style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:${statusColor[b.status]}">${b.blood_type}</span>
              <span class="inv-chip" style="background:${b.status==='ok'?'var(--hs-green-bg)':b.status==='low'?'var(--hs-amber-bg)':'var(--hs-red-subtle)'};color:${statusColor[b.status]};">${statusLabel[b.status]}</span>
            </div>
            <div style="font-size:1.3rem;font-weight:700;color:var(--hs-text);margin-bottom:2px;">${b.units_available} <span style="font-size:0.72rem;font-weight:400;color:var(--hs-text-3)">/ ${b.max_capacity}</span></div>
            <div style="height:5px;background:var(--hs-bg);border-radius:100px;overflow:hidden;margin-top:7px;">
              <div style="height:100%;width:${pct}%;background:${barColor[b.status]};border-radius:100px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:8px;">
              <span style="font-size:0.62rem;color:var(--hs-text-3);">${pct}% capacity</span>
              <button onclick="openInventoryEdit('${b.blood_type}')"
                style="font-size:0.62rem;color:var(--hs-blue);font-weight:600;background:none;border:none;cursor:pointer;padding:0;">
                <i class="bi bi-pencil"></i> Update
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
  }
}

// ── INVENTORY EDIT ─────────────────────────────
let editingBloodType = null;

function openInventoryEdit(bloodType) {
  editingBloodType = bloodType;
  const entry = bloodData.find(b => b.blood_type === bloodType);
  if (!entry) return;

  setEl('editBloodTypeLabel', bloodType);
  const unitsEl = document.getElementById('editUnitsAvailable');
  const maxEl   = document.getElementById('editMaxCapacity');
  if (unitsEl) unitsEl.value = entry.units_available;
  if (maxEl)   maxEl.value   = entry.max_capacity;

  updateEditPreview(entry.units_available, entry.max_capacity);

  const panel = document.getElementById('inventoryEditPanel');
  if (panel) {
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Live preview as user types
  if (unitsEl) unitsEl.oninput = () => updateEditPreview(unitsEl.value, maxEl?.value);
  if (maxEl)   maxEl.oninput   = () => updateEditPreview(unitsEl?.value, maxEl.value);
}

function updateEditPreview(units, max) {
  const el = document.getElementById('editStatusPreview');
  if (!el || !units || !max) return;
  const u = parseInt(units), m = parseInt(max);
  const pct   = Math.round((u / m) * 100);
  const status = u === 0 ? 'out' : u <= m * 0.15 ? 'critical' : u <= m * 0.30 ? 'low' : 'ok';
  const color  = statusColor[status];
  const label  = statusLabel[status];
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <div style="flex:1;min-width:160px;">
        <div style="height:8px;background:var(--hs-bg2);border-radius:100px;overflow:hidden;">
          <div style="height:100%;width:${Math.min(pct,100)}%;background:${color};border-radius:100px;transition:width 0.3s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span>${u} / ${m} units (${pct}%)</span>
          <span style="font-weight:600;color:${color};">${label}</span>
        </div>
      </div>
    </div>`;
}

function closeInventoryEdit() {
  editingBloodType = null;
  const panel = document.getElementById('inventoryEditPanel');
  if (panel) panel.style.display = 'none';
}

async function saveInventoryUpdate() {
  if (!editingBloodType) return;
  const units = parseInt(document.getElementById('editUnitsAvailable')?.value);
  const max   = parseInt(document.getElementById('editMaxCapacity')?.value);

  if (isNaN(units) || units < 0)  { showToast('⚠️', 'Invalid', 'Units must be 0 or more.');       return; }
  if (isNaN(max)   || max < 1)    { showToast('⚠️', 'Invalid', 'Max capacity must be at least 1.'); return; }
  if (units > max)                 { showToast('⚠️', 'Invalid', 'Units cannot exceed max capacity.'); return; }

  const btn = document.querySelector('#inventoryEditPanel .btn-hs-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    // Encode blood type for URL — A+ needs to become A%2B etc.
    const encoded = encodeURIComponent(editingBloodType);
    const res = await apiRequest(`/inventory/${encoded}`, {
      method: 'PATCH',
      body:   JSON.stringify({ units_available: units, max_capacity: max }),
    });
    if (!res) return;
    const json = await res.json();
    if (!json.success) { showToast('❌', 'Error', json.message); return; }

    showToast('✅', 'Inventory Updated', `${editingBloodType}: ${units} / ${max} units saved to database.`);
    closeInventoryEdit();
    await loadInventory();   // re-fetch from DB so grid reflects real values
  } catch (e) {
    console.error('Inventory update failed', e);
    showToast('❌', 'Error', 'Could not update inventory. Check console.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Save Stock Update'; }
  }
}

// ── REQUESTS ───────────────────────────────────
async function loadRequests(statusFilter = 'all') {
  try {
    const qs   = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const res  = await apiRequest(`/requests${qs}`);
    if (!res) return;
    const json = await res.json();
    allRequests = json.data || [];
    renderOverviewStats();
    renderOverviewTable();
    renderAllRequests(allRequests);
    updatePendingBadge();
  } catch (e) { console.error('Requests load failed', e); }
}

function renderOverviewStats() {
  const active    = allRequests.filter(r => ['pending','approved','enroute'].includes(r.status)).length;
  const fulfilled = allRequests.filter(r => r.status === 'done').length;
  const enroute   = allRequests.filter(r => r.status === 'enroute').length;
  const critStock = bloodData.filter(b => b.status === 'critical' || b.status === 'out').length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('statActive',    active);
  set('statFulfilled', fulfilled);
  set('statEnroute',   enroute);
  set('statCritStock', critStock);

  // Also keep sidebar badge live
  const badge = document.getElementById('pendingBadge');
  if (badge) badge.textContent = allRequests.filter(r => r.status === 'pending').length;
}

function updatePendingBadge() {
  const badge = document.getElementById('pendingBadge');
  if (badge) badge.textContent = allRequests.filter(r => r.status === 'pending').length;
}

function renderOverviewTable() {
  const tbody = document.getElementById('overviewRequestsTable');
  if (!tbody) return;
  const recent = allRequests.slice(0, 5);
  tbody.innerHTML = recent.length ? recent.map(r => `
    <tr>
      <td><span class="req-id">${r.request_number}</span></td>
      <td><span class="blood-pill">${r.blood_type}</span></td>
      <td style="color:var(--hs-text);font-weight:600;">${r.units_requested}</td>
      <td><span class="urgency-pill up-${(r.urgency||'').toLowerCase()}">${r.urgency}</span></td>
      <td>${renderSB(r.status)}</td>
      <td style="color:var(--hs-text-3);font-size:0.72rem;">${timeAgo(r.created_at)}</td>
    </tr>`).join('') : `<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--hs-text-3);font-size:0.82rem;">No requests yet</td></tr>`;
}

function renderAllRequests(data) {
  const tbody = document.getElementById('allRequestsTable');
  if (!tbody) return;
  tbody.innerHTML = data.length ? data.map(r => `
    <tr>
      <td><span class="req-id">${r.request_number}</span></td>
      <td><span class="blood-pill">${r.blood_type}</span></td>
      <td style="color:var(--hs-text);font-weight:600;">${r.units_requested}</td>
      <td style="color:var(--hs-text-2);font-size:0.76rem;">${r.component}</td>
      <td style="color:var(--hs-text-2);font-size:0.76rem;">${r.patient_name || '—'}</td>
      <td><span class="urgency-pill up-${(r.urgency||'').toLowerCase()}">${r.urgency}</span></td>
      <td>${renderSB(r.status)}</td>
      <td style="color:var(--hs-text-3);font-size:0.72rem;">${timeAgo(r.created_at)}</td>
      <td>
        <select onchange="changeStatus('${r.id}', this.value)" style="background:var(--hs-bg2);border:1px solid var(--hs-border);border-radius:5px;color:var(--hs-text-2);font-size:0.7rem;padding:3px 6px;">
          <option value="">Action</option>
          ${r.status==='pending'  ? '<option value="approved">Approve</option>' : ''}
          ${r.status==='approved' ? '<option value="enroute">Dispatch</option>' : ''}
          ${r.status==='enroute'  ? '<option value="done">Mark Done</option>'  : ''}
          ${!['done','cancelled'].includes(r.status) ? '<option value="cancelled">Cancel</option>' : ''}
        </select>
      </td>
    </tr>`).join('') : `<tr><td colspan="9" style="padding:20px;text-align:center;color:var(--hs-text-3);font-size:0.82rem;">No requests found</td></tr>`;
}

async function changeStatus(id, status) {
  if (!status) return;

  // Optimistically grey out the row while saving
  const rows = document.querySelectorAll('#allRequestsTable tr, #overviewRequestsTable tr');
  rows.forEach(r => { if (r.innerHTML.includes(id)) r.style.opacity = '0.5'; });

  try {
    const res = await apiRequest(`/requests/${id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status }),
    });
    if (!res) { rows.forEach(r => r.style.opacity = ''); return; }
    const json = await res.json();

    if (!json.success) {
      rows.forEach(r => r.style.opacity = '');
      showToast('❌', 'Error', json.message);
      return;
    }

    // ── LIVE UPDATE: apply inventory change instantly from the response ──
    // json.data.inventory is returned by backend when status === 'done'
    if (json.data.inventory) {
      const inv = json.data.inventory;

      // 1. Update in-memory bloodData array
      const idx = bloodData.findIndex(b => b.blood_type === inv.blood_type);
      if (idx !== -1) bloodData[idx] = inv;

      // 2. Re-render inventory snapshot on overview page immediately
      renderInventorySnapshot();

      // 3. Re-render full inventory grid immediately
      renderInventoryPage();

      // 4. Re-render alert banners if any type just became critical
      renderAlerts();

      // 5. Flash the updated blood type card so the user sees it changed
      flashInventoryCard(inv.blood_type);

      showToast(
        '🩸',
        `Inventory Updated — ${inv.blood_type}`,
        `${inv.units_available} units remaining · ${statusLabel[inv.status] || inv.status}`
      );
    } else {
      showToast('✅', 'Status Updated', `Request marked as ${status}`);
    }

    // Reload requests to refresh the table rows (resets dropdowns too)
    await loadRequests();

  } catch (e) {
    console.error('changeStatus error', e);
    rows.forEach(r => r.style.opacity = '');
    showToast('❌', 'Error', 'Could not update status');
  }
}

// Flash a blood type card gold briefly to signal it just updated
function flashInventoryCard(bloodType) {
  // Try to find the card in the inventory grid
  const allCards = document.querySelectorAll('#inventoryFullGrid > div');
  allCards.forEach(card => {
    if (card.textContent.trim().startsWith(bloodType)) {
      card.style.transition = 'box-shadow 0.2s, border-color 0.2s';
      card.querySelector('div').style.borderColor = 'rgba(59,130,246,0.6)';
      card.querySelector('div').style.boxShadow  = '0 0 0 3px rgba(59,130,246,0.15)';
      setTimeout(() => {
        if (card.querySelector('div')) {
          card.querySelector('div').style.borderColor = '';
          card.querySelector('div').style.boxShadow  = '';
        }
      }, 1800);
    }
  });
  // Also flash the snapshot bar
  const snapItems = document.querySelectorAll('#inventorySnapshot .inv-item');
  snapItems.forEach(item => {
    if (item.querySelector('.inv-type')?.textContent === bloodType) {
      item.style.background = 'rgba(59,130,246,0.08)';
      item.style.borderRadius = '6px';
      setTimeout(() => { item.style.background = ''; }, 1800);
    }
  });
}

async function filterRequests(val) {
  await loadRequests(val);
}

// ── NEW REQUEST ────────────────────────────────
function quickSetBlood(type) {
  const el = document.getElementById('nrBloodType');
  if (el) { el.value = type; updateNRSummary(); }
}

function setNRUrgency(btn, level) {
  document.querySelectorAll('.urg-btn').forEach(b => b.className = 'urg-btn');
  const map = { Normal:'an', Urgent:'au', Critical:'ac' };
  btn.classList.add(map[level]);
  currentUrgency = level;
  updateNRSummary();
}

function updateNRSummary() {
  const blood = document.getElementById('nrBloodType')?.value;
  const units = document.getElementById('nrUnits')?.value;
  const comp  = document.getElementById('nrComponent')?.value;
  const rows  = [
    ['Blood Type',   blood || '—'],
    ['Units',        units || '0'],
    ['Component',    comp  || 'Whole Blood'],
    ['Urgency',      currentUrgency],
    ['Hospital',     sessionUser?.name || ''],
    ['Est. Response','~25 minutes'],
  ];
  const el = document.getElementById('nrSummaryRows');
  if (el) el.innerHTML = rows.map(([l, v]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;border-bottom:1px solid var(--hs-border2);font-size:0.8rem;">
      <span style="color:var(--hs-text-3);">${l}</span>
      <span style="font-weight:500;color:var(--hs-text)">${v}</span>
    </div>`).join('');

  if (blood) {
    const entry = bloodData.find(b => b.blood_type === blood);
    const avPanel = document.getElementById('nrAvailPanel');
    if (avPanel && entry) {
      const pct = Math.round((entry.units_available / entry.max_capacity) * 100);
      avPanel.innerHTML = `
        <div style="text-align:center;margin-bottom:10px;">
          <div style="font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:${statusColor[entry.status]}">${entry.blood_type}</div>
          <div style="font-size:0.75rem;color:var(--hs-text-3);margin-top:2px;">${entry.units_available} units available</div>
        </div>
        <div style="height:6px;background:var(--hs-bg2);border-radius:100px;overflow:hidden;margin-bottom:7px;">
          <div style="height:100%;width:${pct}%;background:${barColor[entry.status]};border-radius:100px;"></div>
        </div>
        <div style="font-size:0.7rem;color:var(--hs-text-3);text-align:center;">${statusLabel[entry.status]} · ${pct}% capacity</div>`;
    }
  }
}

async function submitNewRequest() {
  const blood = document.getElementById('nrBloodType')?.value;
  const units = document.getElementById('nrUnits')?.value;
  if (!blood || !units) { showToast('⚠️', 'Missing Fields', 'Please select blood type and units.'); return; }

  const btn = document.querySelector('#page-newrequest .btn-hs-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  try {
    const res  = await apiRequest('/requests', {
      method: 'POST',
      body:   JSON.stringify({
        blood_type:        blood,
        units_requested:   parseInt(units),
        component:         document.getElementById('nrComponent')?.value || 'Whole Blood',
        urgency:           currentUrgency,
        patient_name:      document.getElementById('nrPatient')?.value || undefined,
        ward:              document.getElementById('nrWard')?.value     || undefined,
        doctor_name:       document.getElementById('nrDoctor')?.value   || undefined,
        notes:             document.getElementById('nrNotes')?.value    || undefined,
      }),
    });
    if (!res) return;
    const json = await res.json();
    if (!json.success) { showToast('❌', 'Error', json.message); return; }

    showToast('✅', 'Request Submitted!', `ID: ${json.data.request_number}`);
    clearNRForm();
    await loadRequests();
    showPage('requests');
  } catch (e) {
    showToast('❌', 'Error', 'Could not submit request');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-send-fill"></i> Submit Request'; }
  }
}

function clearNRForm() {
  ['nrBloodType','nrUnits','nrPatient','nrWard','nrDoctor','nrNotes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  currentUrgency = 'Normal';
  document.querySelectorAll('.urg-btn').forEach(b => { b.className = 'urg-btn'; });
  const first = document.querySelector('.urg-btn');
  if (first) first.classList.add('an');
  updateNRSummary();
}

// ── HOSPITAL PROFILE ───────────────────────────
async function loadHospitalProfile() {
  try {
    const res  = await apiRequest('/auth/me');
    if (!res) return;
    const json = await res.json();
    const hp   = json.data?.profile;
    const user = json.data?.user;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') { if (val) el.value = val; }
      else { el.value = val || ''; }
    };

    // hospital_profiles fields
    if (hp) {
      setVal('profHospName',      hp.org_name);
      setVal('profAuthPerson',    hp.authorized_person);
      setVal('profHospType',      hp.hospital_type);
      setVal('profBedCapacity',   hp.bed_capacity);

      // Update sidebar + form label
      const orgName = hp.org_name || sessionUser?.name || '';
      setEl('formHospName', orgName);
      setEl('sideHospName', orgName);

      // Profile card stats
      const totalReqs = allRequests.length;
      const fulfilled = allRequests.filter(r => r.status === 'done').length;
      const active    = allRequests.filter(r => ['pending','approved','enroute'].includes(r.status)).length;
      setEl('profileTotalReqs', totalReqs || '—');
      setEl('profileFulfilled', fulfilled || '—');
      setEl('profileActive',    active    || '—');
    }

    // users table fields
    if (user) {
      setVal('profEmail',   user.email);
      setVal('profPhone',   user.phone);
      setVal('profAddress', user.address);

      // Update topbar name + avatar
      const initials = (user.name || '').split(' ').filter(w => /[A-Za-z]/.test(w)).map(w => w[0]).join('').slice(0,2).toUpperCase() || 'H';
      setEl('profileAvatar', initials);
      setEl('profileName',   user.name);
      setEl('profileEmail',  user.email);
    }
  } catch (e) { console.error('Profile load failed', e); }
}

async function saveHospitalProfile() {
  const btn = document.querySelector('#page-profile .btn-hs-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  try {
    const org_name          = document.getElementById('profHospName')?.value?.trim();
    const authorized_person = document.getElementById('profAuthPerson')?.value?.trim();
    const hospital_type     = document.getElementById('profHospType')?.value;
    const bed_capacity      = document.getElementById('profBedCapacity')?.value;
    const phone             = document.getElementById('profPhone')?.value?.trim();
    const address           = document.getElementById('profAddress')?.value?.trim();

    const res = await apiRequest('/users/me/hospital-profile', {
      method: 'PATCH',
      body:   JSON.stringify({
        org_name,
        authorized_person,
        hospital_type,
        bed_capacity:  bed_capacity  ? parseInt(bed_capacity)  : undefined,
        phone:         phone         || undefined,
        address:       address       || undefined,
      }),
    });
    if (!res) return;
    const json = await res.json();
    if (!json.success) { showToast('❌', 'Error', json.message); return; }

    // Update sidebar and form label immediately — no refresh needed
    if (org_name) {
      setEl('formHospName', org_name);
      setEl('sideHospName', org_name);
    }
    showToast('✅', 'Profile Saved', 'All changes saved to the database.');
  } catch (e) {
    console.error('Save profile error:', e);
    showToast('❌', 'Error', 'Could not save profile');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Save Changes'; }
  }
}

// ── PAGE NAV ───────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item-hs').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelectorAll('.nav-item-hs').forEach(n => {
    if (n.getAttribute('onclick')?.includes(id)) n.classList.add('active');
  });
  const titles = { overview:'Overview', requests:'Blood Requests', inventory:'Inventory', newrequest:'New Request', profile:'Hospital Profile' };
  setEl('topbarTitle', titles[id] || id);
  document.getElementById('sidebar')?.classList.remove('open');

  // Refresh data when switching pages
  if (id === 'inventory') loadInventory();
  if (id === 'requests')  loadRequests();
  if (id === 'newrequest') updateNRSummary();
}

// ── HELPERS ────────────────────────────────────
function renderSB(status) {
  const map = { pending:['sb-pending','Pending'], approved:['sb-approved','Approved'], enroute:['sb-enroute','En Route'], done:['sb-done','Done'], cancelled:['sb-critical','Cancelled'] };
  const [cls, label] = map[status] || ['sb-pending', status];
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff/60)   + ' min ago';
  if (diff < 86400)return Math.floor(diff/3600)  + ' hr ago';
  return Math.floor(diff/86400) + ' days ago';
}

function refreshData() {
  loadInventory();
  loadRequests();
  showToast('🔄', 'Refreshed', 'Dashboard data is up to date.');
}

function handleLogout() { apiLogout(); }
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }

// Init
init();
