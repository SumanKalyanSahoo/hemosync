/* ═══════════════════════════════════════════════
   HemoSync — Donor Dashboard (API-wired)
   Depends on: api-client.js loaded before this
   ═══════════════════════════════════════════════ */

if (!requireAuth()) { /* api-client.js redirects */ }
const sessionUser = Tokens.getUser();

// ── STATE ──────────────────────────────────────
let donations        = [];
let selectedDonType  = 'Whole Blood';

const camps = [
  { day:'26', mon:'Apr', name:'Indore Blood Donation Drive', location:'MG Road, Indore',    time:'9 AM – 5 PM',  org:'Red Cross Society',   slots:'open', slotsLeft:'18 slots open' },
  { day:'28', mon:'Apr', name:'DAVV Campus Blood Camp',      location:'DAVV, Indore',        time:'10 AM – 4 PM', org:'NSS DAVV',             slots:'few',  slotsLeft:'4 slots left'  },
  { day:'03', mon:'May', name:'Corporate Blood Drive',       location:'Vijay Nagar',         time:'9 AM – 3 PM',  org:'HemoSync × Infosys',  slots:'open', slotsLeft:'30 slots open' },
  { day:'10', mon:'May', name:'Community Health Camp',       location:'Palasia, Indore',     time:'8 AM – 2 PM',  org:'City General Hosp.',  slots:'full', slotsLeft:'Waitlist only' },
  { day:'15', mon:'May', name:'National Blood Day Drive',    location:'Rajwada, Indore',     time:'7 AM – 6 PM',  org:'Govt. Blood Bank',    slots:'open', slotsLeft:'50+ slots'     },
  { day:'22', mon:'May', name:'Rotary Blood Donation Camp',  location:'Scheme 54',           time:'9 AM – 1 PM',  org:'Rotary Club Indore',  slots:'open', slotsLeft:'24 slots open' },
];

const badges = [
  { icon:'🩸', name:'First Drop',     desc:'Completed your first donation',   locked:false },
  { icon:'🔥', name:'On Fire',        desc:'3 consecutive donations',         locked:false },
  { icon:'⭐', name:'Life Saver',     desc:'Potentially saved 10+ lives',     locked:false },
  { icon:'🏅', name:'Gold Donor',     desc:'Reached 5 lifetime donations',    locked:false },
  { icon:'🎖️', name:'Streak Master', desc:'6 donation streak achieved',      locked:false },
  { icon:'🔬', name:'Platelet Hero',  desc:'Donated platelets via apheresis', locked:false },
  { icon:'💎', name:'Platinum Donor', desc:'Reach 10 lifetime donations',     locked:true  },
  { icon:'🏆', name:'Camp Champion',  desc:'Donated at 3 different camps',    locked:true  },
];

// ── INIT ───────────────────────────────────────
async function init() {
  const user     = sessionUser || {};
  const name     = user.name   || 'Donor';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  setEl('sideAvatar',          initials);
  setEl('topbarAvatar',        initials);
  setEl('profileAvatar',       initials);
  setEl('sideName',            name);
  setEl('topbarName',          name.split(' ')[0]);
  setEl('profileName',         name);
  setEl('profileEmail',        user.email || '');
  setEl('profileBloodPill',    user.blood_type || '—');
  setEl('sideBloodType',       user.blood_type || '—');

  document.getElementById('schDate').min = new Date().toISOString().split('T')[0];

  await Promise.all([loadDonations(), loadProfile()]);
  renderCampsGrid();
  renderBadgesGrid();
  updateSchSummary();
}

async function loadProfile() {
  try {
    const res  = await apiRequest('/auth/me');
    if (!res) return;
    const json = await res.json();
    const user = json.data?.user;
    const prof = json.data?.profile;
    if (!user) return;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    setVal('profName',   user.name);
    setVal('profEmail',  user.email);

    const btEl = document.getElementById('profBloodType');
    if (btEl && user.blood_type) btEl.value = user.blood_type;

    if (prof) {
      setVal('profWeight', prof.weight_kg);
      if (prof.date_of_birth) setVal('profDob', prof.date_of_birth.split('T')[0]);
      const genderEl = document.getElementById('profGender');
      if (genderEl && prof.gender) genderEl.value = prof.gender;
    }

    // Sync stats
    const donated  = donations.filter(d => d.status === 'done').length;
    setEl('statTotal',  donated);
    setEl('statLives',  donated * 3);

    // Update session
    const updated = { ...sessionUser, name: user.name, blood_type: user.blood_type };
    Tokens.setUser(updated);

    const initials = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    setEl('sideAvatar',       initials);
    setEl('topbarAvatar',     initials);
    setEl('profileAvatar',    initials);
    setEl('sideName',         user.name);
    setEl('topbarName',       user.name.split(' ')[0]);
    setEl('profileName',      user.name);
    setEl('profileEmail',     user.email);
    setEl('profileBloodPill', user.blood_type || '—');
    setEl('sideBloodType',    user.blood_type || '—');
  } catch (e) { console.error('Profile load error', e); }
}

function setEl(id, val) {
  const el = document.getElementById(id); if (el) el.textContent = val;
}

// ── DONATIONS ──────────────────────────────────
async function loadDonations() {
  try {
    const res  = await apiRequest('/donations');
    if (!res) return;
    const json = await res.json();
    donations  = json.data || [];
    renderFullDonTable();
    updateDonStats();
    setEl('histBadge', donations.length);
  } catch (e) { console.error('Donations load failed', e); }
}

function updateDonStats() {
  const done     = donations.filter(d => d.status === 'done').length;
  const upcoming = donations.filter(d => d.status === 'scheduled').length;
  setEl('statTotal',   done);
  setEl('statLives',   done * 3);
  setEl('statUpcoming',upcoming);
}

function renderFullDonTable() {
  const tbody = document.getElementById('fullDonTable');
  if (!tbody) return;
  tbody.innerHTML = donations.length ? donations.map(d => `
    <tr>
      <td><span class="don-id">${d.donation_number}</span></td>
      <td><span class="blood-pill">${d.blood_type}</span></td>
      <td style="color:var(--hs-text);font-weight:500;">${d.volume_ml || 450} ml</td>
      <td style="color:var(--hs-text-2);font-size:0.76rem;">${d.donation_type}</td>
      <td style="color:var(--hs-text-2);font-size:0.76rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.centre_name}</td>
      <td style="color:var(--hs-text-3);font-size:0.72rem;">${d.appointment_date}</td>
      <td><span class="don-status ${d.status==='done'?'ds-done':d.status==='scheduled'?'ds-upcoming':'ds-pending'}">${d.status==='done'?'Done':d.status==='scheduled'?'Upcoming':'Cancelled'}</span></td>
      <td>${d.status==='done'
        ? `<button class="panel-action" style="font-size:0.68rem;" onclick="showToast('📄','Certificate','Downloading ${d.donation_number}...')"><i class="bi bi-download"></i></button>`
        : d.status==='scheduled'
          ? `<button class="panel-action" style="font-size:0.68rem;color:var(--hs-red);" onclick="cancelDonation('${d.id}')">Cancel</button>`
          : '—'}</td>
    </tr>`).join('') : `<tr><td colspan="8" style="padding:24px;text-align:center;color:var(--hs-text-3);font-size:0.82rem;"><i class="bi bi-inbox" style="display:block;font-size:1.4rem;margin-bottom:8px;opacity:0.4"></i>No donations yet — schedule your first one!</td></tr>`;
}

async function cancelDonation(id) {
  if (!confirm('Cancel this appointment?')) return;
  try {
    const res  = await apiRequest(`/donations/${id}`, { method: 'DELETE' });
    if (!res) return;
    const json = await res.json();
    if (json.success) { showToast('✅','Appointment Cancelled',''); await loadDonations(); }
    else showToast('❌','Error', json.message);
  } catch { showToast('❌','Error','Could not cancel appointment'); }
}

// ── SCHEDULE ───────────────────────────────────
function selectDonType(type) {
  selectedDonType = type;
  const whole    = document.getElementById('dtWhole');
  const platelets= document.getElementById('dtPlatelets');
  if (whole && platelets) {
    if (type === 'Whole Blood') {
      whole.style.cssText    = 'background:var(--hs-red-subtle);border:1px solid var(--hs-red-border);border-radius:8px;padding:10px;cursor:pointer;text-align:center;';
      platelets.style.cssText= 'background:var(--hs-bg2);border:1px solid var(--hs-border);border-radius:8px;padding:10px;cursor:pointer;text-align:center;';
      whole.querySelector('div:nth-child(2)').style.color    = 'var(--hs-red)';
      platelets.querySelector('div:nth-child(2)').style.color= 'var(--hs-text-2)';
    } else {
      platelets.style.cssText= 'background:var(--hs-blue-bg);border:1px solid rgba(59,130,246,0.3);border-radius:8px;padding:10px;cursor:pointer;text-align:center;';
      whole.style.cssText    = 'background:var(--hs-bg2);border:1px solid var(--hs-border);border-radius:8px;padding:10px;cursor:pointer;text-align:center;';
      platelets.querySelector('div:nth-child(2)').style.color= 'var(--hs-blue)';
      whole.querySelector('div:nth-child(2)').style.color    = 'var(--hs-text-2)';
    }
  }
  updateSchSummary();
}

function updateSchSummary() {
  const date   = document.getElementById('schDate')?.value;
  const time   = document.getElementById('schTime')?.value;
  const centre = document.getElementById('schCentre')?.value;
  const rows   = [
    ['Donor',     sessionUser?.name || ''],
    ['Blood Type', sessionUser?.blood_type || '—'],
    ['Date',      date   || '—'],
    ['Time',      time   || '—'],
    ['Centre',    centre || '—'],
    ['Type',      selectedDonType],
    ['Duration',  selectedDonType === 'Whole Blood' ? '~10 minutes' : '~90 minutes'],
  ];
  const el = document.getElementById('schSummaryRows');
  if (el) el.innerHTML = rows.map(([l, v]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 18px;border-bottom:1px solid var(--hs-border2);font-size:0.8rem;">
      <span style="color:var(--hs-text-3);">${l}</span>
      <span style="font-weight:500;color:${l==='Blood Type'?'var(--hs-red)':'var(--hs-text)'}">${v}</span>
    </div>`).join('');
}

async function submitSchedule() {
  const date   = document.getElementById('schDate')?.value;
  const time   = document.getElementById('schTime')?.value;
  const centre = document.getElementById('schCentre')?.value;
  const notes  = document.getElementById('schNotes')?.value;

  if (!date || !time || !centre) {
    showToast('⚠️', 'Missing Fields', 'Please select date, time, and donation centre.');
    return;
  }

  const btn = document.querySelector('#page-schedule .btn-hs-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Booking...'; }

  try {
    const res  = await apiRequest('/donations', {
      method: 'POST',
      body:   JSON.stringify({
        centre_name:      centre,
        appointment_date: date,
        appointment_time: time,
        donation_type:    selectedDonType,
        health_notes:     notes || undefined,
      }),
    });
    if (!res) return;
    const json = await res.json();
    if (!json.success) { showToast('❌', 'Error', json.message); return; }

    showToast('✅', 'Appointment Confirmed!', `Booked at ${centre.split(',')[0]} on ${date} at ${time}`);
    clearSchedule();
    await loadDonations();
    showPage('history');
  } catch { showToast('❌', 'Error', 'Could not book appointment'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-calendar-check"></i> Confirm Appointment'; } }
}

function clearSchedule() {
  ['schDate','schTime','schCentre','schNotes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  updateSchSummary();
}

// ── CAMPS ──────────────────────────────────────
function renderCampsGrid() {
  const el = document.getElementById('campsGrid');
  if (!el) return;
  el.innerHTML = camps.map(c => `
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
          <button class="btn-hs-primary" style="padding:5px 12px;font-size:0.72rem;"
            onclick="${c.slots==='full'
              ? "showToast('⏳','Waitlist','You have been added to the waitlist.')"
              : `showPage('schedule');document.getElementById('schCentre').value='${c.name}';updateSchSummary();showToast('📍','Camp Selected','Centre pre-filled in the form.')`}">
            ${c.slots==='full'?'Join Waitlist':'Register'}
          </button>
        </div>
      </div>
    </div>`).join('');
}

// ── BADGES ─────────────────────────────────────
function renderBadgesGrid() {
  const el = document.getElementById('badgesGrid');
  if (!el) return;
  el.innerHTML = badges.map(b => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="badge-card ${b.locked?'locked':''}">
        <div class="badge-icon">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="badge-earned" style="color:${b.locked?'var(--hs-text-3)':'var(--hs-green)'};">
          ${b.locked ? '🔒 Locked' : '✓ Earned'}
        </div>
      </div>
    </div>`).join('');
}

// ── PROFILE ────────────────────────────────────
async function saveProfile() {
  const name   = document.getElementById('profName')?.value.trim();
  const blood  = document.getElementById('profBloodType')?.value;
  const weight = document.getElementById('profWeight')?.value;
  const btn    = document.querySelector('#page-profile .btn-hs-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    // Update base user
    const res1 = await apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, blood_type: blood }),
    });
    // Update donor profile
    const res2 = await apiRequest('/users/me/donor-profile', {
      method: 'PATCH',
      body: JSON.stringify({ weight_kg: weight ? parseFloat(weight) : undefined }),
    });

    if (!res1 || !res2) return;
    const json1 = await res1.json();
    if (!json1.success) { showToast('❌','Error', json1.message); return; }

    const updated = { ...sessionUser, name: json1.data.name, blood_type: json1.data.blood_type };
    Tokens.setUser(updated);
    setEl('sideName',       updated.name);
    setEl('topbarName',     updated.name.split(' ')[0]);
    setEl('profileName',    updated.name);
    setEl('profileBloodPill', updated.blood_type);
    setEl('sideBloodType',  updated.blood_type);
    showToast('✅','Profile Updated','Your donor profile has been saved.');
  } catch { showToast('❌','Error','Could not save profile'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg"></i> Save Changes'; } }
}

function updateBloodType(val) {
  setEl('sideBloodType',    val);
  setEl('profileBloodPill', val);
}

// ── HELPERS ────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item-hs').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelectorAll('.nav-item-hs').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${id}'`)) n.classList.add('active');
  });
  const titles = { schedule:'Schedule Donation', history:'Donation History', camps:'Nearby Camps', badges:'Badges & Rewards', profile:'My Profile' };
  setEl('topbarTitle', titles[id] || id);
  document.getElementById('sidebar')?.classList.remove('open');

  if (id === 'history')  loadDonations();
  if (id === 'schedule') { updateSchSummary(); }
  if (id === 'camps')    renderCampsGrid();
  if (id === 'badges')   renderBadgesGrid();
}

function handleLogout() { apiLogout(); }
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }

init();
