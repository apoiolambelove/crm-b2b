<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clientes · LambeLove</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap-grid.min.css">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="app-shell" id="shell"></div>

<script src="/js/api.js"></script>
<script src="/js/ui.js"></script>
<script src="/js/masks.js"></script>
<script>
const usuario = protegerPagina();

if (usuario) {
  document.getElementById('shell').innerHTML = `
    ${montarShell('clientes', usuario)}
    <main class="main">
      ${montarTopbar('Clientes', 'Cadastre seus clientes uma vez e use na hora de fazer o pedido')}
      <div class="content">
        <div class="card" style="margin-bottom:20px;">
          <div class="card-body" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input class="form-control" id="fBusca" placeholder="Buscar por nome ou CNPJ..." style="flex:1; min-width:220px;">
            <button class="btn-brand btn-sm" onclick="abrirNovo()"><i class="fa-solid fa-user-plus"></i> Novo Cliente</button>
          </div>
        </div>

        <div class="table-wrap" style="margin-bottom:26px;">
          <table>
            <thead><tr><th>Empresa</th><th>CNPJ</th><th>Telefone</th><th>Cidade/UF</th><th></th></tr></thead>
            <tbody id="corpoClientes"><tr><td colspan="5" class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i>Carregando...</td></tr></tbody>
          </table>
        </div>

        <div class="card" id="cardForm" style="display:none;">
          <div class="card-body">
            <h3 id="tituloForm" style="font-size:15px; margin-top:0;">Novo Cliente</h3>
            <form id="formCliente">
              <input type="hidden" id="cid">
              <div class="form-section-title"><i class="fa-solid fa-building"></i> Dados da Empresa</div>
              <div class="row g-3" style="margin-bottom:6px;">
                <div class="col-md-6"><label class="form-label">Nome da Empresa *</label><input class="form-control" id="nome_empresa" required></div>
                <div class="col-md-3"><label class="form-label">CNPJ</label><input class="form-control" id="cnpj"></div>
                <div class="col-md-3"><label class="form-label">Inscrição Estadual</label><input class="form-control" id="inscricao_estadual"></div>
                <div class="col-md-4"><label class="form-label">Nome do Sócio/Contato</label><input class="form-control" id="nome_socio"></div>
                <div class="col-md-4"><label class="form-label">Telefone</label><input class="form-control" id="telefone"></div>
                <div class="col-md-4"><label class="form-label">WhatsApp</label><input class="form-control" id="whatsapp"></div>
                <div class="col-md-6"><label class="form-label">E-mail</label><input class="form-control" id="email"></div>
              </div>

              <div class="form-section-title"><i class="fa-solid fa-location-dot"></i> Endereço</div>
              <div class="row g-3">
                <div class="col-md-3">
                  <label class="form-label">CEP</label><input class="form-control" id="cep">
                  <div id="cepStatus" style="font-size:11px; color:var(--ink-soft); margin-top:4px;"></div>
                </div>
                <div class="col-md-6"><label class="form-label">Endereço</label><input class="form-control" id="endereco"></div>
                <div class="col-md-3"><label class="form-label">Número</label><input class="form-control" id="numero"></div>
                <div class="col-md-4"><label class="form-label">Complemento</label><input class="form-control" id="complemento"></div>
                <div class="col-md-4"><label class="form-label">Bairro</label><input class="form-control" id="bairro"></div>
                <div class="col-md-3"><label class="form-label">Cidade</label><input class="form-control" id="cidade"></div>
                <div class="col-md-1"><label class="form-label">UF</label><input class="form-control" id="estado" maxlength="2" style="text-transform:uppercase;"></div>
              </div>

              <div style="display:flex; gap:8px; margin-top:20px;">
                <button type="submit" class="btn-brand" id="btnSalvarCliente"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>
                <button type="button" class="btn-outline" onclick="fecharForm()">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>`;

  configurarCepCliente();
  carregarClientes();
  document.getElementById('formCliente').addEventListener('submit', salvarCliente);
  document.getElementById('fBusca').addEventListener('input', debounce(() => carregarClientes(document.getElementById('fBusca').value), 300));
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function configurarCepCliente() {
  const cepInput = document.getElementById('cep');
  aplicarMascaraEmTempoReal(cepInput, mascararCep);
  aplicarMascaraEmTempoReal(document.getElementById('cnpj'), mascararCnpj);
  aplicarMascaraEmTempoReal(document.getElementById('telefone'), mascararTelefone);
  aplicarMascaraEmTempoReal(document.getElementById('whatsapp'), mascararTelefone);
  cepInput.addEventListener('blur', async () => {
    const status = document.getElementById('cepStatus');
    const limpo = cepInput.value.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    status.textContent = 'Buscando endereço...';
    const dados = await consultarCep(cepInput.value);
    if (dados) {
      document.getElementById('endereco').value = dados.endereco || '';
      document.getElementById('bairro').value = dados.bairro || '';
      document.getElementById('cidade').value = dados.cidade || '';
      document.getElementById('estado').value = dados.estado || '';
      status.textContent = 'Endereço preenchido automaticamente (ViaCEP).';
      document.getElementById('numero').focus();
    } else {
      status.textContent = 'CEP não encontrado. Preencha manualmente.';
    }
  });
}

async function carregarClientes(busca) {
  const corpo = document.getElementById('corpoClientes');
  corpo.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i>Buscando...</td></tr>`;
  try {
    const lista = await api('clientes' + (busca ? '?busca=' + encodeURIComponent(busca) : ''));
    if (!lista.length) {
      corpo.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-inbox"></i>Nenhum cliente encontrado.</div></td></tr>`;
      return;
    }
    corpo.innerHTML = lista.map((c) => `
      <tr>
        <td><strong>${c.nome_empresa}</strong>${c.nome_socio ? `<div style="font-size:11.5px; color:var(--ink-soft);">${c.nome_socio}</div>` : ''}</td>
        <td>${c.cnpj || '-'}</td>
        <td>${c.telefone || c.whatsapp || '-'}</td>
        <td>${c.cidade ? c.cidade + '/' + (c.estado || '') : '-'}</td>
        <td><button class="icon-btn" onclick='abrirEdicao(${JSON.stringify(c)})' title="Editar"><i class="fa-solid fa-pen"></i></button></td>
      </tr>`).join('');
  } catch (err) {
    corpo.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>${err.message}</div></td></tr>`;
  }
}

function abrirNovo() {
  document.getElementById('formCliente').reset();
  document.getElementById('cid').value = '';
  document.getElementById('tituloForm').textContent = 'Novo Cliente';
  document.getElementById('cardForm').style.display = 'block';
  document.getElementById('cardForm').scrollIntoView({ behavior: 'smooth' });
}

function abrirEdicao(c) {
  document.getElementById('formCliente').reset();
  Object.keys(c).forEach((k) => { const el = document.getElementById(k); if (el) el.value = c[k] ?? ''; });
  document.getElementById('cid').value = c.id;
  document.getElementById('tituloForm').textContent = 'Editar Cliente';
  document.getElementById('cardForm').style.display = 'block';
  document.getElementById('cardForm').scrollIntoView({ behavior: 'smooth' });
}

function fecharForm() {
  document.getElementById('cardForm').style.display = 'none';
}

async function salvarCliente(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSalvarCliente');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

  const payload = {
    nome_empresa: val('nome_empresa'), cnpj: val('cnpj'), inscricao_estadual: val('inscricao_estadual'),
    nome_socio: val('nome_socio'), telefone: val('telefone'), whatsapp: val('whatsapp'), email: val('email'),
    cep: val('cep'), endereco: val('endereco'), numero: val('numero'), complemento: val('complemento'),
    bairro: val('bairro'), cidade: val('cidade'), estado: val('estado'),
  };

  const id = val('cid');
  try {
    if (id) {
      await api('clientes', { method: 'PUT', body: { id, ...payload } });
      toast('Cliente atualizado!', 'success');
    } else {
      await api('clientes', { method: 'POST', body: payload });
      toast('Cliente cadastrado!', 'success');
    }
    fecharForm();
    carregarClientes(document.getElementById('fBusca').value);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar';
  }
}

function val(id) { return document.getElementById(id).value.trim(); }
</script>
</body>
</html>
