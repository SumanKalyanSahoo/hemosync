/* ═══════════════════════════════════════════════
   HemoSync — Individual Dashboard Logic
   ═══════════════════════════════════════════════ */

const params = new URLSearchParams(window.location.search);
const user = {
  name:      params.get('name')  || 'Arjun Sharma',
  email:     params.get('email') || 'user@gmail.com',
  bloodType: params.get('blood') || 'O+',
};

const bloodData = [
  { type:'A+',  units:84,  max:120, status:'ok'       },
  { type:'A−',  units:12,  max:80,  status:'low'      },
  { type:'B+',  units:67,  max:100, status:'ok'       },
  { type:'B−',  units:5,   max:60,  status:'critical' },
  { type:'AB+', units:31,  max:60,  status:'ok'       },
  { type:'AB−', units:8,   max:40,  status:'low'      },
  { type:'O+',  units:102, max:150, status:'ok'       },
  { type:'O−',  units:3,   max:60,  status:'critical' },
];

const statusLabel = { ok:'Available', low:'Low Stock', critical:'Critical' };
const statusColor = { ok:'var(--hs-green)', low:'var(--hs-amber)', critical:'var(--hs-red)' };
const barColor    = { ok:'var(--hs-green)', low:'var(--hs-amber)', critical:'var(--hs-red)' };

let allRequests = [
  { id:'REQ-2091', blood:'O+',  units:2, component:'PRBC',        patient:'Arjun Sharma', urgency:'Urgent',   status:'enroute', date:'Today, 10:24 AM' },
  { id:'REQ-1874', blood:'O+',  units:1, component:'Whole Blood', patient:'Arjun Sharma', urgency:'Normal',   status:'done',    date:'12 Mar 2025'     },
  { id:'REQ-1532', blood:'O+',  units:3, component:'Platelets',   patient:'Meena Sharma', urgency:'Critical', status:'done',    date:'05 Nov 2024'     },
  { id:'REQ-1201', blood:'O+',  units:2, component:'FFP',         patient:'Arjun Sharma', urgency:'Urgent',   status:'done',    date:'02 Aug 2024'     },
];

let contacts = [
  { name:'Suresh Sharma', rel:'Father',  phone:'+91 94251 83712', color:'#E8212A' },
  { name:'Kavita Sharma', rel:'Mother',  phone:'+91 98765 12340', color:'#3B82F6' },
  { name:'Dr. Asha Patel',rel:'Doctor',  phone:'+91 93001 44567', color:'#16A34A' },
];

let selectedBloodType = user.bloodType;
let reqUrgency = 'Normal';

function init() {
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  ['sideAvatar','topbarAvatar','profileAvatar'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = initials;
  });
  document.getElementById('sideName').textContent         = user.name;
  document.getElementById('topbarName').textContent       = user.name.split(' ')[0];
  document.getElementById('profileName').textContent      = user.name;
  document.getElementById('profileEmail').textContent     = user.email;
  document.getElementById('profileBloodBadge').textContent = user.bloodType;
  document.getElementById('reqAutoFillName').textContent  = user.name;
  document.getElementById('reqAutoFillBlood').textContent = user.bloodType;

  renderBloodTypePicker();
  renderFullHistoryTable(allRequests);
  renderContacts();
  updateReqSummary();
}

function showPage(id) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item-hs').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item-hs').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(`'${id}'`)) n.classList.add('active');
  });
  const titles = {
    request:'Request Blood', tracker:'Track Request', history:'Request History',
    contacts:'Emergency Contacts', profile:'My Profile'
  };
  document.getElementById('topbarTitle').textContent = titles[id] || id;
  document.getElementById('sidebar').classList.remove('open');
}

// ── BLOOD TYPE PICKER ──
function renderBloodTypePicker() {
  document.getElementById('bloodTypePicker').innerHTML = bloodData.map(b => `
    <div class="col-3">
      <div class="avail-card status-${b.status} ${b.type === selectedBloodType ? 'sel' : ''}" onclick="selectBloodType('${b.type}')">
        <div class="avail-type" style="color:${b.type === selectedBloodType ? 'var(--hs-red)' : statusColor[b.status]}">${b.type}</div>
        <div class="avail-units">${b.units} units</div>
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
  const entry = bloodData.find(b => b.type === selectedBloodType);
  if (!entry) return;
  const pct = Math.round((entry.units / entry.max) * 100);
  document.getElementById('reqAvailPanel').innerHTML = `
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;color:${statusColor[entry.status]}">${entry.type}</div>
      <div style="font-size:0.76rem;color:var(--hs-text-3);margin-top:2px;">${entry.units} units available</div>
    </div>
    <div style="height:6px;background:var(--hs-bg2);border-radius:100px;overflow:hidden;margin-bottom:7px;">
      <div style="height:100%;width:${pct}%;background:${barColor[entry.status]};border-radius:100px;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--hs-text-3);margin-bottom:10px;">
      <span>${pct}% capacity</span><span>${statusLabel[entry.status]}</span>
    </div>
    <div style="background:${entry.status==='ok'?'var(--hs-green-bg)':entry.status==='low'?'var(--hs-amber-bg)':'var(--hs-red-subtle)'};border:1px solid ${entry.status==='ok'?'rgba(22,163,74,0.18)':entry.status==='low'?'rgba(217,119,6,0.18)':'rgba(232,33,42,0.18)'};border-radius:7px;padding:9px;text-align:center;">
      <div style="font-size:0.72rem;font-weight:700;color:${statusColor[entry.status]};text-transform:uppercase;letter-spacing:0.06em;">${statusLabel[entry.status]}</div>
      <div style="font-size:0.68rem;color:var(--hs-text-3);margin-top:2px;">${entry.status==='ok'?'Adequate stock for your request':entry.status==='low'?'Limited — fulfillment may take longer':'Very low — consider SOS'}</div>
    </div>`;
}

// ── REQUEST SUMMARY ──
function updateReqSummary() {
  const units = document.getElementById('reqUnits')?.value;
  const comp  = document.getElementById('reqComponent')?.value;
  const rows = [
    ['Requested By', user.name],
    ['Blood Type',   selectedBloodType],
    ['Units',        units || '0'],
    ['Component',    comp || 'Whole Blood'],
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

function setReqUrgency(btn, level) {
  document.querySelectorAll('.urg-btn').forEach(b => b.className = 'urg-btn');
  const map = { Normal:'an', Urgent:'au', Critical:'ac' };
  btn.classList.add(map[level]);
  reqUrgency = level;
  updateReqSummary();
}

function submitRequest() {
  const units   = document.getElementById('reqUnits').value;
  const phone   = document.getElementById('reqPhone').value.trim();
  const address = document.getElementById('reqAddress').value.trim();

  if (!units || !phone || !address) {
    showToast('⚠️', 'Missing Fields', 'Please fill in units, contact number, and address.');
    return;
  }

  const id = 'REQ-' + Math.floor(2000 + Math.random() * 999);
  const req = {
    id, blood: selectedBloodType, units,
    component: document.getElementById('reqComponent').value,
    patient: document.getElementById('reqPatient').value || user.name,
    urgency: reqUrgency, status: 'pending',
    date: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) + ', Today',
  };
  allRequests.unshift(req);
  renderFullHistoryTable(allRequests);

  const badge = document.getElementById('activeReqBadge');
  badge.style.display = 'inline';
  badge.textContent = allRequests.filter(r => r.status !== 'done').length;

  showToast('✅', 'Request Submitted!', `${units} unit(s) of ${selectedBloodType} — ID: ${id}. Response within 30 min.`);
  clearReqForm();
  showPage('tracker');

  setTimeout(() => {
    req.status = 'approved';
    showToast('🏥', 'Request Approved', `${id} assigned to Central Blood Bank.`);
  }, 5000);
}

function clearReqForm() {
  ['reqUnits','reqPhone','reqAddress','reqPatient','reqNotes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  updateReqSummary();
}

// ── HISTORY TABLE ──
function renderFullHistoryTable(data) {
  document.getElementById('fullHistoryTable').innerHTML = data.map(r => `
    <tr>
      <td><span class="req-id">${r.id}</span></td>
      <td><span class="blood-pill">${r.blood}</span></td>
      <td style="color:var(--hs-text);font-weight:600;">${r.units}</td>
      <td style="font-size:0.76rem;color:var(--hs-text-2);">${r.component}</td>
      <td style="font-size:0.76rem;color:var(--hs-text-2);">${r.patient}</td>
      <td><span class="urgency-pill up-${r.urgency.toLowerCase()}">${r.urgency}</span></td>
      <td>${renderSB(r.status)}</td>
      <td style="font-size:0.7rem;color:var(--hs-text-3);">${r.date}</td>
      <td><button class="panel-action" style="font-size:0.68rem;" onclick="showToast('📋','${r.id}','Full detail view coming soon.')"><i class="bi bi-eye"></i></button></td>
    </tr>`).join('');
}

function filterHistory(val) {
  const filtered = val === 'all' ? allRequests : allRequests.filter(r => r.status === val);
  renderFullHistoryTable(filtered);
}

function renderSB(status) {
  const m = { pending:['sb-pending','Pending'], approved:['sb-approved','Approved'], enroute:['sb-enroute','En Route'], done:['sb-done','Done'] };
  const [cls, label] = m[status] || ['sb-pending', status];
  return `<span class="status-badge ${cls}">${label}</span>`;
}

// ── CONTACTS ──
function renderContacts() {
  document.getElementById('contactsList').innerHTML = contacts.map((c, i) => `
    <div class="contact-card">
      <div class="contact-avatar" style="background:${c.color}">${c.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <div style="flex:1;">
        <div class="contact-name">${c.name}</div>
        <div class="contact-rel">${c.rel}</div>
        <div class="contact-phone">${c.phone}</div>
      </div>
      <div class="contact-call" onclick="showToast('📞','Calling','Connecting to ${c.name}...')" title="Call">
        <i class="bi bi-telephone-fill" style="font-size:0.72rem;"></i>
      </div>
      <div class="contact-call" style="background:var(--hs-red-subtle);border-color:rgba(232,33,42,0.2);color:var(--hs-red);margin-left:4px;" onclick="removeContact(${i})" title="Remove">
        <i class="bi bi-trash" style="font-size:0.72rem;"></i>
      </div>
    </div>`).join('');
}

function showAddContact()  { document.getElementById('addContactPanel').style.display = 'block'; }
function hideAddContact()  { document.getElementById('addContactPanel').style.display = 'none'; }

function addContact() {
  const name  = document.getElementById('newContactName').value.trim();
  const rel   = document.getElementById('newContactRel').value;
  const phone = document.getElementById('newContactPhone').value.trim();
  if (!name || !phone) { showToast('⚠️','Missing Fields','Please fill in name and phone.'); return; }
  const colors = ['#E8212A','#3B82F6','#16A34A','#D97706','#8B5CF6'];
  contacts.push({ name, rel, phone, color: colors[contacts.length % colors.length] });
  renderContacts();
  hideAddContact();
  document.getElementById('newContactName').value = '';
  document.getElementById('newContactPhone').value = '';
  showToast('✅','Contact Added',`${name} added to your emergency contacts.`);
}

function removeContact(i) {
  contacts.splice(i, 1);
  renderContacts();
  showToast('🗑️','Contact Removed','Emergency contact removed.');
}

// ── PROFILE ──
function updateBloodTypeGlobal(val) {
  user.bloodType = val;
  document.getElementById('profileBloodBadge').textContent  = val;
  document.getElementById('reqAutoFillBlood').textContent   = val;
  selectedBloodType = val;
  renderBloodTypePicker();
  updateReqSummary();
}

function saveProfile() {
  const name = document.getElementById('profName').value.trim();
  if (name) {
    user.name = name;
    document.getElementById('sideName').textContent    = name;
    document.getElementById('topbarName').textContent  = name.split(' ')[0];
    document.getElementById('profileName').textContent = name;
    document.getElementById('reqAutoFillName').textContent = name;
    const ini = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    ['sideAvatar','topbarAvatar','profileAvatar'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = ini;
    });
  }
  showToast('✅','Profile Updated','Your details have been saved.');
}

// ── SOS ──
function triggerSOS() {
  showToast('🚨','SOS Sent!','Emergency blood request dispatched. Contacts notified. Help is on the way.');
  const req = {
    id: 'SOS-' + Math.floor(1000 + Math.random() * 999),
    blood: user.bloodType, units: 2, component: 'Whole Blood',
    patient: user.name, urgency: 'Critical', status: 'approved',
    date: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) + ', Today',
  };
  allRequests.unshift(req);
  renderFullHistoryTable(allRequests);
}

// ── LOGOUT ──
function handleLogout() {
  apiLogout();  // clears tokens + redirects to index.html
}

// ── MOBILE ──
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ── TOAST ──
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

init();
