/* ===== DATA ===== */
var professionals = {
  'Rhai': ['Nanopigmentação','Design de sobrancelhas','Henna','Coloração de sobrancelhas','Epilação Buço','Epilação Queixo','Epilação Rosto','Lash lifting','Brow lamination','Mega Hair','Escova','Babyliss'],
  'Rubia': ['Tratamento capilar','Botox capilar / Progressiva','Coloração'],
  'Pablo': ['Corte','Mechas','Penteado','Escova','Babyliss']
};

var colorOptions = [
  { code: '1-0', hex: '#030104' },
  { code: '7-0', hex: '#60462B' },
  { code: '8-0', hex: '#85602C' },
  { code: '9-0', hex: '#C89651' }
];

var clients = [];
var appointments = [];

var MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

var today = new Date();
var currentMonth = today.getMonth();
var currentYear = today.getFullYear();
var selectedDay = today.getDate();

// Flag para saber se veio do fluxo de identificação (redirecionar após cadastro)
var pendingAgendamentoFromIdentificacao = false;

/* ===== SUPABASE HELPERS ===== */
async function loadClients() {
  var result = await supabaseClient.from('clientes').select('*').order('nome');
  if (result.error) { console.error('Erro ao carregar clientes:', result.error); return; }
  clients = result.data.map(function(c) {
    return { id: c.id, nome: c.nome, telefone: c.telefone, nascimento: c.nascimento || '' };
  });
}

async function loadAppointments() {
  var result = await supabaseClient.from('agendamentos').select('*');
  if (result.error) { console.error('Erro ao carregar agendamentos:', result.error); return; }
  appointments = result.data.map(function(a) {
    return {
      id: a.id,
      cliente: a.cliente,
      telefone: a.telefone,
      profissional: a.profissional,
      servico: a.servico,
      cor: a.cor || '',
      data: a.data,
      hora: a.hora ? a.hora.substring(0, 5) : ''
    };
  });
}

async function insertClient(clientObj) {
  var row = { nome: clientObj.nome, telefone: clientObj.telefone };
  if (clientObj.nascimento) row.nascimento = clientObj.nascimento;
  var result = await supabaseClient.from('clientes').insert([row]).select();
  if (result.error) { console.error('Erro ao salvar cliente:', result.error); return null; }
  return result.data[0];
}

async function insertAppointment(apt) {
  var row = {
    cliente: apt.cliente,
    telefone: apt.telefone,
    profissional: apt.profissional,
    servico: apt.servico,
    data: apt.data,
    hora: apt.hora
  };
  if (apt.cor) row.cor = apt.cor;
  var result = await supabaseClient.from('agendamentos').insert([row]).select();
  if (result.error) { console.error('Erro ao salvar agendamento:', result.error); return null; }
  return result.data[0];
}

async function updateAppointment(id, apt) {
  var row = {
    profissional: apt.profissional,
    servico: apt.servico,
    data: apt.data,
    hora: apt.hora,
    cor: apt.cor || null
  };
  var result = await supabaseClient.from('agendamentos').update(row).eq('id', id);
  if (result.error) { console.error('Erro ao atualizar agendamento:', result.error); return false; }
  return true;
}

async function insertHistorico(apt) {
  var row = {
    cliente_telefone: apt.telefone,
    cliente_nome: apt.cliente,
    servico: apt.servico,
    cor: apt.cor || null,
    data: apt.data,
    profissional: apt.profissional
  };
  await supabaseClient.from('historico_atendimentos').insert([row]);
}

async function loadHistorico(telefone) {
  var result = await supabaseClient.from('historico_atendimentos').select('*').eq('cliente_telefone', telefone).order('data', { ascending: false });
  if (result.error) { console.error('Erro ao carregar histórico:', result.error); return []; }
  return result.data;
}

async function cleanupOldAppointments() {
  var todayStr = formatDateInput(new Date());
  // Primeiro salvar no histórico os que vão ser removidos
  var result = await supabaseClient.from('agendamentos').select('*').lt('data', todayStr);
  if (!result.error && result.data && result.data.length > 0) {
    for (var i = 0; i < result.data.length; i++) {
      var a = result.data[i];
      await insertHistorico({
        telefone: a.telefone,
        cliente: a.cliente,
        servico: a.servico,
        cor: a.cor || '',
        data: a.data,
        profissional: a.profissional
      });
    }
    // Deletar agendamentos antigos
    await supabaseClient.from('agendamentos').delete().lt('data', todayStr);
  }
}

/* ===== MÁSCARA DE TELEFONE ===== */
function maskPhone(input) {
  input.addEventListener('input', function() {
    var v = this.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 6) {
      this.value = '(' + v.substring(0, 2) + ') ' + v.substring(2, 7) + '-' + v.substring(7);
    } else if (v.length > 2) {
      this.value = '(' + v.substring(0, 2) + ') ' + v.substring(2);
    } else if (v.length > 0) {
      this.value = '(' + v;
    }
  });
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async function() {
  // Auth check
  if (!sessionStorage.getItem('logged')) {
    window.location.href = 'index.html';
    return;
  }

  // Limpeza automática de agendamentos passados (Feature 5)
  await cleanupOldAppointments();

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

  // ===== FEATURE 1: Identificação do cliente =====
  document.getElementById('btn-novo-agendamento').addEventListener('click', function() {
    pendingAgendamentoFromIdentificacao = false;
    document.getElementById('id-telefone').value = '';
    document.getElementById('id-feedback').textContent = '';
    document.getElementById('id-feedback').className = 'id-feedback';
    openModal('modal-identificacao');
  });
  document.getElementById('close-identificacao').addEventListener('click', function() { closeModal('modal-identificacao'); });
  document.getElementById('cancel-identificacao').addEventListener('click', function() { closeModal('modal-identificacao'); });
  document.getElementById('btn-consultar').addEventListener('click', consultarCliente);

  // Máscara de telefone no campo de identificação
  maskPhone(document.getElementById('id-telefone'));
  maskPhone(document.getElementById('cl-telefone'));

  // Permitir Enter no campo de identificação
  document.getElementById('id-telefone').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); consultarCliente(); }
  });

  // Appointment modal
  document.getElementById('close-agendamento').addEventListener('click', function() { closeModal('modal-agendamento'); });
  document.getElementById('cancel-agendamento').addEventListener('click', function() { closeModal('modal-agendamento'); });
  document.getElementById('form-agendamento').addEventListener('submit', saveAppointment);

  // Dynamic services + cor
  document.getElementById('ag-profissional').addEventListener('change', function() {
    var sel = document.getElementById('ag-servico');
    sel.innerHTML = '<option value="">Selecione...</option>';
    var services = professionals[this.value] || [];
    services.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });
    // Se já tinha um serviço selecionado (edição), manter
    checkColorField();
  });

  document.getElementById('ag-servico').addEventListener('change', checkColorField);

  // Set default date
  var dtInput = document.getElementById('ag-data');
  dtInput.value = formatDateInput(today);

  // Client modal
  document.getElementById('btn-novo-cliente').addEventListener('click', function() {
    pendingAgendamentoFromIdentificacao = false;
    document.getElementById('cl-telefone').value = '';
    openModal('modal-cliente');
  });
  document.getElementById('close-cliente').addEventListener('click', function() { closeModal('modal-cliente'); pendingAgendamentoFromIdentificacao = false; });
  document.getElementById('cancel-cliente').addEventListener('click', function() { closeModal('modal-cliente'); pendingAgendamentoFromIdentificacao = false; });
  document.getElementById('form-cliente').addEventListener('submit', saveClient);

  // Histórico modal
  document.getElementById('close-historico').addEventListener('click', function() { closeModal('modal-historico'); });

  // Populate professional dropdown
  var profSelect = document.getElementById('ag-profissional');
  Object.keys(professionals).forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    profSelect.appendChild(opt);
  });

  // Renderizar opções de cor no dropdown
  renderColorOptions();

  // Color dropdown toggle
  document.getElementById('color-dropdown-trigger').addEventListener('click', function() {
    document.getElementById('color-dropdown-options').classList.toggle('open');
  });

  // Fechar dropdown de cor ao clicar fora
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#color-dropdown')) {
      document.getElementById('color-dropdown-options').classList.remove('open');
    }
  });

  // Initial render
  switchPage('agendamentos');
});

/* ===== FEATURE 1: CONSULTAR CLIENTE ===== */
async function consultarCliente() {
  var tel = document.getElementById('id-telefone').value.trim();
  if (!tel) {
    showFeedback('Digite um telefone', 'error');
    return;
  }

  showFeedback('Consultando...', 'loading');

  var found = clients.find(function(c) { return c.telefone === tel; });

  if (found) {
    showFeedback('Cliente encontrado: ' + found.nome, 'success');
    setTimeout(function() {
      closeModal('modal-identificacao');
      openAgendamentoModal(null, found.nome, found.telefone);
    }, 800);
  } else {
    showFeedback('Cliente não cadastrado. Redirecionando para cadastro...', 'error');
    pendingAgendamentoFromIdentificacao = true;
    setTimeout(function() {
      closeModal('modal-identificacao');
      document.getElementById('cl-telefone').value = tel;
      openModal('modal-cliente');
    }, 1200);
  }
}

function showFeedback(msg, type) {
  var el = document.getElementById('id-feedback');
  el.textContent = msg;
  el.className = 'id-feedback ' + type;
}

/* ===== FEATURE 2: CAMPO DE COR ===== */
function checkColorField() {
  var servico = document.getElementById('ag-servico').value;
  var grupoCor = document.getElementById('grupo-cor');
  if (servico === 'Coloração') {
    grupoCor.style.display = 'block';
  } else {
    grupoCor.style.display = 'none';
    document.getElementById('ag-cor').value = '';
    document.getElementById('color-dropdown-text').textContent = 'Selecione uma cor...';
  }
}

function renderColorOptions() {
  var container = document.getElementById('color-dropdown-options');
  container.innerHTML = '';
  // Opção "Nenhuma"
  var noneOpt = document.createElement('div');
  noneOpt.className = 'color-option';
  noneOpt.innerHTML = '<span class="color-swatch" style="background:#333;border:1px dashed #666;"></span><span>Nenhuma</span>';
  noneOpt.addEventListener('click', function() {
    document.getElementById('ag-cor').value = '';
    document.getElementById('color-dropdown-text').innerHTML = 'Selecione uma cor...';
    document.getElementById('color-dropdown-options').classList.remove('open');
  });
  container.appendChild(noneOpt);

  colorOptions.forEach(function(c) {
    var opt = document.createElement('div');
    opt.className = 'color-option';
    opt.innerHTML = '<span class="color-swatch" style="background:' + c.hex + ';"></span><span>' + c.code + '</span>';
    opt.addEventListener('click', function() {
      document.getElementById('ag-cor').value = c.code;
      document.getElementById('color-dropdown-text').innerHTML = '<span class="color-swatch-inline" style="background:' + c.hex + ';"></span> ' + c.code;
      document.getElementById('color-dropdown-options').classList.remove('open');
    });
    container.appendChild(opt);
  });
}

function setColorDropdownValue(code) {
  if (!code) {
    document.getElementById('ag-cor').value = '';
    document.getElementById('color-dropdown-text').textContent = 'Selecione uma cor...';
    return;
  }
  var found = colorOptions.find(function(c) { return c.code === code; });
  if (found) {
    document.getElementById('ag-cor').value = found.code;
    document.getElementById('color-dropdown-text').innerHTML = '<span class="color-swatch-inline" style="background:' + found.hex + ';"></span> ' + found.code;
  }
}

/* ===== OPEN AGENDAMENTO MODAL (novo ou edição) ===== */
function openAgendamentoModal(appointment, clienteNome, clienteTelefone) {
  var form = document.getElementById('form-agendamento');
  form.reset();
  document.getElementById('ag-servico').innerHTML = '<option value="">Selecione...</option>';
  document.getElementById('ag-cor').value = '';
  document.getElementById('color-dropdown-text').textContent = 'Selecione uma cor...';
  document.getElementById('grupo-cor').style.display = 'none';
  document.getElementById('ag-data').value = formatDateInput(today);

  if (appointment) {
    // EDIÇÃO (Feature 3)
    document.getElementById('modal-agendamento-titulo').textContent = 'Editar Agendamento';
    document.getElementById('btn-salvar-agendamento').textContent = 'Salvar';
    document.getElementById('ag-id').value = appointment.id;
    document.getElementById('ag-cliente').value = appointment.cliente;
    document.getElementById('ag-telefone').value = appointment.telefone;
    document.getElementById('ag-profissional').value = appointment.profissional;

    // Preencher serviços do profissional
    var sel = document.getElementById('ag-servico');
    sel.innerHTML = '<option value="">Selecione...</option>';
    var services = professionals[appointment.profissional] || [];
    services.forEach(function(s) {
      var opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });
    document.getElementById('ag-servico').value = appointment.servico;

    document.getElementById('ag-data').value = appointment.data;
    document.getElementById('ag-hora').value = appointment.hora;

    // Cor
    if (appointment.servico === 'Coloração') {
      document.getElementById('grupo-cor').style.display = 'block';
      setColorDropdownValue(appointment.cor);
    }
  } else {
    // NOVO
    document.getElementById('modal-agendamento-titulo').textContent = 'Novo Agendamento';
    document.getElementById('btn-salvar-agendamento').textContent = 'Agendar';
    document.getElementById('ag-id').value = '';
    document.getElementById('ag-cliente').value = clienteNome || '';
    document.getElementById('ag-telefone').value = clienteTelefone || '';
  }

  openModal('modal-agendamento');
}

/* ===== NAVIGATION ===== */
function switchPage(page) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('page-' + page).classList.add('active');
  var navBtn = document.querySelector('.nav-btn[data-page="' + page + '"]');
  if (navBtn) navBtn.classList.add('active');

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
      div.className = 'appointment-item clickable';
      var corInfo = '';
      if (a.cor) {
        var corHex = getColorHex(a.cor);
        corInfo = ' &nbsp; <span class="color-swatch-inline" style="background:' + corHex + ';"></span> ' + a.cor;
      }
      div.innerHTML = '<div><span class="time">' + a.hora + '</span><span class="client-name">' + a.cliente + '</span></div>' +
        '<div class="details"><i class="fa-regular fa-user"></i> ' + a.profissional + ' &nbsp; <i class="fa-solid fa-scissors"></i> ' + a.servico + corInfo + '</div>' +
        '<div class="details"><i class="fa-solid fa-phone"></i> ' + a.telefone + '</div>';
      // Feature 3: clique para editar
      div.addEventListener('click', function() {
        openAgendamentoModal(a);
      });
      container.appendChild(div);
    });
  }
}

function getColorHex(code) {
  var found = colorOptions.find(function(c) { return c.code === code; });
  return found ? found.hex : '#333';
}

/* ===== SAVE APPOINTMENT ===== */
async function saveAppointment(e) {
  e.preventDefault();
  var editId = document.getElementById('ag-id').value;
  var apt = {
    cliente: document.getElementById('ag-cliente').value.trim(),
    telefone: document.getElementById('ag-telefone').value.trim(),
    profissional: document.getElementById('ag-profissional').value,
    servico: document.getElementById('ag-servico').value,
    cor: document.getElementById('ag-cor').value || '',
    data: document.getElementById('ag-data').value,
    hora: document.getElementById('ag-hora').value
  };

  if (!apt.cliente || !apt.telefone || !apt.profissional || !apt.servico || !apt.data || !apt.hora) return;

  if (editId) {
    // Feature 3: Edição
    var ok = await updateAppointment(editId, apt);
    if (!ok) { showToast('Erro ao atualizar agendamento!'); return; }
    // Atualizar localmente
    var idx = appointments.findIndex(function(a) { return a.id == editId; });
    if (idx !== -1) {
      apt.id = editId;
      appointments[idx] = apt;
    }
    showToast('Agendamento atualizado com sucesso!');
  } else {
    // Novo
    var inserted = await insertAppointment(apt);
    if (!inserted) { showToast('Erro ao salvar agendamento!'); return; }
    apt.id = inserted.id;
    appointments.push(apt);

    // Salvar também no histórico
    await insertHistorico(apt);

    showToast('Agendamento criado com sucesso!');
  }

  var parts = apt.data.split('-');
  currentYear = parseInt(parts[0]);
  currentMonth = parseInt(parts[1]) - 1;
  selectedDay = parseInt(parts[2]);

  closeModal('modal-agendamento');
  renderCalendar();
  renderDayDetail();
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
    tr.className = 'client-row-clickable';
    tr.innerHTML = '<td>' + c.nome + (isBirthday ? ' <i class="fa-solid fa-cake-candles birthday-icon"></i>' : '') + '</td>' +
      '<td><i class="fa-solid fa-phone" style="color:var(--text-muted);margin-right:6px;font-size:0.8rem"></i>' + c.telefone + '</td>' +
      '<td>' + birthFormatted + '</td>';
    // Feature 4: clique para abrir histórico
    (function(client) {
      tr.addEventListener('click', function() { openHistorico(client); });
    })(c);
    tbody.appendChild(tr);
  });
}

/* ===== FEATURE 4: HISTÓRICO DO CLIENTE ===== */
async function openHistorico(client) {
  var infoDiv = document.getElementById('historico-info');
  var birthFormatted = client.nascimento ? client.nascimento.split('-').reverse().join('/') : '-';
  infoDiv.innerHTML =
    '<div class="historico-card-info">' +
    '<p><strong>Nome:</strong> ' + client.nome + '</p>' +
    '<p><strong>Telefone:</strong> ' + client.telefone + '</p>' +
    '<p><strong>Nascimento:</strong> ' + birthFormatted + '</p>' +
    '</div>';

  var listaDiv = document.getElementById('historico-lista');
  listaDiv.innerHTML = '<p class="historico-loading">Carregando histórico...</p>';

  openModal('modal-historico');

  var historico = await loadHistorico(client.telefone);

  if (historico.length === 0) {
    listaDiv.innerHTML = '<p class="historico-vazio">Nenhum atendimento registrado.</p>';
  } else {
    var html = '<table class="historico-table"><thead><tr><th>Data</th><th>Serviço</th><th>Cor</th><th>Profissional</th></tr></thead><tbody>';
    historico.forEach(function(h) {
      var dataFormatted = h.data ? h.data.split('-').reverse().join('/') : '-';
      var corCell = '-';
      if (h.cor) {
        var hex = getColorHex(h.cor);
        corCell = '<span class="color-swatch-inline" style="background:' + hex + ';"></span> ' + h.cor;
      }
      html += '<tr><td>' + dataFormatted + '</td><td>' + (h.servico || '-') + '</td><td>' + corCell + '</td><td>' + (h.profissional || '-') + '</td></tr>';
    });
    html += '</tbody></table>';
    listaDiv.innerHTML = html;
  }
}

async function saveClient(e) {
  e.preventDefault();
  var nome = document.getElementById('cl-nome').value.trim();
  var telefone = document.getElementById('cl-telefone').value.trim();
  var nascimento = document.getElementById('cl-nascimento').value;
  if (!nome || !telefone) return;

  var clientObj = { nome: nome, telefone: telefone, nascimento: nascimento };
  var inserted = await insertClient(clientObj);
  if (!inserted) { showToast('Erro ao salvar cliente!'); return; }

  clientObj.id = inserted.id;
  clients.push(clientObj);
  closeModal('modal-cliente');
  document.getElementById('form-cliente').reset();
  renderClients();
  showToast('Cliente cadastrado com sucesso!');

  // Feature 1: se veio do fluxo de identificação, abrir agendamento
  if (pendingAgendamentoFromIdentificacao) {
    pendingAgendamentoFromIdentificacao = false;
    setTimeout(function() {
      openAgendamentoModal(null, nome, telefone);
    }, 500);
  }
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
