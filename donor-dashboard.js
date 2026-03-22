/* ═══════════════════════════════════════════════
   HemoSync — Donor Dashboard Logic
   ═══════════════════════════════════════════════ */

const params = new URLSearchParams(window.location.search);
const donor = {
  name:      params.get('name')  || 'Priya Mehta',
  email:     params.get('email') || 'donor@gmail.com',
  bloodType: params.get('blood') || 'B+',
};

const donations = [
  { id:'DON-0841', blood:'B+', volume:'450 ml', component:'Whole Blood', centre:'Central Blood Bank, Indore',  date:'20 Jan 2025', status:'done'     },
  { id:'DON-0792', blood:'B+', volume:'450 ml', component:'Whole Blood', centre:'AIIMS Blood Centre, Indore',  date:'12 Oct 2024', status:'done'     },
  { id:'DON-0751', blood:'B+', volume:'450 ml', component:'Whole Blood', centre:'Red Cross Camp, Dewas',       date:'01 Jul 2024', status:'done'     },
  { id:'DON-0708', blood:'B+', volume:'450 ml', component:'Platelets',   centre:'Bombay Hospital Blood Bank',  date:'03 Apr 2024', status:'done'     },
  { id:'DON-0672', blood:'B+', volume:'450 ml', component:'Whole Blood', centre:'Central Blood Bank, Indore',  date:'10 Jan 2024', status:'done'     },
  { id:'DON-0641', blood:'B+', volume:'450 ml', component:'Whole Blood', centre:'City Care Blood Centre',      date:'25 Sep 2023', status:'done'     },
  { id:'DON-0601', blood:'B+', volume:'450 ml', component:'Whole Blood', centre:'Red Cross Camp, Indore',      date:'15 Apr 2023', status:'done'     },
  { id:'SCH-0001', blood:'B+', volume:'450 ml', component:'Whole Blood', centre:'Central Blood Bank, Indore',  date:'28 Apr 2025', status:'upcoming' },
];

const camps = [
  { day:'26', mon:'Apr', name:'Indore Blood Donation Drive', location:'MG Road, Indore',    time:'9 AM – 5 PM',  org:'Red Cross Society',   slots:'open', slotsLeft:'18 slots open' },
  { day:'28', mon:'Apr', name:'DAVV Campus Blood Camp',      location:'DAVV, Indore',        time:'10 AM – 4 PM', org:'NSS DAVV',             slots:'few',  slotsLeft:'4 slots left'  },
  { day:'03', mon:'May', name:'Corporate Blood Drive',       location:'Vijay Nagar',         time:'9 AM – 3 PM',  org:'HemoSync × Infosys',  slots:'open', slotsLeft:'30 slots open' },
  { day:'10', mon:'May', name:'Community Health Camp',       location:'Palasia, Indore',     time:'8 AM – 2 PM',  org:'City General Hosp.',  slots:'full', slotsLeft:'Waitlist only' },
  { day:'15', mon:'May', name:'National Blood Day Drive',    location:'Rajwada, Indore',     time:'7 AM – 6 PM',  org:'Govt. Blood Bank',    slots:'open', slotsLeft:'50+ slots'     },
  { day:'22', mon:'May', name:'Rotary Blood Donation Camp',  location:'Scheme 54',           time:'9 AM – 1 PM',  org:'Rotary Club Indore',  slots:'open', slotsLeft:'24 slots open' },
];

const badges = [
  { icon:'🩸', name:'First Drop',     desc:'Completed your first donation',    earned:'Apr 2023',    locked:false },
  { icon:'🔥', name:'On Fire',        desc:'3 consecutive donations',          earned:'Jan 2024',    locked:false },
  { icon:'⭐', name:'Life Saver',     desc:'Potentially saved 10+ lives',      earned:'Oct 2024',    locked:false },
  { icon:'🏅', name:'Gold Donor',     desc:'Reached 5 lifetime donations',     earned:'Jan 2025',    locked:false },
  { icon:'🎖️', name:'Streak Master', desc:'6 donation streak achieved',       earned:'Jan 2025',    locked:false },
  { icon:'🔬', name:'Platelet Hero',  desc:'Donated platelets via apheresis',  earned:'Apr 2024',    locked:false },
  { icon:'💎', name:'Platinum Donor', desc:'Reach 10 lifetime donations',      earned:'3 more left', locked:true  },
  { icon:'🏆', name:'Camp Champion',  desc:'Donated at 3 different camps',     earned:'1 more left', locked:true  },
];

let selectedDonType = 'Whole Blood';

function init() {
  const initials = donor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  ['sideAvatar','topbarAvatar','profileAvatar'].forEach(id => {
    const el = document.getElementById(id); if(el) el.textContent = initials;
  });
  document.getElementById('sideName').textContent         = donor.name;
  document.getElementById('sideBloodType').textContent    = donor.bloodType;
  document.getElementById('topbarName').textContent       = donor.name.split(' ')[0];
  document.getElementById('profileName').textContent      = donor.name;
  document.getElementById('profileEmail').textContent     = donor.email;
  document.getElementById('profileBloodPill').textContent = donor.bloodType;

  document.getElementById('schDate').min = new Date().toISOString().split('T')[0];

  renderFullDonTable();
  renderCampsGrid();
  renderBadgesGrid();
  updateSchSummary();
}

function showPage(id) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item-hs').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item-hs').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(`'${id}'`)) n.classList.add('active');
  });
  const titles = { schedule:'Schedule Donation', history:'Donation History', camps:'Nearby Camps', badges:'Badges & Rewards', profile:'My Profile' };
  document.getElementById('topbarTitle').textContent = titles[id] || id;
  document.getElementById('sidebar').classList.remove('open');
}

function renderFullDonTable() {
  document.getElementById('fullDonTable').innerHTML = donations.map(d => `
    <tr>
      <td><span class="don-id">${d.id}</span></td>
      <td><span class="blood-pill">${d.blood}</span></td>
      <td style="color:var(--hs-text);font-weight:500;">${d.volume}</td>
      <td style="color:var(--hs-text-2);font-size:0.76rem;">${d.component}</td>
      <td style="color:var(--hs-text-2);font-size:0.76rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.centre}</td>
      <td style="color:var(--hs-text-3);font-size:0.72rem;">${d.date}</td>
      <td><span class="don-status ${d.status==='done'?'ds-done':d.status==='upcoming'?'ds-upcoming':'ds-pending'}">${d.status==='done'?'Done':d.status==='upcoming'?'Upcoming':'Pending'}</span></td>
      <td>${d.status==='done'?`<button class="panel-action" style="font-size:0.68rem;" onclick="showToast('📄','Certificate','Downloading ${d.id} certificate...')"><i class="bi bi-download"></i></button>`:'—'}</td>
    </tr>`).join('');
}

function renderCampsGrid() {
  document.getElementById('campsGrid').innerHTML = camps.map(c => `
    <div class="col-md-6 col-lg-4">
      <div class="camp-card">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
          <div class="camp-date-box"><div class="camp-date-day">${c.day}</div><div class="camp-date-mon">${c.mon}</div></div>
          <div style="flex:1;">
            <div class="camp-name">${c.name}</div>
            <div class="camp-meta"><i class="bi bi-geo-alt me-1"></i>${c.location}</div>
            <div class="camp-meta"><i class="bi bi-clock me-1"></i>${c.time}</div>
            <div class="camp-meta"><i class="bi bi-building me-1"></i>${c.org}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span class="camp-slots slots-${c.slots}">${c.slotsLeft}</span>
          <button class="btn-hs-primary" style="padding:5px 12px;font-size:0.72rem;" onclick="${c.slots==='full' ? "showToast('⏳','Waitlist','You have been added to the waitlist.')" : `showPage('schedule');showToast('📍','Camp Selected','Booking at ${c.name}')`}">
            ${c.slots==='full'?'Join Waitlist':'Register'}
          </button>
        </div>
      </div>
    </div>`).join('');
}

function renderBadgesGrid() {
  document.getElementById('badgesGrid').innerHTML = badges.map(b => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="badge-card ${b.locked?'locked':''}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="badge-earned" style="color:${b.locked?'var(--hs-text-3)':'var(--hs-green)'};">
          ${b.locked?`🔒 ${b.earned}`:`✓ Earned ${b.earned}`}
        </div>
      </div>
    </div>`).join('');
}

// ── SCHEDULE ──
function selectDonType(type) {
  selectedDonType = type;
  const whole    = document.getElementById('dtWhole');
  const platelets = document.getElementById('dtPlatelets');
  if (type === 'Whole Blood') {
    whole.style.cssText    = 'background:var(--hs-red-subtle);border:1px solid var(--hs-red-border);border-radius:8px;padding:10px;cursor:pointer;text-align:center;';
    platelets.style.cssText = 'background:var(--hs-bg2);border:1px solid var(--hs-border);border-radius:8px;padding:10px;cursor:pointer;text-align:center;';
    whole.querySelector('div:nth-child(2)').style.color    = 'var(--hs-red)';
    platelets.querySelector('div:nth-child(2)').style.color = 'var(--hs-text-2)';
  } else {
    platelets.style.cssText = 'background:var(--hs-blue-bg);border:1px solid rgba(59,130,246,0.3);border-radius:8px;padding:10px;cursor:pointer;text-align:center;';
    whole.style.cssText    = 'background:var(--hs-bg2);border:1px solid var(--hs-border);border-radius:8px;padding:10px;cursor:pointer;text-align:center;';
    platelets.querySelector('div:nth-child(2)').style.color = 'var(--hs-blue)';
    whole.querySelector('div:nth-child(2)').style.color    = 'var(--hs-text-2)';
  }
  updateSchSummary();
}

function updateSchSummary() {
  const date   = document.getElementById('schDate').value;
  const time   = document.getElementById('schTime').value;
  const centre = document.getElementById('schCentre').value;
  const rows = [
    ['Donor',     donor.name],
    ['Blood Type', donor.bloodType],
    ['Date',      date   || '—'],
    ['Time',      time   || '—'],
    ['Centre',    centre || '—'],
    ['Type',      selectedDonType],
    ['Duration',  selectedDonType==='Whole Blood'?'~10 minutes':'~90 minutes'],
  ];
  document.getElementById('schSummaryRows').innerHTML = rows.map(([label, val]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;border-bottom:1px solid var(--hs-border2);font-size:0.8rem;">
      <span style="color:var(--hs-text-3);">${label}</span>
      <span style="font-weight:500;color:${label==='Blood Type'?'var(--hs-red)':'var(--hs-text)'}">${val}</span>
    </div>`).join('');
}

function submitSchedule() {
  const date   = document.getElementById('schDate').value;
  const time   = document.getElementById('schTime').value;
  const centre = document.getElementById('schCentre').value;
  if (!date || !time || !centre) { showToast('⚠️', 'Missing Fields', 'Please select date, time, and donation centre.'); return; }
  showToast('✅', 'Appointment Confirmed!', `Booked at ${centre.split(',')[0]} on ${date} at ${time}`);
  clearSchedule();
  showPage('history');
}

function clearSchedule() {
  document.getElementById('schDate').value = '';
  document.getElementById('schTime').value = '';
  document.getElementById('schCentre').value = '';
  document.getElementById('schNotes').value = '';
  updateSchSummary();
}

// ── PROFILE ──
function updateBloodType(val) {
  document.getElementById('sideBloodType').textContent    = val;
  document.getElementById('profileBloodPill').textContent = val;
  donor.bloodType = val;
}

function saveProfile() {
  const name = document.getElementById('profName').value.trim();
  if (name) {
    document.getElementById('sideName').textContent    = name;
    document.getElementById('topbarName').textContent  = name.split(' ')[0];
    document.getElementById('profileName').textContent = name;
    const ini = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    ['sideAvatar','topbarAvatar','profileAvatar'].forEach(id => {
      const el = document.getElementById(id); if(el) el.textContent = ini;
    });
  }
  showToast('✅', 'Profile Updated', 'Your donor profile has been saved.');
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
