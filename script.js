/* ===== DATA ===== */
var professionals = {
  'Rhai': ['Nanopigmentação','Design de sobrancelhas','Henna','Coloração de sobrancelhas','Epilação Buço','Epilação Queixo','Epilação Rosto','Lash lifting','Brow lamination','Mega Hair','Escova','Babyliss'],
  'Rubia': ['Tratamento capilar','Botox capilar / Progressiva','Coloração'],
  'Pablo': ['Corte','Mechas','Penteado','Escova','Babyliss']
};

var colorOptions = [
  { code: 'Nenhuma', hex: '#888888' },
  { code: '1-0', hex: '#030104' },
  { code: '7-0', hex: '#60462B' },
  { code: '8-0', hex: '#85602C' },
  { code: '9-0', hex: '#C89651' }
];

var clients = [];
var appointments = [];
var editingAppointmentId = null;
var pendingClienteFromIdentificacao = null;

var MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

var today = new Date();
var currentMonth = today.getMonth();
var currentYear = today.getFullYear();
var selectedDay = today.getDate();

/* ===== SUPABASE HELPERS ===== */
async function loadClients() {
  var resp = await supabaseClient.from('clientes').select('*').order('nome');
  if (resp.error) { console.error('Erro clientes:', resp.error); return; }
  clients = resp.data.map(function(c) {
    return { id: c.id, nome: c.nome, telefone: c.telefone, nascimento: c.nascimento || '' };
  });
}

async function loadAppointments() {
  var resp = await supabaseClient.from('agendamentos').select('*');
  if (resp.error) { console.error('Erro agendamentos:', resp.error); return; }
  appointments = resp.data.map(function(a) {
    return {
      id: a.id,
      cliente: a.cliente,
      telefone: a.telefone,
      profissional: a.profissional,
      servico: a.servico,
      cor: a.cor || '',
      data: a.data,
      hora: (a.hora || '').substring(0, 5)
    };
  });
}

async function insertClient(clientObj) {
  var row = { nome: clientObj.nome, telefone: clientObj.telefone };
  if (clientObj.nascimento) row.nascimento = clientObj.nascimento;
  var resp = await supabaseClient.from('clientes').insert([row]).select();
  if (resp.error) { console.error('Erro inserir cliente:', resp.error); return null; }
  return resp.data[0];
}

async function insertAppointment(apt) {
  var resp = await supabaseClient.from('agendamentos').insert([{
    cliente: apt.cliente,
    telefone: apt.telefone,
    profissional: apt.profissional,
    servico: apt.servico,
    cor: apt.cor || '',
    data: apt.data,
    hora: apt.hora
  }]);
  if (resp.error) { console.error('Erro inserir agendamento:', resp.error); return false; }
  return true;
}

async function updateAppointment(id, apt) {
  var resp = await supabaseClient.from('agendamentos').update({
    profissional: apt.profissional,
    servico: apt.servico,
    cor: apt.cor || '',
    data: apt.data,
    hora: apt.hora
  }).eq('id', id);
  if (resp.error) { console.error('Erro atualizar agendamento:', resp.error); return false; }
  return true;
}

async function deleteAppointment(id) {
  /* Salvar no histórico antes de excluir */
  var ag = appointments.find(function(a) { return a.id === id; });
  if (ag) {
    await supabaseClient.from('historico_atendimentos').insert([{
      cliente: ag.cliente,
      telefone: ag.telefone,
      profissional: ag.profissional,
      servico: ag.servico,
      cor: ag.cor || '',
      data: ag.data,
      hora: ag.hora
    }]);
  }
  var resp = await supabaseClient.from('agendamentos').delete().eq('id', id);
  if (resp.error) { console.error('Erro excluir agendamento:', resp.error); return false; }
  return true;
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', async function() {
  if (!sessionStorage.getItem('logged')) {
    window.location.href = 'index.html';
    return;
  }

  await loadClients();
  await loadAppointments();

  // Cleanup old appointments
  await cleanupOldAppointments();

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

  // Novo agendamento → abre identificação primeiro
  document.getElementById('btn-novo-agendamento').addEventListener('click', function() {
    document.getElementById('id-telefone').value = '';
    document.getElementById('id-feedback').style.display = 'none';
    openModal('modal-identificacao');
  });

  // Novo cliente
  document.getElementById('btn-novo-cliente').addEventListener('click', function() {
    pendingClienteFromIdentificacao = null;
    document.getElementById('form-cliente').reset();
    openModal('modal-cliente');
  });

  // Populate professional dropdown
  var profSelect = document.getElementById('ag-profissional');
  Object.keys(professionals).forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    profSelect.appendChild(opt);
  });

  // Set default date
  document.getElementById('ag-data').value = formatDateInput(today);

  // Mask telefone nos inputs
  maskTelefone(document.getElementById('id-telefone'));
  maskTelefone(document.getElementById('cl-telefone'));

  switchPage('agendamentos');
});

/* ===== PHONE MASK ===== */
function maskTelefone(input) {
  input.addEventListener('input', function() {
    var v = this.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 6) {
      this.value = '(' + v.substring(0,2) + ') ' + v.substring(2,7) + '-' + v.substring(7);
    } else if (v.length > 2) {
      this.value = '(' + v.substring(0,2) + ') ' + v.substring(2);
    } else if (v.length > 0) {
      this.value = '(' + v;
    }
  });
}

/* ===== IDENTIFICAÇÃO DO CLIENTE ===== */
async function consultarCliente() {
  var tel = document.getElementById('id-telefone').value.trim();
  var feedback = document.getElementById('id-feedback');

  if (!tel || tel.replace(/\D/g,'').length < 10) {
    feedback.style.display = 'block';
    feedback.style.color = '#e74c3c';
    feedback.textContent = 'Digite um telefone válido.';
    return;
  }

  feedback.style.display = 'block';
  feedback.style.color = 'var(--text-muted)';
  feedback.textContent = 'Consultando...';

  var found = clients.find(function(c) {
    return c.telefone.replace(/\D/g,'') === tel.replace(/\D/g,'');
  });

  if (found) {
    feedback.style.color = 'var(--gold)';
    feedback.textContent = 'Cliente encontrado: ' + found.nome;
    setTimeout(function() {
      closeModal('modal-identificacao');
      openAgendamentoModal(null, found.nome, found.telefone);
    }, 600);
  } else {
    feedback.style.color = '#e74c3c';
    feedback.textContent = 'Cliente não cadastrado. Redirecionando para cadastro...';
    pendingClienteFromIdentificacao = true;
    setTimeout(function() {
      closeModal('modal-identificacao');
      document.getElementById('cl-telefone').value = tel;
      document.getElementById('form-cliente').reset();
      document.getElementById('cl-telefone').value = tel;
      openModal('modal-cliente');
    }, 1000);
  }
}

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
      div.onclick = function() { openAgendamentoParaEditar(a); };

      var corHtml = '';
      if (a.cor) {
        var cores = a.cor.split(',');
        corHtml = '<div class="cor-badges">';
        cores.forEach(function(c) {
          var cc = c.trim();
          if (!cc || cc === 'Nenhuma') return;
          var opt = colorOptions.find(function(o) { return o.code === cc; });
          var hex = opt ? opt.hex : '#888';
          corHtml += '<span class="cor-badge"><span class="cor-swatch-mini" style="background:' + hex + '"></span>' + cc + '</span>';
        });
        corHtml += '</div>';
      }

      div.innerHTML = '<div><span class="time">' + a.hora + '</span><span class="client-name">' + a.cliente + '</span></div>' +
        '<div class="details"><i class="fa-regular fa-user"></i> ' + a.profissional + ' &nbsp; <i class="fa-solid fa-scissors"></i> ' + a.servico + '</div>' +
        '<div class="details"><i class="fa-solid fa-phone"></i> ' + a.telefone + '</div>' +
        corHtml;
      container.appendChild(div);
    });
  }
}

/* ===== AGENDAMENTO MODAL ===== */
function openAgendamentoModal(agId, clienteNome, clienteTel) {
  editingAppointmentId = agId || null;
  document.getElementById('ag-id').value = agId || '';
  document.getElementById('ag-cliente').value = clienteNome || '';
  document.getElementById('ag-telefone').value = clienteTel || '';
  document.getElementById('modal-agendamento-titulo').textContent = agId ? 'Editar Agendamento' : 'Novo Agendamento';

  // Mostrar/esconder botão excluir
  document.getElementById('btn-excluir-agendamento').style.display = agId ? 'flex' : 'none';

  // Reset profissional/servico
  if (!agId) {
    document.getElementById('ag-profissional').value = '';
    document.getElementById('ag-servico').innerHTML = '<option value="">Selecione...</option>';
    document.getElementById('ag-data').value = formatDateInput(new Date(currentYear, currentMonth, selectedDay));
    document.getElementById('ag-hora').value = '';
  }

  // Reset cores
  document.getElementById('grupo-cor').style.display = 'none';
  document.getElementById('cores-container').innerHTML = '';
  document.getElementById('btn-add-cor').classList.remove('disabled');

  openModal('modal-agendamento');
}

function openAgendamentoParaEditar(a) {
  openAgendamentoModal(a.id, a.cliente, a.telefone);

  // Set profissional
  document.getElementById('ag-profissional').value = a.profissional;
  onProfissionalChange();

  // Set servico (after options populated)
  document.getElementById('ag-servico').value = a.servico;
  onServicoChange();

  // Set cores if coloração
  if (a.servico === 'Coloração' && a.cor) {
    var cores = a.cor.split(',').map(function(c) { return c.trim(); }).filter(function(c) { return c && c !== 'Nenhuma'; });
    document.getElementById('cores-container').innerHTML = '';
    if (cores.length > 0) {
      cores.forEach(function(c) {
        adicionarCampoCorComValor(c);
      });
    } else {
      adicionarCampoCor();
    }
    atualizarBtnAddCor();
  }

  document.getElementById('ag-data').value = a.data;
  document.getElementById('ag-hora').value = a.hora;
}

function onProfissionalChange() {
  var prof = document.getElementById('ag-profissional').value;
  var sel = document.getElementById('ag-servico');
  sel.innerHTML = '<option value="">Selecione...</option>';
  var services = professionals[prof] || [];
  services.forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    sel.appendChild(opt);
  });
  onServicoChange();
}

function onServicoChange() {
  var servico = document.getElementById('ag-servico').value;
  var grupoCor = document.getElementById('grupo-cor');
  if (servico === 'Coloração') {
    grupoCor.style.display = 'block';
    if (document.getElementById('cores-container').children.length === 0) {
      adicionarCampoCor();
    }
  } else {
    grupoCor.style.display = 'none';
  }
}

/* ===== COR SELECTION (MULTI) ===== */
function adicionarCampoCor() {
  adicionarCampoCorComValor('');
}

function adicionarCampoCorComValor(valor) {
  var container = document.getElementById('cores-container');
  var count = container.children.length;
  if (count >= 5) return;

  var wrapper = document.createElement('div');
  wrapper.className = 'cor-select-wrapper';

  var display = document.createElement('div');
  display.className = 'cor-select-display';

  var swatch = document.createElement('span');
  swatch.className = 'cor-swatch';

  var label = document.createElement('span');
  label.className = 'cor-label placeholder';
  label.textContent = 'Selecione uma cor';

  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'cor-remove-btn';
  removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  removeBtn.title = 'Remover cor';
  removeBtn.onclick = function(e) {
    e.stopPropagation();
    wrapper.remove();
    atualizarBtnAddCor();
  };

  // Só mostrar remover se tiver mais de 1
  if (count === 0) removeBtn.style.display = 'none';

  display.appendChild(swatch);
  display.appendChild(label);
  display.appendChild(removeBtn);

  var dropdown = document.createElement('div');
  dropdown.className = 'cor-dropdown';

  colorOptions.forEach(function(opt) {
    var item = document.createElement('div');
    item.className = 'cor-option';
    item.innerHTML = '<span class="cor-swatch" style="background:' + opt.hex + ';border:1px solid rgba(255,255,255,0.15);"></span><span>' + opt.code + '</span>';
    item.onclick = function(e) {
      e.stopPropagation();
      swatch.style.background = opt.hex;
      swatch.style.borderStyle = 'solid';
      label.textContent = opt.code;
      label.className = 'cor-label';
      wrapper.dataset.cor = opt.code;
      dropdown.classList.remove('open');
    };
    dropdown.appendChild(item);
  });

  display.onclick = function(e) {
    e.stopPropagation();
    // Fechar outros dropdowns
    document.querySelectorAll('.cor-dropdown.open').forEach(function(d) {
      if (d !== dropdown) d.classList.remove('open');
    });
    dropdown.classList.toggle('open');
  };

  wrapper.appendChild(display);
  wrapper.appendChild(dropdown);

  // Se tem valor, setar
  if (valor) {
    var opt = colorOptions.find(function(o) { return o.code === valor; });
    if (opt) {
      swatch.style.background = opt.hex;
      swatch.style.borderStyle = 'solid';
      label.textContent = opt.code;
      label.className = 'cor-label';
      wrapper.dataset.cor = opt.code;
    }
  }

  container.appendChild(wrapper);

  // Mostrar botão remover em todos se mais de 1
  atualizarRemoveBtns();
  atualizarBtnAddCor();
}

function adicionarCampoCorExtra() {
  var container = document.getElementById('cores-container');
  if (container.children.length >= 5) return;
  adicionarCampoCor();
}

function atualizarBtnAddCor() {
  var container = document.getElementById('cores-container');
  var btn = document.getElementById('btn-add-cor');
  if (container.children.length >= 5) {
    btn.classList.add('disabled');
  } else {
    btn.classList.remove('disabled');
  }
}

function atualizarRemoveBtns() {
  var container = document.getElementById('cores-container');
  var wrappers = container.querySelectorAll('.cor-select-wrapper');
  wrappers.forEach(function(w) {
    var rb = w.querySelector('.cor-remove-btn');
    if (rb) rb.style.display = wrappers.length > 1 ? '' : 'none';
  });
}

function getSelectedCores() {
  var container = document.getElementById('cores-container');
  var wrappers = container.querySelectorAll('.cor-select-wrapper');
  var cores = [];
  wrappers.forEach(function(w) {
    var c = w.dataset.cor;
    if (c && c !== 'Nenhuma') cores.push(c);
  });
  return cores;
}

// Fechar dropdowns ao clicar fora
document.addEventListener('click', function() {
  document.querySelectorAll('.cor-dropdown.open').forEach(function(d) {
    d.classList.remove('open');
  });
});

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

  if (!apt.cliente || !apt.profissional || !apt.servico || !apt.data || !apt.hora) return;

  // Cores
  if (apt.servico === 'Coloração') {
    apt.cor = getSelectedCores().join(',');
  } else {
    apt.cor = '';
  }

  var ok;
  if (editingAppointmentId) {
    ok = await updateAppointment(editingAppointmentId, apt);
    if (!ok) { showToast('Erro ao atualizar agendamento!'); return; }
    showToast('Agendamento atualizado com sucesso!');
  } else {
    ok = await insertAppointment(apt);
    if (!ok) { showToast('Erro ao salvar agendamento!'); return; }
    showToast('Agendamento criado com sucesso!');
  }

  closeModal('modal-agendamento');
  document.getElementById('form-agendamento').reset();
  editingAppointmentId = null;
  await loadAppointments();
  renderCalendar();
  renderDayDetail();
}

/* ===== DELETE APPOINTMENT ===== */
function confirmarExclusao() {
  openModal('modal-confirmar-exclusao');
}

async function excluirAgendamento() {
  if (!editingAppointmentId) return;
  var ok = await deleteAppointment(editingAppointmentId);
  if (!ok) { showToast('Erro ao excluir agendamento!'); return; }

  closeModal('modal-confirmar-exclusao');
  closeModal('modal-agendamento');
  editingAppointmentId = null;
  showToast('Agendamento excluído com sucesso!');
  await loadAppointments();
  renderCalendar();
  renderDayDetail();
}

/* ===== CLEANUP OLD APPOINTMENTS ===== */
async function cleanupOldAppointments() {
  var todayStr = formatDateInput(today);

  // Buscar agendamentos antigos
  var resp = await supabaseClient.from('agendamentos').select('*').lt('data', todayStr);
  if (resp.error || !resp.data || resp.data.length === 0) return;

  // Salvar no histórico
  var historico = resp.data.map(function(a) {
    return {
      cliente: a.cliente,
      telefone: a.telefone,
      profissional: a.profissional,
      servico: a.servico,
      cor: a.cor || '',
      data: a.data,
      hora: a.hora
    };
  });

  await supabaseClient.from('historico_atendimentos').insert(historico);

  // Excluir antigos
  await supabaseClient.from('agendamentos').delete().lt('data', todayStr);
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
    tr.onclick = function() { openHistorico(c); };
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
  var inserted = await insertClient(clientObj);
  if (!inserted) { showToast('Erro ao salvar cliente!'); return; }

  clients.push({ id: inserted.id, nome: nome, telefone: telefone, nascimento: nascimento });
  closeModal('modal-cliente');
  document.getElementById('form-cliente').reset();
  renderClients();
  showToast('Cliente cadastrado com sucesso!');

  // Se veio da identificação, abrir agendamento
  if (pendingClienteFromIdentificacao) {
    pendingClienteFromIdentificacao = null;
    setTimeout(function() {
      openAgendamentoModal(null, nome, telefone);
    }, 500);
  }
}

/* ===== HISTORICO ===== */
async function openHistorico(cliente) {
  var conteudo = document.getElementById('historico-conteudo');
  conteudo.innerHTML = '<p style="color:var(--text-muted)">Carregando...</p>';
  openModal('modal-historico');

  var birthFormatted = cliente.nascimento ? cliente.nascimento.split('-').reverse().join('/') : '-';

  // Buscar do histórico
  var resp = await supabaseClient.from('historico_atendimentos').select('*').eq('cliente', cliente.nome).order('data', { ascending: false });
  var historico = resp.data || [];

  // Buscar agendamentos atuais também
  var resp2 = await supabaseClient.from('agendamentos').select('*').eq('cliente', cliente.nome).order('data', { ascending: false });
  var agendamentos = resp2.data || [];

  var todos = historico.concat(agendamentos);
  todos.sort(function(a, b) { return b.data.localeCompare(a.data); });

  var html = '<div class="historico-info">';
  html += '<p><strong>' + cliente.nome + '</strong></p>';
  html += '<p><i class="fa-solid fa-phone" style="margin-right:6px"></i>' + cliente.telefone + '</p>';
  html += '<p><i class="fa-solid fa-cake-candles" style="margin-right:6px"></i>' + birthFormatted + '</p>';
  html += '</div>';

  if (todos.length === 0) {
    html += '<p style="color:var(--text-muted)">Nenhum atendimento registrado.</p>';
  } else {
    html += '<ul class="historico-lista">';
    todos.forEach(function(h) {
      var dataF = h.data ? h.data.split('-').reverse().join('/') : '-';
      var corInfo = '';
      if (h.cor) {
        var cores = h.cor.split(',').filter(function(c) { return c.trim() && c.trim() !== 'Nenhuma'; });
        if (cores.length > 0) corInfo = ' — Cores: ' + cores.join(', ');
      }
      html += '<li><span class="hist-data">' + dataF + '</span>' + h.servico + ' com ' + h.profissional + corInfo + '</li>';
    });
    html += '</ul>';
  }

  conteudo.innerHTML = html;
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
  // Só restaurar scroll se nenhum outro modal estiver aberto
  var anyOpen = document.querySelector('.modal-overlay.active');
  if (!anyOpen) document.body.style.overflow = '';
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
