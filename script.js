/* ===== SUPABASE IMPORT ===== */
import { supabase } from './supabaseClient.js';

/* ===== DATA ===== */
var professionals = {
  'Rhai': ['Nanopigmentação','Design de sobrancelhas','Henna','Coloração de sobrancelhas','Epilação Buço','Epilação Queixo','Epilação Rosto','Lash lifting','Brow lamination','Mega Hair','Escova','Babyliss'],
  'Rubia': ['Tratamento capilar','Botox capilar / Progressiva','Coloração'],
  'Pablo': ['Corte','Mechas','Penteado','Escova','Babyliss']
};

var clients = [];
var appointments = [];

var MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

var today = new Date();
var currentMonth = today.getMonth();
var currentYear = today.getFullYear();
var selectedDay = today.getDate();

/* ===== SUPABASE HELPERS ===== */
async function loadClients() {
  var { data, error } = await supabase.from('clientes').select('*').order('nome');
  if (error) { console.error('Erro ao carregar clientes:', error); return; }
  clients = data.map(function(c) {
    return { nome: c.nome, telefone: c.telefone, nascimento: c.nascimento || '' };
  });
}

async function loadAppointments() {
  var { data, error } = await supabase.from('agendamentos').select('*');
  if (error) { console.error('Erro ao carregar agendamentos:', error); return; }
  appointments = data.map(function(a) {
    return {
      cliente: a.cliente,
      telefone: a.telefone,
      profissional: a.profissional,
      servico: a.servico,
      data: a.data,
      hora: a.hora.substring(0, 5) // "HH:MM:SS" → "HH:MM"
    };
  });
}

async function insertClient(clientObj) {
  var row = { nome: clientObj.nome, telefone: clientObj.telefone };
  if (clientObj.nascimento) row.nascimento = clientObj.nascimento;
  var { error } = await supabase.from('clientes').insert([row]);
  if (error) { console.error('Erro ao salvar cliente:', error); return false; }
  return true;
}

async function insertAppointment(apt) {
  var { error } = await supabase.from('agendamentos').insert([{
    cliente: apt.cliente,
    telefone: apt.telefone,
    profissional: apt.profissional,
    servico: apt.servico,
    data: apt.data,
    hora: apt.hora
  }]);
  if (error) { console.error('Erro ao salvar agendamento:', error); return false; }
  return true;
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async function() {
  // Auth check
  if (!sessionStorage.getItem('logged')) {
    window.location.href = 'index.html';
    return;
  }

  // Load data from Supabase
  await loadClients();
  await loadAppointments();

  // Navigation
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchPage(this.dataset.page);
    });
  });

  // Hamburger
  document.getElementById('hamburger').addEventListener('click', openSidebar);
  document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);
  document.getElementById('close-sidebar').addEventListener('click', closeSidebar);

  // Logout
  document.getElementById('btn-sair').addEventListener('click', function() {
    sessionStorage.removeItem('logged');
    window.location.href = 'index.html';
  });

  // Calendar nav
  document.getElementById('prev-month').addEventListener('click', function() {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; } else { currentMonth--; }
    selectedDay = 1;
    renderCalendar();
    renderDayDetail();
  });
  document.getElementById('next-month').addEventListener('click', function() {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; } else { currentMonth++; }
    selectedDay = 1;
    renderCalendar();
    renderDayDetail();
  });

  // Appointment modal
  document.getElementById('btn-novo-agendamento').addEventListener('click', function() { openModal('modal-agendamento'); });
  document.getElementById('close-agendamento').addEventListener('click', function() { closeModal('modal-agendamento'); });
  document.getElementById('cancel-agendamento').addEventListener('click', function() { closeModal('modal-agendamento'); });
  document.getElementById('form-agendamento').addEventListener('submit', saveAppointment);

  // Dynamic services
  document.getElementById('ag-profissional').addEventListener('change', function() {
    var sel = document.getElementById('ag-servico');
    sel.innerHTML = '<option value="">Selecione...</option>';
    var services = professionals[this.value] || [];
    services.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });
  });

  // Set default date
  var dtInput = document.getElementById('ag-data');
  dtInput.value = formatDateInput(today);

  // Client modal
  document.getElementById('btn-novo-cliente').addEventListener('click', function() { openModal('modal-cliente'); });
  document.getElementById('close-cliente').addEventListener('click', function() { closeModal('modal-cliente'); });
  document.getElementById('cancel-cliente').addEventListener('click', function() { closeModal('modal-cliente'); });
  document.getElementById('form-cliente').addEventListener('submit', saveClient);

  // Populate professional dropdown
  var profSelect = document.getElementById('ag-profissional');
  Object.keys(professionals).forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    profSelect.appendChild(opt);
  });

  // Initial render
  switchPage('agendamentos');
});

/* ===== NAVIGATION ===== */
function switchPage(page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector('.nav-btn[data-page="' + page + '"]').classList.add('active');

  if (page === 'agendamentos') { renderCalendar(); renderDayDetail(); }
  if (page === 'clientes') { renderClients(); }
  if (page === 'profissionais') { renderProfessionals(); }

  closeSidebar();
}

/* ===== SIDEBAR MOBILE ===== */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('hamburger').style.display = 'none';
  document.getElementById('sidebar-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('hamburger').style.display = '';
  document.getElementById('sidebar-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

/* ===== CALENDAR ===== */
function renderCalendar() {
  document.getElementById('month-year').textContent = MONTHS[currentMonth] + ' ' + currentYear;
  var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  var firstDay = new Date(currentYear, currentMonth, 1).getDay();
  var container = document.getElementById('calendar-days');
  container.innerHTML = '';

  for (var i = 0; i < firstDay; i++) {
    var empty = document.createElement('div');
    empty.className = 'calendar-day empty';
    container.appendChild(empty);
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var btn = document.createElement('button');
    btn.className = 'calendar-day';
    btn.textContent = d;
    if (d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      btn.classList.add('today');
    }
    if (d === selectedDay) btn.classList.add('selected');

    var dateStr = currentYear + '-' + pad(currentMonth + 1) + '-' + pad(d);
    var hasApt = appointments.some(function(a) { return a.data === dateStr; });
    if (hasApt) btn.classList.add('has-appointment');

    btn.dataset.day = d;
    btn.addEventListener('click', function() {
      selectedDay = parseInt(this.dataset.day);
      renderCalendar();
      renderDayDetail();
    });
    container.appendChild(btn);
  }
}

function renderDayDetail() {
  var date = new Date(currentYear, currentMonth, selectedDay);
  var weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  var formatted = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  document.getElementById('day-detail-header').textContent = weekday + ', ' + formatted;

  var dateStr = currentYear + '-' + pad(currentMonth + 1) + '-' + pad(selectedDay);
  var dayAppointments = appointments.filter(function(a) { return a.data === dateStr; });
  dayAppointments.sort(function(a, b) { return a.hora.localeCompare(b.hora); });

  var container = document.getElementById('day-appointments');
  if (dayAppointments.length === 0) {
    container.innerHTML = '<div class="no-appointments"><i class="fa-regular fa-clock"></i><p>Nenhum agendamento neste dia</p></div>';
  } else {
    container.innerHTML = '';
    dayAppointments.forEach(function(a) {
      var div = document.createElement('div');
      div.className = 'appointment-item';
      div.innerHTML = '<div><span class="time">' + a.hora + '</span><span class="client-name">' + a.cliente + '</span></div>' +
        '<div class="details"><i class="fa-regular fa-user"></i> ' + a.profissional + ' &nbsp; <i class="fa-solid fa-scissors"></i> ' + a.servico + '</div>' +
        '<div class="details"><i class="fa-solid fa-phone"></i> ' + a.telefone + '</div>';
      container.appendChild(div);
    });
  }
}

/* ===== SAVE APPOINTMENT ===== */
async function saveAppointment(e) {
  e.preventDefault();
  var apt = {
    cliente: document.getElementById('ag-cliente').value.trim(),
    telefone: document.getElementById('ag-telefone').value.trim(),
    profissional: document.getElementById('ag-profissional').value,
    servico: document.getElementById('ag-servico').value,
    data: document.getElementById('ag-data').value,
    hora: document.getElementById('ag-hora').value
  };

  if (!apt.cliente || !apt.telefone || !apt.profissional || !apt.servico || !apt.data || !apt.hora) return;

  var ok = await insertAppointment(apt);
  if (!ok) { showToast('Erro ao salvar agendamento!'); return; }

  appointments.push(apt);

  var parts = apt.data.split('-');
  currentYear = parseInt(parts[0]);
  currentMonth = parseInt(parts[1]) - 1;
  selectedDay = parseInt(parts[2]);

  closeModal('modal-agendamento');
  document.getElementById('form-agendamento').reset();
  document.getElementById('ag-data').value = formatDateInput(today);
  document.getElementById('ag-servico').innerHTML = '<option value="">Selecione...</option>';

  renderCalendar();
  renderDayDetail();
  showToast('Agendamento criado com sucesso!');
}

/* ===== CLIENTS ===== */
function renderClients() {
  var todayStr = pad(today.getMonth() + 1) + '-' + pad(today.getDate());
  var birthdayClients = clients.filter(function(c) {
    if (!c.nascimento) return false;
    var parts = c.nascimento.split('-');
    return parts[1] + '-' + parts[2] === todayStr;
  });

  var banner = document.getElementById('birthday-banner');
  if (birthdayClients.length > 0) {
    var names = birthdayClients.map(function(c) { return c.nome; }).join(', ');
    banner.innerHTML = '<i class="fa-solid fa-cake-candles"></i><div>🎂 Aniversariantes de Hoje!<br><span class="names">' + names + '</span></div>';
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }

  var tbody = document.getElementById('clients-tbody');
  tbody.innerHTML = '';
  clients.forEach(function(c) {
    var isBirthday = false;
    if (c.nascimento) {
      var parts = c.nascimento.split('-');
      isBirthday = parts[1] + '-' + parts[2] === todayStr;
    }
    var birthFormatted = c.nascimento ? c.nascimento.split('-').reverse().join('/') : '-';
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + c.nome + (isBirthday ? ' <i class="fa-solid fa-cake-candles birthday-icon"></i>' : '') + '</td>' +
      '<td><i class="fa-solid fa-phone" style="color:var(--text-muted);margin-right:6px;font-size:0.8rem"></i>' + c.telefone + '</td>' +
      '<td>' + birthFormatted + '</td>';
    tbody.appendChild(tr);
  });
}

async function saveClient(e) {
  e.preventDefault();
  var nome = document.getElementById('cl-nome').value.trim();
  var telefone = document.getElementById('cl-telefone').value.trim();
  var nascimento = document.getElementById('cl-nascimento').value;
  if (!nome || !telefone) return;

  var clientObj = { nome: nome, telefone: telefone, nascimento: nascimento };
  var ok = await insertClient(clientObj);
  if (!ok) { showToast('Erro ao salvar cliente!'); return; }

  clients.push(clientObj);
  closeModal('modal-cliente');
  document.getElementById('form-cliente').reset();
  renderClients();
  showToast('Cliente cadastrado com sucesso!');
}

/* ===== PROFESSIONALS ===== */
function renderProfessionals() {
  var container = document.getElementById('professionals-grid');
  container.innerHTML = '';
  Object.keys(professionals).forEach(function(name) {
    var card = document.createElement('div');
    card.className = 'professional-card';
    var services = professionals[name].map(function(s) {
      return '<li><i class="fa-solid fa-scissors"></i>' + s + '</li>';
    }).join('');
    card.innerHTML = '<div class="card-header"><div class="avatar">' + name.charAt(0).toUpperCase() + '</div><span class="name">' + name + '</span></div>' +
      '<ul class="services-list">' + services + '</ul>';
    container.appendChild(card);
  });
}

/* ===== MODAL ===== */
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

/* ===== TOAST ===== */
function showToast(msg) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var div = document.createElement('div');
  div.className = 'toast';
  div.innerHTML = '<i class="fa-solid fa-circle-check"></i>' + msg;
  document.body.appendChild(div);
  setTimeout(function() {
    div.classList.add('hide');
    setTimeout(function() { div.remove(); }, 300);
  }, 3000);
}

/* ===== UTILS ===== */
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function formatDateInput(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
