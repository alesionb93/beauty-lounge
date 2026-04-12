import { supabase } from './supabaseClient.js'

/* ===== DATA ===== */
var professionals = {
  'Rhai': ['Nanopigmentação','Design de sobrancelhas','Henna','Coloração de sobrancelhas','Epilação Buço','Epilação Queixo','Epilação Rosto','Lash lifting','Brow lamination','Mega Hair','Escova','Babyliss'],
  'Rubia': ['Tratamento capilar','Botox capilar / Progressiva','Coloração'],
  'Pablo': ['Corte','Mechas','Penteado','Escova','Babyliss']
};

var MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

var today = new Date();
var currentMonth = today.getMonth();
var currentYear = today.getFullYear();
var selectedDay = today.getDate();

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', function() {
  if (!sessionStorage.getItem('logged')) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('form-agendamento').addEventListener('submit', saveAppointment);
  document.getElementById('form-cliente').addEventListener('submit', saveClient);

  renderCalendar();
  renderDayDetail();
});

/* ===== CALENDAR ===== */
function renderCalendar() {
  var container = document.getElementById('calendar-days');
  container.innerHTML = '';
  var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (var d = 1; d <= daysInMonth; d++) {
    var btn = document.createElement('button');
    btn.textContent = d;

    btn.addEventListener('click', function() {
      selectedDay = parseInt(this.textContent);
      renderDayDetail();
    });

    container.appendChild(btn);
  }
}

/* ===== BUSCAR AGENDAMENTOS DO BANCO ===== */
async function renderDayDetail() {
  var dateStr = currentYear + '-' + pad(currentMonth + 1) + '-' + pad(selectedDay);

  const { data, error } = await supabase
    .from('agendamentos')
    .select(`
      *,
      clientes (
        nome,
        telefone
      )
    `)
    .eq('data', dateStr);

  if (error) {
    console.log(error);
    return;
  }

  var container = document.getElementById('day-appointments');
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = 'Nenhum agendamento';
    return;
  }

  data.forEach(function(a) {
    var div = document.createElement('div');
    div.innerHTML =
      a.horario + ' - ' +
      a.clientes.nome + ' - ' +
      a.profissional + ' - ' +
      a.servico;

    container.appendChild(div);
  });
}

/* ===== SALVAR CLIENTE ===== */
async function saveClient(e) {
  e.preventDefault();

  var nome = document.getElementById('cl-nome').value;
  var telefone = document.getElementById('cl-telefone').value;
  var nascimento = document.getElementById('cl-nascimento').value;

  const { error } = await supabase
    .from('clientes')
    .upsert([{ nome, telefone, data_nascimento: nascimento }], {
      onConflict: 'telefone'
    });

  if (error) {
    alert('Erro ao salvar cliente');
    console.log(error);
  } else {
    alert('Cliente salvo!');
  }
}

/* ===== SALVAR AGENDAMENTO ===== */
async function saveAppointment(e) {
  e.preventDefault();

  var nome = document.getElementById('ag-cliente').value;
  var telefone = document.getElementById('ag-telefone').value;
  var profissional = document.getElementById('ag-profissional').value;
  var servico = document.getElementById('ag-servico').value;
  var data = document.getElementById('ag-data').value;
  var horario = document.getElementById('ag-hora').value;

  // 1. cria ou pega cliente
  const { data: clienteData, error: erroCliente } = await supabase
    .from('clientes')
    .upsert([{ nome, telefone }], { onConflict: 'telefone' })
    .select();

  if (erroCliente) {
    console.log(erroCliente);
    return;
  }

  const clienteId = clienteData[0].id;

  // 2. cria agendamento
  const { error } = await supabase
    .from('agendamentos')
    .insert([
      {
        cliente_id: clienteId,
        profissional,
        servico,
        data,
        horario
      }
    ]);

  if (error) {
    alert('Erro ao agendar');
    console.log(error);
  } else {
    alert('Agendamento criado!');
    renderDayDetail();
  }
}

/* ===== UTILS ===== */
function pad(n) { return n < 10 ? '0' + n : '' + n; }
