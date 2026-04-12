<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RHAI Beauty Salon - Sistema</title>
  <meta name="description" content="Sistema de agendamento do salão RHAI Beauty Salon">
  <link rel="stylesheet" href="estilos.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>

  <!-- Hamburger -->
  <button class="hamburger" id="hamburger"><i class="fa-solid fa-bars"></i></button>

  <!-- Sidebar overlay -->
  <div class="sidebar-overlay" id="sidebar-overlay"></div>

  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
      <button class="close-sidebar" id="close-sidebar"><i class="fa-solid fa-xmark"></i></button>
      <div class="sidebar-header">
        <img src="logo.png" alt="RHAI Beauty Salon">
        <div class="brand">
          <h2>BEAUTY LOUNGE</h2>
          <p>Jurerê</p>
        </div>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-btn active" data-page="agendamentos"><i class="fa-regular fa-calendar"></i> Agendamentos</button>
        <button class="nav-btn" data-page="clientes"><i class="fa-regular fa-address-book"></i> Clientes</button>
        <button class="nav-btn" data-page="profissionais"><i class="fa-solid fa-scissors"></i> Profissionais</button>
      </nav>
      <div class="sidebar-footer">
        <button class="btn-sair" id="btn-sair"><i class="fa-solid fa-right-from-bracket"></i> Sair</button>
      </div>
    </aside>

    <!-- Main -->
    <main class="main-content">

      <!-- AGENDAMENTOS -->
      <div class="page active" id="page-agendamentos">
        <div class="page-header">
          <h2>Agendamentos</h2>
          <button class="btn-novo" id="btn-novo-agendamento"><i class="fa-solid fa-plus"></i> Novo</button>
        </div>
        <div class="agenda-grid">
          <div class="calendar-card">
            <div class="calendar-nav">
              <button id="prev-month">&lt;</button>
              <span class="month-year" id="month-year"></span>
              <button id="next-month">&gt;</button>
            </div>
            <div class="calendar-weekdays">
              <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
            </div>
            <div class="calendar-days" id="calendar-days"></div>
          </div>
          <div class="day-detail-card">
            <div class="day-detail-header" id="day-detail-header">Selecione uma data</div>
            <div id="day-appointments">
              <div class="no-appointments"><i class="fa-regular fa-clock"></i><p>Selecione uma data para ver os agendamentos</p></div>
            </div>
          </div>
        </div>
      </div>

      <!-- CLIENTES -->
      <div class="page" id="page-clientes">
        <div class="page-header">
          <h2>Clientes</h2>
          <button class="btn-novo" id="btn-novo-cliente"><i class="fa-solid fa-plus"></i> Novo Cliente</button>
        </div>
        <div class="birthday-banner" id="birthday-banner" style="display:none;"></div>
        <div class="clients-table-wrapper">
          <table class="clients-table">
            <thead><tr><th>Nome</th><th>Telefone</th><th>Nascimento</th></tr></thead>
            <tbody id="clients-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- PROFISSIONAIS -->
      <div class="page" id="page-profissionais">
        <div class="page-header">
          <h2>Profissionais & Serviços</h2>
        </div>
        <div class="professionals-grid" id="professionals-grid"></div>
      </div>

    </main>
  </div>

  <!-- MODAL: Identificação do Cliente -->
  <div class="modal-overlay" id="modal-identificacao">
    <div class="modal modal-small">
      <div class="modal-header">
        <h3>Identificação do Cliente</h3>
        <button class="modal-close" onclick="closeModal('modal-identificacao')">&times;</button>
      </div>
      <div class="form-group">
        <label>Telefone</label>
        <input type="tel" id="id-telefone" placeholder="(99) 99999-9999">
      </div>
      <div id="id-feedback" style="display:none; margin-bottom:12px; font-size:0.9rem;"></div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeModal('modal-identificacao')">Cancelar</button>
        <button class="btn-submit" onclick="consultarCliente()">Consultar</button>
      </div>
    </div>
  </div>

  <!-- MODAL: Agendamento -->
  <div class="modal-overlay" id="modal-agendamento">
    <div class="modal">
      <div class="modal-header">
        <h3 id="modal-agendamento-titulo">Novo Agendamento</h3>
        <button class="modal-close" onclick="closeModal('modal-agendamento')">&times;</button>
      </div>
      <form id="form-agendamento" onsubmit="saveAppointment(event)">
        <input type="hidden" id="ag-id" value="">
        <div class="form-group">
          <label>Cliente</label>
          <input type="text" id="ag-cliente" required readonly>
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input type="tel" id="ag-telefone" required readonly>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Profissional</label>
            <select id="ag-profissional" onchange="onProfissionalChange()" required>
              <option value="">Selecione...</option>
            </select>
          </div>
          <div class="form-group">
            <label>Serviço</label>
            <select id="ag-servico" onchange="onServicoChange()" required>
              <option value="">Selecione...</option>
            </select>
          </div>
        </div>

        <!-- Grupo de cores (só aparece p/ Coloração) -->
        <div class="form-group" id="grupo-cor" style="display:none;">
          <label>Cor</label>
          <div id="cores-container"></div>
          <button type="button" class="btn-add-cor" id="btn-add-cor" onclick="adicionarCampoCorExtra()">
            <i class="fa-solid fa-circle-plus"></i> Adicionar outra cor
          </button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Data</label>
            <input type="date" id="ag-data" required>
          </div>
          <div class="form-group">
            <label>Hora</label>
            <input type="time" id="ag-hora" required>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-delete" id="btn-excluir-agendamento" onclick="confirmarExclusao()" style="display:none;">
            <i class="fa-solid fa-trash"></i> Excluir Agendamento
          </button>
          <button type="submit" class="btn-submit">Salvar</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Confirmação de exclusão -->
  <div class="modal-overlay" id="modal-confirmar-exclusao">
    <div class="modal modal-small">
      <div class="modal-header">
        <h3>Confirmar Exclusão</h3>
        <button class="modal-close" onclick="closeModal('modal-confirmar-exclusao')">&times;</button>
      </div>
      <p style="color:var(--text-muted); margin-bottom:20px;">Tem certeza que deseja excluir este agendamento?</p>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeModal('modal-confirmar-exclusao')">Não</button>
        <button class="btn-delete" onclick="excluirAgendamento()">Sim, Excluir</button>
      </div>
    </div>
  </div>

  <!-- MODAL: Cliente -->
  <div class="modal-overlay" id="modal-cliente">
    <div class="modal">
      <div class="modal-header">
        <h3>Novo Cliente</h3>
        <button class="modal-close" onclick="closeModal('modal-cliente')">&times;</button>
      </div>
      <form id="form-cliente" onsubmit="saveClient(event)">
        <div class="form-group">
          <label>Nome</label>
          <input type="text" id="cl-nome" required>
        </div>
        <div class="form-group">
          <label>Telefone</label>
          <input type="tel" id="cl-telefone" required>
        </div>
        <div class="form-group">
          <label>Data de Nascimento</label>
          <input type="date" id="cl-nascimento">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" onclick="closeModal('modal-cliente')">Cancelar</button>
          <button type="submit" class="btn-submit">Cadastrar</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Histórico do Cliente -->
  <div class="modal-overlay" id="modal-historico">
    <div class="modal">
      <div class="modal-header">
        <h3>Histórico do Cliente</h3>
        <button class="modal-close" onclick="closeModal('modal-historico')">&times;</button>
      </div>
      <div id="historico-conteudo"></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="supabaseClient.js"></script>
  <script src="script.js"></script>
</body>
</html>
