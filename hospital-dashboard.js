/* ═══════════════════════════════════════════════
   HemoSync — Hospital Dashboard Logic
   ═══════════════════════════════════════════════ */

const bloodData = [
  { type: 'A+', units: 84, max: 120, status: 'ok' },
  { type: 'A−', units: 12, max: 80, status: 'low' },
  { type: 'B+', units: 67, max: 100, status: 'ok' },
  { type: 'B−', units: 5, max: 60, status: 'critical' },
  { type: 'AB+', units: 31, max: 60, status: 'ok' },
  { type: 'AB−', units: 8, max: 40, status: 'low' },
  { type: 'O+', units: 102, max: 150, status: 'ok' },
  { type: 'O−', units: 3, max: 60, status: 'critical' },
];

const statusLabel = { ok: 'Available', low: 'Low Stock', critical: 'Critical' };
const statusColor = { ok: 'var(--hs-green)', low: 'var(--hs-amber)', critical: 'var(--hs-red)' };
const barColor = { ok: 'var(--hs-green)', low: 'var(--hs-amber)', critical: 'var(--hs-red)' };

const allRequests = [
  { id: 'REQ-1042', blood: 'O+', units: 4, component: 'PRBC', patient: 'Ravi Kumar', urgency: 'Critical', status: 'enroute', time: '10 min ago' },
  { id: 'REQ-1041', blood: 'A+', units: 2, component: 'Whole Blood', patient: 'Sita Patel', urgency: 'Normal', status: 'approved', time: '32 min ago' },
  { id: 'REQ-1040', blood: 'B−', units: 6, component: 'Platelets', patient: 'Mohan Das', urgency: 'Urgent', status: 'pending', time: '1 hr ago' },
  { id: 'REQ-1039', blood: 'AB+', units: 1, component: 'FFP', patient: 'Anita Rao', urgency: 'Normal', status: 'done', time: '2 hr ago' },
  { id: 'REQ-1038', blood: 'O−', units: 3, component: 'PRBC', patient: 'Raj Singh', urgency: 'Critical', status: 'done', time: '3 hr ago' },
  { id: 'REQ-1037', blood: 'A−', units: 2, component: 'Whole Blood', patient: 'Priya Mehta', urgency: 'Urgent', status: 'done', time: '5 hr ago' },
  { id: 'REQ-1036', blood: 'B+', units: 5, component: 'Platelets', patient: 'Deepak Jain', urgency: 'Normal', status: 'pending', time: '6 hr ago' },
  { id: 'REQ-1035', blood: 'O+', units: 8, component: 'PRBC', patient: 'Kavita Nair', urgency: 'Critical', status: 'pending', time: '7 hr ago' },
];

let currentUrgency = 'Normal';

const params = new URLSearchParams(window.location.search);
const hospUser = {
  name: params.get('name') || 'Dr. Ramesh Verma',
  email: params.get('email') || 'admin@hospital.com',
  org: params.get('org') || 'City General Hospital',
};

function init() {
  const initials = hospUser.name.split(' ').filter(w => /[A-Z]/.test(w)).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'H';
  document.getElementById('sideHospAvatar').textContent = initials;
  document.getElementById('sideHospName').textContent = hospUser.org;
  document.getElementById('topbarAvatar').textContent = initials;
  document.getElementById('topbarName').textContent = hospUser.name.split(' ').slice(0, 2).join(' ');
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent = hospUser.name;
  document.getElementById('profileEmail').textContent = hospUser.email;
  document.getElementById('profHospName').value = hospUser.org;
  document.getElementById('profAuthPerson').value = hospUser.name;
  document.getElementById('profEmail').value = hospUser.email;
  document.getElementById('formHospName').textContent = hospUser.org;

  renderAlerts();
  renderOverviewTable();
  renderInventorySnapshot();
  renderAllRequests(allRequests);
  renderInventoryPage();
  renderNRSummary();
}

function showPage(id) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item-hs').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item-hs').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(id)) n.classList.add('active');
  });
  const titles = { overview: 'Overview', requests: 'Blood Requests', inventory: 'Inventory', newrequest: 'New Request', profile: 'Hospital Profile' };
  document.getElementById('topbarTitle').textContent = titles[id] || id;
  document.getElementById('sidebar').classList.remove('open');
}

function renderAlerts() {
  const critical = bloodData.filter(b => b.status === 'critical');
  document.getElementById('alertsContainer').innerHTML = critical.map(b => `
    <div class="alert-banner">
      <span class="alert-banner-icon">⚠️</span>
      <div class="alert-banner-text">
        <strong>${b.type} is critically low</strong> — only ${b.units} units remaining.
        <a href="#" onclick="showPage('newrequest');quickSetBlood('${b.type}');return false;" style="color:var(--hs-red);margin-left:6px;font-weight:600;">Request Now →</a>
      </div>
    </div>
  `).join('');
}

function renderOverviewTable() {
  document.getElementById('overviewRequestsTable').innerHTML = allRequests.slice(0, 5).map(r => `
    <tr>
      <td><span class="req-id">${r.id}</span></td>
      <td><span class="blood-pill">${r.blood}</span></td>
      <td style="color:var(--hs-text);font-weight:600;">${r.units}</td>
      <td><span class="urgency-pill up-${r.urgency.toLowerCase()}">${r.urgency}</span></td>
      <td>${renderSB(r.status)}</td>
      <td style="color:var(--hs-text-3);font-size:0.72rem;">${r.time}</td>
    </tr>
  `).join('');
}

function renderSB(status) {
  const map = { pending: ['sb-pending', 'Pending'], approved: ['sb-approved', 'Approved'], enroute: ['sb-enroute', 'En Route'], done: ['sb-done', 'Done'] };
  const [cls, label] = map[status] || ['sb-pending', status];
  return `<span class="status-badge ${cls}">${label}</span>`;
}

function renderInventorySnapshot() {
  document.getElementById('inventorySnapshot').innerHTML = bloodData.map(b => {
    const pct = Math.round((b.units / b.max) * 100);
    return `
      <div class="inv-item">
        <div class="inv-type" style="color:${statusColor[b.status]}">${b.type}</div>
        <div class="inv-bar-wrap">
          <div class="inv-bar-track"><div class="inv-bar-fill" style="width:${pct}%;background:${barColor[b.status]};"></div></div>
          <div class="inv-units">${b.units} / ${b.max}</div>
        </div>
        <span class="inv-chip" style="background:${b.status === 'ok' ? 'var(--hs-green-bg)' : b.status === 'low' ? 'var(--hs-amber-bg)' : 'var(--hs-red-subtle)'};color:${statusColor[b.status]};">${statusLabel[b.status]}</span>
      </div>`;
  }).join('');
}

function renderAllRequests(data) {
  document.getElementById('allRequestsTable').innerHTML = data.map(r => `
    <tr>
      <td><span class="req-id">${r.id}</span></td>
      <td><span class="blood-pill">${r.blood}</span></td>
      <td style="color:var(--hs-text);font-weight:600;">${r.units}</td>
      <td style="color:var(--hs-text-2);font-size:0.76rem;">${r.component}</td>
      <td style="color:var(--hs-text-2);font-size:0.76rem;">${r.patient}</td>
      <td><span class="urgency-pill up-${r.urgency.toLowerCase()}">${r.urgency}</span></td>
      <td>${renderSB(r.status)}</td>
      <td style="color:var(--hs-text-3);font-size:0.72rem;">${r.time}</td>
      <td><button class="panel-action" style="font-size:0.68rem;" onclick="showToast('📋','${r.id}','Full detail view coming soon.')"><i class="bi bi-eye"></i></button></td>
    </tr>
  `).join('');
}

function filterRequests(val) {
  const filtered = val === 'all' ? allRequests : allRequests.filter(r => r.status === val);
  renderAllRequests(filtered);
}

function renderInventoryPage() {
  const critical = bloodData.filter(b => b.status !== 'ok');
  document.getElementById('criticalStockCards').innerHTML = critical.map(b => `
    <div class="col-md-6 col-lg-3">
      <div class="stat-card" style="border-color:${b.status === 'critical' ? 'rgba(232,33,42,0.25)' : 'rgba(217,119,6,0.2)'};">
        <div class="stat-card-label">${b.type} Stock</div>
        <div class="stat-card-value" style="color:${statusColor[b.status]}">${b.units}</div>
        <div class="stat-card-delta" style="color:${statusColor[b.status]};">
          <i class="bi bi-exclamation-triangle-fill"></i> ${statusLabel[b.status]}
        </div>
        <button class="btn-hs-primary" style="width:100%;margin-top:10px;font-size:0.72rem;padding:6px 10px;" onclick="showPage('newrequest');quickSetBlood('${b.type}')">
          Request ${b.type}
        </button>
      </div>
    </div>
  `).join('');

  document.getElementById('inventoryFullGrid').innerHTML = bloodData.map(b => {
    const pct = Math.round((b.units / b.max) * 100);
    return `
      <div class="col-md-6 col-lg-3">
        <div style="background:var(--hs-bg2);border:1px solid var(--hs-border2);border-radius:9px;padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
            <span style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:${statusColor[b.status]}">${b.type}</span>
            <span class="inv-chip" style="background:${b.status === 'ok' ? 'var(--hs-green-bg)' : b.status === 'low' ? 'var(--hs-amber-bg)' : 'var(--hs-red-subtle)'};color:${statusColor[b.status]};">${statusLabel[b.status]}</span>
          </div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--hs-text);margin-bottom:2px;">${b.units} <span style="font-size:0.72rem;font-weight:400;color:var(--hs-text-3)">/ ${b.max}</span></div>
          <div style="height:5px;background:var(--hs-bg);border-radius:100px;overflow:hidden;margin-top:7px;">
            <div style="height:100%;width:${pct}%;background:${barColor[b.status]};border-radius:100px;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:5px;">
            <span style="font-size:0.62rem;color:var(--hs-text-3);">${pct}% capacity</span>
            <a href="#" style="font-size:0.62rem;color:var(--hs-red);font-weight:600;" onclick="showPage('newrequest');quickSetBlood('${b.type}');return false;">Request →</a>
          </div>
        </div>
      </div>`;
  }).join('');
}

function setNRUrgency(btn, level) {
  document.querySelectorAll('.urg-btn').forEach(b => b.className = 'urg-btn');
  const map = { Normal: 'an', Urgent: 'au', Critical: 'ac' };
  btn.classList.add(map[level]);
  currentUrgency = level;
  updateNRSummary();
}

function quickSetBlood(type) {
  document.getElementById('nrBloodType').value = type;
  updateNRSummary();
}

function updateNRSummary() {
  const blood = document.getElementById('nrBloodType').value;
  const units = document.getElementById('nrUnits').value;
  const comp = document.getElementById('nrComponent').value;
  const rows = [
    ['Blood Type', blood || '—'],
    ['Units', units || '0'],
    ['Component', comp],
    ['Urgency', currentUrgency],
    ['Hospital', hospUser.org],
    ['Est. Response', '~25 minutes'],
  ];

  document.getElementById('nrSummaryRows').innerHTML = rows.map(([label, val]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;border-bottom:1px solid var(--hs-border2);font-size:0.8rem;">
      <span style="color:var(--hs-text-3);">${label}</span>
      <span style="font-weight:500;color:var(--hs-text)">${val}</span>
    </div>`).join('');

  if (blood) {
    const entry = bloodData.find(b => b.type === blood);
    if (entry) {
      const pct = Math.round((entry.units / entry.max) * 100);
      document.getElementById('nrAvailPanel').innerHTML = `
        <div style="text-align:center;margin-bottom:10px;">
          <div style="font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:${statusColor[entry.status]}">${entry.type}</div>
          <div style="font-size:0.75rem;color:var(--hs-text-3);margin-top:2px;">${entry.units} units available</div>
        </div>
        <div style="height:6px;background:var(--hs-bg2);border-radius:100px;overflow:hidden;margin-bottom:7px;">
          <div style="height:100%;width:${pct}%;background:${barColor[entry.status]};border-radius:100px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--hs-text-3);margin-bottom:10px;">
          <span>${pct}% capacity</span><span>${entry.units} / ${entry.max}</span>
        </div>
        <div style="background:${entry.status === 'ok' ? 'var(--hs-green-bg)' : entry.status === 'low' ? 'var(--hs-amber-bg)' : 'var(--hs-red-subtle)'};border:1px solid ${entry.status === 'ok' ? 'rgba(22,163,74,0.18)' : entry.status === 'low' ? 'rgba(217,119,6,0.18)' : 'rgba(232,33,42,0.18)'};border-radius:7px;padding:9px 11px;text-align:center;">
          <div style="font-size:0.72rem;font-weight:700;color:${statusColor[entry.status]};text-transform:uppercase;letter-spacing:0.06em;">${statusLabel[entry.status]}</div>
          <div style="font-size:0.68rem;color:var(--hs-text-3);margin-top:2px;">${entry.status === 'ok' ? 'Stock sufficient' : 'Limited — may delay fulfillment'}</div>
        </div>`;
    }
  } else {
    document.getElementById('nrAvailPanel').innerHTML = `
      <div style="text-align:center;padding:14px;color:var(--hs-text-3);font-size:0.78rem;">
        <i class="bi bi-droplet" style="display:block;font-size:1.3rem;margin-bottom:6px;opacity:0.3;"></i>
        Select a blood type
      </div>`;
  }
}

function renderNRSummary() { updateNRSummary(); }

function submitNewRequest() {
  const blood = document.getElementById('nrBloodType').value;
  const units = document.getElementById('nrUnits').value;
  if (!blood || !units) { showToast('⚠️', 'Missing Fields', 'Please select blood type and units.'); return; }

  const id = 'REQ-' + Math.floor(1000 + Math.random() * 9000);
  const newReq = {
    id, blood, units, component: document.getElementById('nrComponent').value,
    patient: document.getElementById('nrPatient').value || 'Not specified', urgency: currentUrgency, status: 'pending', time: 'Just now'
  };
  allRequests.unshift(newReq);
  document.getElementById('pendingBadge').textContent = allRequests.filter(r => r.status === 'pending').length;
  showToast('✅', 'Request Submitted!', `${units} unit(s) of ${blood} — ID: ${id}`);
  clearNRForm();
  renderOverviewTable();
  renderAllRequests(allRequests);
  setTimeout(() => { newReq.status = 'approved'; renderOverviewTable(); renderAllRequests(allRequests); showToast('🏥', 'Request Approved', `${id} approved and dispatching.`); }, 6000);
}

function clearNRForm() {
  ['nrBloodType', 'nrUnits', 'nrPatient', 'nrWard', 'nrDoctor', 'nrNotes'].forEach(id => { document.getElementById(id).value = ''; });
  currentUrgency = 'Normal';
  document.querySelectorAll('.urg-btn').forEach(b => { b.className = 'urg-btn'; });
  document.querySelector('.urg-btn').classList.add('an');
  updateNRSummary();
}

function refreshData() { showToast('🔄', 'Refreshed', 'Dashboard data is up to date.'); }
function handleLogout() {
  apiLogout();  // clears tokens + redirects to index.html
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

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
  new bootstrap.Toast(document.getElementById(id), { delay: 4200 }).show();
  document.getElementById(id).addEventListener('hidden.bs.toast', () => document.getElementById(id)?.remove());
}

init();
