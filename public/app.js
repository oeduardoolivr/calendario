// v1.1.9 - Robson Protection & Data Clearing
// ============================================================
// CONFIG & STATE
// ============================================================
const YEARS = [2026, 2027, 2028, 2029, 2030];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

let SECTORS = [];
let calData = {};
let adminMode = false;
let currentUser = "";
let currentDisplayName = "";
let currentDepartment = "";
let currentIsAdmin = false;
let authCredentials = "";

const now = new Date();
let currentYear = now.getFullYear();
if (!YEARS.includes(currentYear)) { currentYear = 2026; }
let currentMonth = now.getMonth() + 1;
let editingDate = null;
let activeFilters = []; // Array to store multiple active sector key filters

const todayStr = new Date().toISOString().split('T')[0];

// ============================================================
// STORAGE & SESSION
// ============================================================
function saveSession() {
  const session = {
    user: currentUser,
    displayName: currentDisplayName,
    department: currentDepartment,
    isAdmin: currentIsAdmin,
    auth: authCredentials
  };
  localStorage.setItem('azul_session', JSON.stringify(session));
}

function loadSession() {
  const saved = localStorage.getItem('azul_session');
  if (saved) {
    try {
      const session = JSON.parse(saved);
      currentUser = session.user;
      currentDisplayName = session.displayName;
      currentDepartment = session.department;
      currentIsAdmin = session.isAdmin;
      authCredentials = session.auth;
      if (currentUser && authCredentials) {
        adminMode = true;
        document.body.classList.add('admin-mode');
        adminBtn.classList.add('active');
      }
    } catch (e) { localStorage.removeItem('azul_session'); }
  }
}

function clearSession() { localStorage.removeItem('azul_session'); }

// ============================================================
// ELEMENTS
// ============================================================
const yearNav = document.getElementById('yearNav');
const monthNav = document.getElementById('monthNav');
const calGrid = document.getElementById('calGrid');
const monthTitle = document.getElementById('monthTitle');
const adminBtn = document.getElementById('adminBtn');
const adminDropdown = document.getElementById('adminDropdown');
const viewLogsBtn = document.getElementById('viewLogsBtn');
const toggleLegend = document.getElementById('toggleLegend');
const legendContent = document.getElementById('legendContent');

const loginModal = document.getElementById('loginModal');
const closeLoginBtn = document.getElementById('closeLoginBtn');
const userInput = document.getElementById('userInput');
const pwInput = document.getElementById('pwInput');
const loginErr = document.getElementById('loginErr');

const dayModal = document.getElementById('dayModal');
const adminSectorSection = document.getElementById('adminSectorSection');
const sectorSelect = document.getElementById('sectorSelect');
const editDateLabel = document.getElementById('editDateLabel');
const editCurrentSector = document.getElementById('editCurrentSector');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const sendCommentBtn = document.getElementById('sendComment');

const logsModal = document.getElementById('logsModal');
const logsList = document.getElementById('logsList');

const settingsModal = document.getElementById('settingsModal');
const usersList = document.getElementById('usersList');
const adminOnlySettings = document.getElementById('adminOnlySettings');
const robsonOnlySettings = document.getElementById('robsonOnlySettings');
const sectorsManagementList = document.getElementById('sectorsManagementList');

const resetModal = document.getElementById('resetModal');
const resetPwInput = document.getElementById('resetPwInput');
const resetErr = document.getElementById('resetErr');

// ============================================================
// DATA FETCHING
// ============================================================
async function fetchSectors() {
  try {
    const response = await fetch('/api/sectors');
    if (response.ok) {
      SECTORS = await response.json();
      injectSectorStyles();
      updateSectorDropdown();
      renderLegend();
      renderCalendar();
    }
  } catch (error) { console.error("Erro ao buscar setores:", error); }
}

async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (response.ok) {
      calData = await response.json();
      renderCalendar();
    }
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    toast("❌ Erro ao carregar dados");
  }
}

// ============================================================
// DYNAMIC STYLES & UI
// ============================================================
function injectSectorStyles() {
  const styleTag = document.getElementById('dynamic-sector-styles');
  let css = '';
  SECTORS.forEach(s => {
    css += `
      .day-cell[data-sector="${s.key}"] { background-color: ${s.color} !important; border-color: rgba(255,255,255,0.2) !important; }
      .legend-item[data-sector="${s.key}"] { background-color: ${s.color} !important; }
    `;
  });
  styleTag.innerHTML = css;
}

function updateSectorDropdown() {
  const currentVal = sectorSelect.value;
  sectorSelect.innerHTML = '<option value="">— Nenhum (dia livre) —</option>' + 
    SECTORS.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  sectorSelect.value = currentVal;
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 85%, 70%)`;
}

// ============================================================
// RENDER CALENDAR & NAV
// ============================================================
function renderNav() {
  yearNav.innerHTML = YEARS.map(y => 
    `<button class="year-tab${y === currentYear ? ' active' : ''}" onclick="switchYear(${y})">${y}</button>`
  ).join('');

  monthNav.innerHTML = MONTH_NAMES.map((name, index) => {
    const mNum = index + 1;
    return `<button class="month-tab${mNum === currentMonth ? ' active' : ''}" onclick="switchMonth(${mNum})">${name.substring(0, 3)}</button>`;
  }).join('');
}

function renderCalendar() {
  monthTitle.innerHTML = `${MONTH_NAMES[currentMonth - 1]} <span>${currentYear}</span>`;
  calGrid.innerHTML = '';
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'day-cell other-month';
    calGrid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const sector = calData[dateStr] || '';
    const isToday = dateStr === todayStr;
    const dow = new Date(currentYear, currentMonth - 1, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const sInfo = SECTORS.find(s => s.key === sector);
    const tagLabel = sInfo ? sInfo.label : (sector === 'Feriado' ? 'Feriado' : '');
    const isFeriado = sector === 'Feriado';

    // Advanced Multi-Filter Logic
    let isFilteredOut = false;
    if (activeFilters.length > 0) {
      const match = activeFilters.some(f => {
        if (f === "Empty") return sector === "";
        return sector === f;
      });
      isFilteredOut = !match;
    }

    const cell = document.createElement('div');
    cell.className = [
      'day-cell', 
      isToday ? 'today' : '', 
      isWeekend ? 'weekend-cell' : '', 
      isFeriado ? 'feriado-cell' : '',
      isFilteredOut ? 'filtered-out' : ''
    ].filter(Boolean).join(' ');
    
    // On mobile, completely hide if filtered out
    if (isFilteredOut && window.innerWidth <= 768) {
      cell.style.display = 'none';
    }

    cell.dataset.date = dateStr;
    cell.dataset.sector = sector;
    const weekdaysMin = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    cell.innerHTML = `<div class="date-box"><div class="day-num">${d}</div><div class="day-name-mobile">${weekdaysMin[dow]}</div></div><div class="sector-tag ${tagLabel ? '' : 'empty'}">${tagLabel}</div>`;
    cell.onclick = () => { openDayDetails(dateStr, sector); };
    calGrid.appendChild(cell);
  }
  renderLegend();
}

function renderLegend() {
  const leg = document.getElementById('legend');
  const allSectors = [...SECTORS, { key: "Empty", label: "Sem Inventário" }];
  
  leg.innerHTML = allSectors.map(s => {
    const isActive = activeFilters.includes(s.key);
    return `<div class="legend-item ${isActive ? 'filter-active' : ''}" 
                 data-sector="${s.key}" 
                 onclick="toggleFilter('${s.key}')">
      <div class="legend-dot"></div>
      ${s.label}
    </div>`;
  }).join('');
}

function toggleFilter(sectorKey) {
  const index = activeFilters.indexOf(sectorKey);
  if (index > -1) {
    activeFilters.splice(index, 1); // Remove if already filtered
  } else {
    activeFilters.push(sectorKey); // Add new filter
  }
  renderCalendar();
}

function switchYear(year) { currentYear = year; renderNav(); renderCalendar(); }
function switchMonth(month) { currentMonth = month; renderNav(); renderCalendar(); }

// ============================================================
// DAY DETAILS & COMMENTS
// ============================================================
async function openDayDetails(dateStr, currentSector) {
  editingDate = dateStr;
  const [y, m, d] = dateStr.split('-');
  const weekdaysArr = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const dateObj = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
  editDateLabel.textContent = `${weekdaysArr[dateObj.getDay()]}, ${parseInt(d)} de ${MONTH_NAMES[parseInt(m)-1]} de ${y}`;
  
  if (currentIsAdmin) {
    adminSectorSection.style.display = 'block';
    const sInfo = SECTORS.find(s => s.key === currentSector);
    editCurrentSector.innerHTML = `Setor atual: <span>${sInfo ? sInfo.label : (currentSector || 'Nenhum')}</span>`;
    sectorSelect.value = currentSector || '';
  } else { adminSectorSection.style.display = 'none'; }

  const chatInputArea = document.querySelector('.chat-input-wrap');
  if (currentUser) {
    chatInputArea.style.display = 'flex';
    const hint = document.getElementById('chatLoginHint');
    if (hint) hint.remove();
  } else {
    chatInputArea.style.display = 'none';
    if (!document.getElementById('chatLoginHint')) {
      const loginHint = document.createElement('p');
      loginHint.id = 'chatLoginHint';
      loginHint.style.cssText = 'font-size: 12px; color: var(--muted); text-align: center; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 10px; border: 1px dashed var(--border); transition: all 0.2s; cursor: pointer;';
      loginHint.innerHTML = '🔒 Faça login para adicionar uma observação';
      loginHint.onclick = () => { closeModal('dayModal'); openModal('loginModal'); setTimeout(() => userInput.focus(), 100); };
      chatInputArea.parentNode.appendChild(loginHint);
    }
  }
  commentsList.innerHTML = '<p style="color:var(--muted); font-size:12px;">Carregando observações...</p>';
  openModal('dayModal');
  fetchComments(dateStr);
}

async function fetchComments(date) {
  try {
    const response = await fetch(`/api/comments?date=${date}`, { headers: { 'Authorization': authCredentials } });
    if (response.ok) { renderComments(await response.json()); }
  } catch (e) { commentsList.innerHTML = '<p style="color:#ff7a78; font-size:12px;">Erro ao carregar observações.</p>'; }
}

function renderComments(comments) {
  if (comments.length === 0) {
    commentsList.innerHTML = '<p style="color:var(--muted); font-size:13px; text-align:center; margin: 20px 0;">Nenhuma observação para este dia.</p>';
    return;
  }
  commentsList.innerHTML = comments.map(c => {
    const isOwn = c.user.toLowerCase().includes(currentUser.toLowerCase()) || (currentDisplayName && c.user.toLowerCase().includes(currentDisplayName.toLowerCase()));
    const time = new Date(c.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userColor = stringToColor(c.user);
    const isDeleted = !!c.isDeleted;
    let content = c.text;
    if (isDeleted) {
      content = `<div class="deleted-notice">🚫 Apagado pelo administrador</div>
        ${currentIsAdmin ? `<button class="btn-reveal" onclick="toggleOriginalText(this)">Ver mensagem original</button><div class="original-content">${c.text}</div>` : ''}`;
    }
    const deleteBtn = (currentIsAdmin && !isDeleted) ? `<button class="btn-delete-comment" onclick="deleteComment('${editingDate}', '${c.timestamp}')" title="Apagar comentário">🗑️</button>` : '';
    return `<div class="comment-item ${isOwn ? 'own' : ''} ${isDeleted ? 'deleted' : ''}">
        <div class="comment-meta"><strong style="color: ${userColor}">${c.user}</strong> • ${time} ${deleteBtn}</div>
        <div class="comment-bubble">${content}</div>
      </div>`;
  }).join('');
  commentsList.scrollTop = commentsList.scrollHeight;
}

async function deleteComment(date, timestamp) {
  if (!confirm("Deseja marcar este comentário como apagado?")) return;
  try {
    const response = await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, timestamp })
    });
    if (response.ok) { fetchComments(date); toast('✅ Comentário ocultado'); }
  } catch (e) { toast('❌ Erro de conexão'); }
}

function toggleOriginalText(btn) {
  const content = btn.nextElementSibling;
  content.classList.toggle('visible');
  btn.textContent = content.classList.contains('visible') ? 'Ocultar mensagem original' : 'Ver mensagem original';
}

async function sendComment() {
  const text = commentInput.value.trim();
  if (!text || !editingDate) return;
  try {
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authCredentials },
      body: JSON.stringify({ date: editingDate, text: text })
    });
    if (response.ok) { commentInput.value = ''; fetchComments(editingDate); }
  } catch (e) { toast("❌ Erro de conexão"); }
}

// ============================================================
// AUTH & ADMIN & SETTINGS
// ============================================================
async function doLogin() {
  const user = userInput.value.trim().toLowerCase();
  const pw = pwInput.value;
  if (!user || !pw) return;
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username: user, password: pw })
    });
    const result = await response.json();
    if (result.success) {
      currentUser = result.username;
      currentDisplayName = result.displayName || "";
      currentDepartment = result.department || "";
      currentIsAdmin = result.isAdmin;
      authCredentials = btoa(`${user}:${pw}`);
      saveSession();
      if (pw === '1234') { closeModal('loginModal'); resetErr.textContent = ''; openModal('resetModal'); return; }
      adminMode = true;
      document.body.classList.add('admin-mode');
      adminBtn.classList.add('active');
      loginErr.textContent = ''; userInput.value = ''; pwInput.value = '';
      closeModal('loginModal');
      toast(`✅ Bem-vindo, ${currentDisplayName || currentUser}`);
      renderCalendar();
    } else { loginErr.textContent = result.message || 'Usuário ou senha incorretos'; }
  } catch (e) { loginErr.textContent = 'Erro de conexão'; }
}

async function doResetPassword() {
  const newPw = resetPwInput.value;
  if (!newPw || newPw === '1234') { resetErr.textContent = 'Escolha uma senha diferente de 1234'; return; }
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'changePassword', newPassword: newPw })
    });
    if (response.ok) {
      const user = atob(authCredentials).split(':')[0];
      authCredentials = btoa(`${user}:${newPw}`);
      saveSession();
      adminMode = true;
      document.body.classList.add('admin-mode');
      adminBtn.classList.add('active');
      closeModal('resetModal'); resetPwInput.value = '';
      toast(`✅ Senha alterada! Bem-vindo, ${currentDisplayName || currentUser}`);
      renderCalendar();
    } else { const txt = await response.text(); resetErr.textContent = `Erro ao salvar: ${txt}`; }
  } catch (e) { resetErr.textContent = 'Erro de conexão'; }
}

function doLogout() {
  adminMode = false; currentUser = ""; currentDisplayName = ""; currentDepartment = ""; currentIsAdmin = false; authCredentials = "";
  clearSession();
  document.body.classList.remove('admin-mode');
  adminBtn.classList.remove('active');
  adminDropdown.classList.remove('open');
  toast('Sessão encerrada');
  renderCalendar();
}

function openAdmin() {
  if (adminMode) { adminDropdown.classList.toggle('open'); }
  else { openModal('loginModal'); setTimeout(() => userInput.focus(), 100); }
}

async function openSettings() {
  adminDropdown.classList.remove('open');
  document.getElementById('profileName').value = currentDisplayName;
  document.getElementById('profileDept').value = currentDepartment;
  adminOnlySettings.style.display = currentIsAdmin ? 'block' : 'none';
  robsonOnlySettings.style.display = (currentUser === 'robson') ? 'block' : 'none';
  if (currentIsAdmin) { fetchUsers(); renderSectorsManagement(); }
  openModal('settingsModal');
}

async function saveProfile() {
  const name = document.getElementById('profileName').value.trim();
  const dept = document.getElementById('profileDept').value.trim();
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateProfile', displayName: name, department: dept })
    });
    if (response.ok) { currentDisplayName = name; currentDepartment = dept; saveSession(); toast('✅ Perfil atualizado'); }
  } catch (e) { toast('❌ Erro de conexão'); }
}

async function changeMyLogin() {
  const newLogin = document.getElementById('myNewLogin').value.trim().toLowerCase();
  if (!newLogin || newLogin === currentUser) { toast('⚠️ Digite um login diferente'); return; }
  if (currentUser === 'robson') { toast('❌ O usuário robson não pode ser renomeado'); return; }
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateUsername', targetUser: currentUser, newUsername: newLogin })
    });
    if (response.ok) {
      const [_, pw] = atob(authCredentials).split(':');
      currentUser = newLogin; authCredentials = btoa(`${currentUser}:${pw}`);
      saveSession();
      document.getElementById('myNewLogin').value = "";
      toast(`✅ Login alterado para "${currentUser}"`);
      renderCalendar();
    } else { const msg = await response.text(); toast(`❌ Erro: ${msg}`); }
  } catch (e) { toast('❌ Erro de conexão'); }
}

async function fetchUsers() {
  usersList.innerHTML = '<p>Carregando...</p>';
  try {
    const response = await fetch('/api/users', { headers: { 'Authorization': authCredentials } });
    if (response.ok) { renderUsersList(await response.json()); }
  } catch (e) { toast('❌ Erro ao buscar usuários'); }
}

function renderUsersList(users) {
  usersList.innerHTML = users.map(u => `
    <div class="user-item">
      <div class="user-info"><span class="user-name">${u.username}</span><span class="role-badge ${u.isAdmin ? 'role-admin' : 'role-user'}">${u.isAdmin ? 'Admin' : 'Usuário'}</span></div>
      <div class="user-actions">
        ${u.username !== currentUser ? `
          ${u.username !== 'robson' ? `<button class="btn-icon" onclick="renameUser('${u.username}')" title="Alterar Login">✏️</button>` : ''}
          <button class="btn-icon" onclick="resetUserPassword('${u.username}')" title="Resetar para 1234">🔑</button>
          ${u.username !== 'robson' ? `<button class="btn-icon" onclick="toggleUserRole('${u.username}', ${u.isAdmin})">🛡️</button>` : ''}
          ${u.username !== 'robson' ? `<button class="btn-icon danger" onclick="deleteUser('${u.username}')">🗑️</button>` : ''}
        ` : ''}
      </div>
    </div>
  `).join('');
}

async function renameUser(target) {
  if (target === 'robson') { toast('❌ Robson não pode ser renomeado'); return; }
  const newLogin = prompt(`Digite o novo login para "${target}":`);
  if (!newLogin || newLogin.trim() === "" || newLogin.trim().toLowerCase() === target.toLowerCase()) return;
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateUsername', targetUser: target, newUsername: newLogin.trim() })
    });
    if (response.ok) { toast(`✅ Usuário renomeado`); fetchUsers(); }
    else { const msg = await response.text(); toast(`❌ Erro: ${msg}`); }
  } catch (e) { toast('❌ Erro de conexão'); }
}

async function resetUserPassword(target) {
  if (!confirm(`Resetar a senha de ${target} para "1234"?`)) return;
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'changePassword', targetUser: target, newPassword: '1234' })
    });
    if (response.ok) { toast(`✅ Senha resetada`); }
  } catch (e) { toast('❌ Erro de conexão'); }
}

async function toggleUserRole(target, wasAdmin) {
  if (target === 'robson') return;
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateRole', targetUser: target, isAdmin: !wasAdmin })
  });
  if (response.ok) { fetchUsers(); toast('Privilégio atualizado'); }
}

async function deleteUser(target) {
  if (target === 'robson') return;
  if (!confirm(`Excluir ${target}?`)) return;
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', targetUser: target })
  });
  if (response.ok) { fetchUsers(); toast('Usuário removido'); }
}

async function createUser() {
  const login = document.getElementById('newUserName').value.trim().toLowerCase();
  const name = document.getElementById('newRealName').value.trim();
  const dept = document.getElementById('newDept').value.trim();
  if (!login || !name || !dept) { toast('⚠️ Preencha todos os campos'); return; }
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', username: login, displayName: name, department: dept })
    });
    if (response.ok) {
      document.getElementById('newUserName').value = ""; document.getElementById('newRealName').value = ""; document.getElementById('newDept').value = "";
      fetchUsers(); toast('✅ Usuário criado (Senha: 1234)');
    } else { const txt = await response.text(); toast(`❌ Erro: ${txt}`); }
  } catch (e) { toast('❌ Erro de conexão'); }
}

function renderSectorsManagement() {
  sectorsManagementList.innerHTML = SECTORS.map((s, index) => `
    <div class="user-item" style="gap: 10px;">
      <input type="color" value="${s.color}" onchange="updateSectorColor(${index}, this.value)" style="width: 30px; height: 30px; padding: 0; border: none; background: none; cursor: pointer; flex-shrink: 0;">
      <input type="text" value="${s.label}" onchange="updateSectorLabel(${index}, this.value)" style="flex: 1; padding: 4px 8px; font-size: 13px; margin-bottom: 0 !important;">
      <button class="btn-icon danger" onclick="removeSector(${index})">🗑️</button>
    </div>
  `).join('');
}

async function updateSectorColor(index, newColor) { SECTORS[index].color = newColor; saveSectors(); }
async function updateSectorLabel(index, newLabel) { if (!newLabel.trim()) return; SECTORS[index].label = newLabel.trim(); SECTORS[index].key = newLabel.trim(); saveSectors(); }
async function removeSector(index) { if (!confirm("Excluir este setor?")) return; SECTORS.splice(index, 1); saveSectors(); }
async function addSector() {
  const name = document.getElementById('newSectorName').value.trim();
  const color = document.getElementById('newSectorColor').value;
  if (!name) { toast('⚠️ Dê um nome ao setor'); return; }
  SECTORS.push({ key: name, label: name, color: color });
  document.getElementById('newSectorName').value = '';
  saveSectors();
}

async function saveSectors() {
  try {
    const response = await fetch('/api/sectors', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify(SECTORS)
    });
    if (response.ok) { injectSectorStyles(); updateSectorDropdown(); renderLegend(); renderCalendar(); renderSectorsManagement(); toast('✅ Setores atualizados'); }
  } catch (e) { toast('❌ Erro ao salvar setores'); }
}

async function saveNewPassword() {
  const newPw = document.getElementById('newPassword').value;
  if (!newPw) return;
  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'changePassword', newPassword: newPw })
    });
    if (response.ok) {
      document.getElementById('newPassword').value = ""; toast('Senha alterada');
      const user = atob(authCredentials).split(':')[0];
      authCredentials = btoa(`${user}:${newPw}`);
      saveSession();
    }
  } catch (e) { toast('❌ Erro de conexão'); }
}

async function clearAllData() {
  const confirmPw = prompt("⚠️ AÇÃO IRREVERSÍVEL! Digite a senha mestre para limpar todos os dados:");
  if (!confirmPw) return;
  try {
    const response = await fetch('/api/clear', {
      method: 'POST',
      headers: { 'Authorization': authCredentials, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clearAll', confirmPassword: confirmPw })
    });
    if (response.ok) {
      toast('✅ Todos os dados foram limpos com sucesso');
      fetchData(); // Reload empty calendar
    } else {
      const msg = await response.text();
      toast(`❌ Erro: ${msg}`);
    }
  } catch (e) { toast('❌ Erro de conexão'); }
}

// ============================================================
// CALENDAR ACTIONS
// ============================================================
async function saveEdit() {
  const newSector = sectorSelect.value;
  const oldSector = calData[editingDate] || "";
  if (newSector === oldSector) { closeModal('dayModal'); return; }
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authCredentials },
      body: JSON.stringify({ date: editingDate, sector: newSector, user: currentUser, oldSector: oldSector })
    });
    if (response.ok) { calData[editingDate] = newSector; closeModal('dayModal'); renderCalendar(); toast(`✅ Calendário atualizado`); }
  } catch (error) { toast("❌ Erro de conexão"); }
}

async function viewLogs() {
  logsList.innerHTML = '<p>Carregando...</p>';
  openModal('logsModal');
  try {
    const response = await fetch('/api/logs');
    if (response.ok) { renderLogs(await response.json()); }
  } catch (error) { logsList.innerHTML = '<p>Erro de conexão</p>'; }
}

function renderLogs(logs) {
  if (logs.length === 0) { logsList.innerHTML = '<p>Nenhuma alteração registrada.</p>'; return; }
  logsList.innerHTML = logs.reverse().map(log => {
    const [y, m, d] = log.date.split('-');
    const ts = new Date(log.timestamp);
    const dateFormatted = `${parseInt(d)}/${parseInt(m)}/${y}`;
    let msg = (log.type === "comment") ? `💬 <strong>${log.user}</strong> postou uma observação no dia ${dateFormatted}: "${log.text}"`
      : (!log.oldSector || log.oldSector === "(Vazio)") ? `➕ <strong>${log.user}</strong> adicionou contagem do <strong>${log.sector}</strong> no dia ${dateFormatted}.`
      : `✏️ <strong>${log.user}</strong> alterou a contagem do dia ${dateFormatted} para <strong>${log.sector}</strong>.`;
    return `<div style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px;">
        <span style="color: var(--muted); font-size: 11px; display: block; margin-bottom: 4px;">${ts.toLocaleDateString('pt-BR')} às ${ts.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
        ${msg}</div>`;
  }).join('');
}

// ============================================================
// UTILS & LISTENERS
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

adminBtn.onclick = openAdmin;
closeLoginBtn.onclick = () => closeModal('loginModal');
document.getElementById('doLogin').onclick = doLogin;
pwInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
document.getElementById('doLogout').onclick = doLogout;
document.getElementById('openSettings').onclick = openSettings;
document.getElementById('closeSettings').onclick = () => closeModal('settingsModal');
document.getElementById('saveProfile').onclick = saveProfile;
document.getElementById('saveNewLogin').onclick = changeMyLogin;
document.getElementById('saveNewPassword').onclick = saveNewPassword;
document.getElementById('createUserBtn').onclick = createUser;
document.getElementById('addSectorBtn').onclick = addSector;
document.getElementById('clearAllDataBtn').onclick = clearAllData;
document.getElementById('doResetPw').onclick = doResetPassword;
document.getElementById('saveEdit').onclick = saveEdit;
document.getElementById('closeDayModal').onclick = () => closeModal('dayModal');
viewLogsBtn.onclick = viewLogs;
document.getElementById('closeLogs').onclick = () => closeModal('logsModal');
toggleLegend.onclick = () => { toggleLegend.classList.toggle('active'); legendContent.classList.toggle('open'); };
sendCommentBtn.onclick = sendComment;
commentInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } };
document.querySelectorAll('.modal-overlay').forEach(o => { o.onclick = (e) => { if (e.target === o) closeModal(o.id); }; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(o => closeModal(o.id)); });
window.onclick = (e) => { if (!adminBtn.contains(e.target) && !adminDropdown.contains(e.target)) adminDropdown.classList.remove('open'); };

loadSession();
fetchSectors();
fetchData();
renderNav();

window.toggleUserRole = toggleUserRole;
window.deleteUser = deleteUser;
window.resetUserPassword = resetUserPassword;
window.deleteComment = deleteComment;
window.toggleOriginalText = toggleOriginalText;
window.updateSectorColor = updateSectorColor;
window.updateSectorLabel = updateSectorLabel;
window.removeSector = removeSector;
window.renameUser = renameUser;
