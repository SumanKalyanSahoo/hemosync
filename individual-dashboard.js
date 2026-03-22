/* ═══════════════════════════════════════════════
   HemoSync — Individual Dashboard (API-wired)
   Depends on: api-client.js loaded before this
   ═══════════════════════════════════════════════ */

if (!requireAuth()) { /* api-client.js redirects */ }
const sessionUser = Tokens.getUser();

// ── STATE ──────────────────────────────────────
let bloodData        = [];
let allRequests      = [];
let contacts         = [];
let selectedBloodType = sessionUser?.blood_type || 'O+';
let reqUrgency       = 'Normal';

const statusLabel = { ok:'Available', low:'Low Stock', critical:'Critical', out:'Out of Stock' };
const statusColor = { ok:'var(--hs-green)', low:'var(--hs-amber)', critical:'var(--hs-red)', out:'var(--hs-red)' };
const barColor    = { ok:'var(--hs-green)', low:'var(--hs-amber)', critical:'var(--hs-red)', out:'var(--hs-red)' };

// ── INIT ───────────────────────────────────────
async function init() {
  const user     = sessionUser || {};
  const name     = user.name   || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  setEl('sideAvatar',   initials);
  setEl('topbarAvatar', initials);
  setEl('profileAvatar',initials);
  setEl('sideName',     name);
  setEl('topbarName',   name.split(' ')[0]);
  setEl('profileName',  name);
  setEl('profileEmail', user.email || '');
  setEl('profileBloodBadge', user.blood_type || '—');
  setEl('reqAutoFillName',   name);
  setEl('reqAutoFillBlood',  user.blood_type || '');

  await Promise.all([loadInventory(), loadRequests(), loadContacts()]);
  renderBloodTypePicker();
  updateReqSummary();
}

function setEl(id, val) {
  const el = document.getElementById(id); if (el) el.textContent = val;
}

// ── INVENTORY ──────────────────────────────────
async function loadInventory() {
  try {
    const res  = await apiRequest('/inventory');
    if (!res) return;
    const json = await res.json();
    bloodData  = json.data || [];
    renderBloodTypePicker();
  } catch (e) { console.error('Inventory load failed', e); }
}

function renderBloodTypePicker() {
  const el = document.getElementById('bloodTypePicker');
  if (!el || !bloodData.length) return;
  el.innerHTML = bloodData.map(b => `
    <div class="col-3">
      <div class="avail-card status-${b.status} ${b.blood_type === selectedBloodType ? 'sel' : ''}" onclick="selectBloodType('${b.blood_type}')">
        <div class="avail-type" style="color:${b.blood_type === selectedBloodType ? 'var(--hs-red)' : statusColor[b.status]}">${b.blood_type}</div>
        <div class="avail-units">${b.units_available} units</div>
        <span class="avail-chip" style="background:${b.status==='ok'?'var(--hs-green-bg)':b.status==='low'?'var(--hs-amber-bg)':'var(--hs-red-subtle)'};color:${statusColor[b.status]};">${statusLabel[b.status]}</span>
      </div>
    </div>`).join('');
}

function selectBloodType(type) {
  selectedBloodType = type;
  renderBloodTypePicker();
  updateReqSummary();
  updateAvailPanel();
}

function updateAvailPanel() {
  const entry = bloodData.find(b => b.blood_type === selectedBloodType);
  const el    = document.getElementById('reqAvailPanel');
  if (!el || !entry) return;
  const pct = Math.round((entry.units_available / entry.max_capacity) * 100);
  el.innerHTML = `
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:${statusColor[entry.status]}">${entry.blood_type}</div>
      <div style="font-size:0.76rem;color:var(--hs-text-3);margin-top:2px;">${entry.units_available} units available</div>
    </div>
    <div style="height:6px;background:var(--hs-bg2);border-radius:100px;overflow:hidden;margin-bottom:7px;">
      <div style="height:100%;width:${pct}%;background:${barColor[entry.status]};border-radius:100px;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--hs-text-3);margin-bottom:10px;">
      <span>${pct}% capacity</span><span>${statusLabel[entry.status]}</span>
    </div>
    <div style="background:${entry.status==='ok'?'var(--hs-green-bg)':entry.status==='low'?'var(--hs-amber-bg)':'var(--hs-red-subtle)'};border:1px solid ${entry.status==='ok'?'rgba(22,163,74,0.18)':entry.status==='low'?'rgba(217,119,6,0.18)':'rgba(232,33,42,0.18)'};border-radius:7px;padding:9px;text-align:center;">
      <div style="font-size:0.72rem;font-weight:700;color:${statusColor[entry.status]};text-transform:uppercase;letter-spacing:0.06em;">${statusLabel[entry.status]}</div>
      <div style="font-size:0.68rem;color:var(--hs-text-3);margin-top:2px;">${entry.status==='ok'?'Adequate stock':'Limited — may take longer'}</div>
    </div>`;
}

// ── REQUESTS ───────────────────────────────────
async function loadRequests() {
  try {
    const res  = await apiRequest('/requests');
    if (!res) return;
    const json = await res.json();
    allRequests = json.data || [];
    renderFullHistoryTable(allRequests);
    updateRequestBadge();
  } catch (e) { console.error('Requests load failed', e); }
}

function updateRequestBadge() {
  const badge = document.getElementById('activeReqBadge');
  const active = allRequests.filter(r => !['done','cancelled'].includes(r.status)).length;
  if (badge) {
    badge.style.display = active ? 'inline' : 'none';
    badge.textContent   = active;
  }
  setEl('histBadge', allRequests.length);
}

function renderFullHistoryTable(data) {
  const tbody = document.getElementById('fullHistoryTable');
  if (!tbody) return;
  tbody.innerHTML = data.length ? data.map(r => `
    <tr>
      <td><span class="req-id">${r.request_number}</span></td>
      <td><span class="blood-pill">${r.blood_type}</span></td>
      <td style="color:var(--hs-text);font-weight:600;">${r.units_requested}</td>
      <td style="font-size:0.76rem;color:var(--hs-text-2);">${r.component}</td>
      <td style="font-size:0.76rem;color:var(--hs-text-2);">${r.patient_name || '—'}</td>
      <td><span class="urgency-pill up-${(r.urgency||'').toLowerCase()}">${r.urgency}</span></td>
      <td>${renderSB(r.status)}</td>
      <td style="font-size:0.7rem;color:var(--hs-text-3);">${timeAgo(r.created_at)}</td>
      <td>
        ${!['done','cancelled'].includes(r.status) ? `
        <button class="panel-action" style="font-size:0.68rem;color:var(--hs-red);"
          onclick="cancelRequest('${r.id}')">Cancel</button>` : '—'}
      </td>
    </tr>`).join('') : `<tr><td colspan="9" style="padding:24px;text-align:center;color:var(--hs-text-3);font-size:0.82rem;"><i class="bi bi-inbox" style="display:block;font-size:1.4rem;margin-bottom:8px;opacity:0.4"></i>No requests yet</td></tr>`;
}

async function cancelRequest(id) {
  if (!confirm('Cancel this blood request?')) return;
  try {
    const res  = await apiRequest(`/requests/${id}/status`, {
      method: 'PATCH',
      body:   JSON.stringify({ status: 'cancelled', cancel_reason: 'Cancelled by user' }),
    });
    if (!res) return;
    const json = await res.json();
    if (json.success) { showToast('✅', 'Request Cancelled', ''); await loadRequests(); }
    else showToast('❌', 'Error', json.message);
  } catch { showToast('❌', 'Error', 'Could not cancel request'); }
}

function filterHistory(val) {
  const filtered = val === 'all' ? allRequests : allRequests.filter(r => r.status === val);
  renderFullHistoryTable(filtered);
}

// ── SUBMIT REQUEST ─────────────────────────────
function setReqUrgency(btn, level) {
  document.querySelectorAll('.urg-btn').forEach(b => b.className = 'urg-btn');
  const map = { Normal:'an', Urgent:'au', Critical:'ac' };
  btn.classList.add(map[level]);
  reqUrgency = level;
  updateReqSummary();
}

function updateReqSummary() {
  const units = document.getElementById('reqUnits')?.value;
  const comp  = document.getElementById('reqComponent')?.value;
  const rows  = [
    ['Requested By', sessionUser?.name || ''],
    ['Blood Type',   selectedBloodType],
    ['Units',        units || '0'],
    ['Component',    comp  || 'Whole Blood'],
    ['Urgency',      reqUrgency],
    ['Est. Response','~30 minutes'],
  ];
  const el = document.getElementById('reqSummaryRows');
  if (el) el.innerHTML = rows.map(([l, v]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;border-bottom:1px solid var(--hs-border2);font-size:0.8rem;">
      <span style="color:var(--hs-text-3);">${l}</span>
      <span style="font-weight:500;color:${l==='Blood Type'?'var(--hs-red)':l==='Urgency'&&v==='Critical'?'var(--hs-red)':l==='Urgency'&&v==='Urgent'?'var(--hs-amber)':'var(--hs-text)'}">${v}</span>
    </div>`).join('');
}

async function submitRequest() {
  const units   = document.getElementById('reqUnits')?.value;
  const phone   = document.getElementById('reqPhone')?.value.trim();
  const address = document.getElementById('reqAddress')?.value.trim();

  if (!units || !phone || !address) {
    showToast('⚠️', 'Missing Fields', 'Please fill in units, phone, and address.');
    return;
  }

  const btn = document.querySelector('#page-request .btn-hs-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  try {
    const res = await apiRequest('/requests', {
      method: 'POST',
      body: JSON.stringify({
        blood_type:        selectedBloodType,
        units_requested:   parseInt(units),
        component:         document.getElementById('reqComponent')?.value || 'Whole Blood',
        urgency:           reqUrgency,
        patient_name:      document.getElementById('reqPatient')?.value || undefined,
        delivery_location: address,
        contact_phone:     phone,
        notes:             document.getElementById('reqNotes')?.value || undefined,
      }),
    });
    if (!res) return;
    const json = await res.json();
    if (!json.success) { showToast('❌', 'Error', json.message); return; }

    showToast('✅', 'Request Submitted!', `ID: ${json.data.request_number} — response within 30 min.`);
    clearReqForm();
    await loadRequests();
    showPage('tracker');
  } catch { showToast('❌', 'Error', 'Could not submit request'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-send-fill"></i> Submit Request'; } }
}

function clearReqForm() {
  ['reqUnits','reqPhone','reqAddress','reqPatient','reqNotes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  updateReqSummary();
}

async function triggerSOS() {
  const res = await apiRequest('/requests', {
    method: 'POST',
    body: JSON.stringify({
      blood_type:      selectedBloodType,
      units_requested: 2,
      component:       'Whole Blood',
      urgency:         'Critical',
      patient_name:    sessionUser?.name,
      notes:           'SOS Emergency Request',
    }),
  });
  if (!res) return;
  const json = await res.json();
  if (json.success) {
    showToast('🚨', 'SOS Sent!', `Emergency request ${json.data.request_number} dispatched. Contacts notified.`);
    await loadRequests();
  }
}

// ── CONTACTS ───────────────────────────────────
async function loadContacts() {
  try {
    const res  = await apiRequest('/users/me/contacts');
    if (!res) return;
    const json = await res.json();
    contacts   = json.data || [];
    renderContacts();
    setEl('histBadge', allRequests.length);
  } catch (e) { console.error('Contacts load failed', e); }
}

function renderContacts() {
  const colors = ['#E8212A','#3B82F6','#16A34A','#D97706','#8B5CF6'];
  const el = document.getElementById('contactsList');
  if (!el) return;
  el.innerHTML = contacts.length ? contacts.map((c, i) => `
    <div class="contact-card">
      <div class="contact-avatar" style="background:${colors[i % colors.length]}">${c.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div style="flex:1;">
        <div class="contact-name">${c.name}</div>
        <div class="contact-rel">${c.relationship}</div>
        <div class="contact-phone">${c.phone}</div>
      </div>
      <div class="contact-call" onclick="showToast('📞','Calling','Connecting to ${c.name}...')" title="Call">
        <i class="bi bi-telephone-fill" style="font-size:0.72rem;"></i>
      </div>
      <div class="contact-call" style="background:var(--hs-red-subtle);border-color:rgba(232,33,42,0.2);color:var(--hs-red);margin-left:4px;" onclick="deleteContact('${c.id}')" title="Remove">
        <i class="bi bi-trash" style="font-size:0.72rem;"></i>
      </div>
    </div>`).join('') : `<div style="padding:20px;text-align:center;color:var(--hs-text-3);font-size:0.82rem;">No contacts yet. Add one above.</div>`;
}

function showAddContact()  { document.getElementById('addContactPanel').style.display = 'block'; }
function hideAddContact()  { document.getElementById('addContactPanel').style.display = 'none'; }

async function addContact() {
  const name  = document.getElementById('newContactName')?.value.trim();
  const rel   = document.getElementById('newContactRel')?.value;
  const phone = document.getElementById('newContactPhone')?.value.trim();
  if (!name || !phone) { showToast('⚠️','Missing Fields','Please fill in name and phone.'); return; }

  try {
    const res  = await apiRequest('/users/me/contacts', {
      method: 'POST',
      body:   JSON.stringify({ name, relationship: rel, phone }),
    });
    if (!res) return;
    const json = await res.json();
    if (!json.success) { showToast('❌','Error', json.message); return; }
    showToast('✅','Contact Added', `${name} saved.`);
    hideAddContact();
    const nameEl = document.getElementById('newContactName'); if (nameEl) nameEl.value = '';
    const phoneEl= document.getElementById('newContactPhone');if (phoneEl) phoneEl.value= '';
    await loadContacts();
  } catch { showToast('❌','Error','Could not add contact'); }
}

async function deleteContact(id) {
  if (!confirm('Remove this contact?')) return;
  try {
    const res  = await apiRequest(`/users/me/contacts/${id}`, { method: 'DELETE' });
    if (!res) return;
    const json = await res.json();
    if (json.success) { showToast('🗑️','Removed','Contact removed.'); await loadContacts(); }
    else showToast('❌','Error', json.message);
  } catch { showToast('❌','Error','Could not remove contact'); }
}

// ── PROFILE ────────────────────────────────────
async function saveProfile() {
  const name  = document.getElementById('profName')?.value.trim();
  const blood = document.getElementById('profBloodType')?.value;
  const btn   = document.querySelector('#page-profile .btn-hs-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    const res  = await apiRequest('/users/me', {
      method: 'PATCH',
      body:   JSON.stringify({ name, blood_type: blood }),
    });
    if (!res) return;
    const json = await res.json();
    if (!json.success) { showToast('❌','Error', json.message); return; }

    // Update local session
    const updated = { ...sessionUser, name: json.data.name, blood_type: json.data.blood_type };
    Tokens.setUser(updated);
    setEl('sideName',          updated.name);
    setEl('topbarName',        updated.name.split(' ')[0]);
    setEl('profileName',       updated.name);
    setEl('profileBloodBadge', updated.blood_type);
    setEl('reqAutoFillBlood',  updated.blood_type);
    selectedBloodType = updated.blood_type;
    renderBloodTypePicker();
    showToast('✅','Profile Updated','Your details have been saved.');
  } catch { showToast('❌','Error','Could not save profile'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Save Changes'; } }
}

function updateBloodTypeGlobal(val) {
  selectedBloodType = val;
  setEl('profileBloodBadge', val);
  setEl('reqAutoFillBlood',  val);
  renderBloodTypePicker();
  updateReqSummary();
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
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return Math.floor(diff/60)   + ' min ago';
  if (diff < 86400) return Math.floor(diff/3600)  + ' hr ago';
  return Math.floor(diff/86400) + ' days ago';
}

function showPage(id) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item-hs').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelectorAll('.nav-item-hs').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${id}'`)) n.classList.add('active');
  });
  const titles = { request:'Request Blood', tracker:'Track Request', history:'Request History', contacts:'Emergency Contacts', profile:'My Profile' };
  setEl('topbarTitle', titles[id] || id);
  document.getElementById('sidebar')?.classList.remove('open');

  if (id === 'history')  loadRequests();
  if (id === 'contacts') loadContacts();
  if (id === 'request')  { loadInventory(); updateReqSummary(); }
}

function handleLogout() { apiLogout(); }
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }

init();
