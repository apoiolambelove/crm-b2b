<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pedidos · Comercial B2B</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="/css/style.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
</head>
<body>
<div class="app-shell" id="shell"></div>

<script src="/js/api.js"></script>
<script src="/js/ui.js"></script>
<script>
const usuario = protegerPagina();
let pedidosAtuais = [];

if (usuario) {
  document.getElementById('shell').innerHTML = `
    ${montarShell('pedidos', usuario)}
    <main class="main">
      ${montarTopbar('Pedidos', 'Pesquise, edite e acompanhe todos os pedidos')}
      <div class="content">
        <div class="filters-bar">
          <input class="form-control" id="fCliente" placeholder="Cliente">
          <input class="form-control" id="fCidade" placeholder="Cidade">
          <input class="form-control" id="fCnpj" placeholder="CNPJ">
          <input class="form-control" id="fTelefone" placeholder="Telefone">
          <input class="form-control" id="fNumero" placeholder="Nº do pedido" style="width:120px;">
          <select class="form-select" id="fStatus">
            <option value="">Todos os status</option>
            <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
            <option value="VENDA_CONCLUIDA">Venda Concluída</option>
            <option value="PENDENTE_PAGAMENTO">Pendente de Pagamento</option>
            <option value="NAO_EFETIVADA">Não Efetivada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <select class="form-select" id="fPagamento">
            <option value="">Forma de pagamento</option>
            <option value="PIX">PIX</option><option value="TRANSFERENCIA">Transferência</option>
          </select>
          <input type="date" class="form-control" id="fInicio">
          <input type="date" class="form-control" id="fFim">
          <button class="btn-brand btn-sm" onclick="pesquisar()"><i class="fa-solid fa-magnifying-glass"></i> Filtrar</button>
          <button class="btn-outline btn-sm" onclick="limparFiltros()">Limpar</button>
        </div>

        <div class="section-head">
          <h2 id="totalResultados">Pedidos</h2>
          <div style="display:flex; gap:8px;">
            <button class="btn-outline btn-sm" onclick="exportarPDF()"><i class="fa-solid fa-file-pdf"></i> PDF</button>
            <button class="btn-outline btn-sm" onclick="exportarExcel()"><i class="fa-solid fa-file-excel"></i> Excel</button>
            <a href="/novo-pedido.html" class="btn-brand btn-sm" style="text-decoration:none;"><i class="fa-solid fa-plus"></i> Novo Pedido</a>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Nº</th><th>Data</th><th>Empresa</th><th>Cidade</th><th>Valor</th><th>Frete</th><th>Pagamento</th><th>Status</th><th>Comissão</th><th></th>
            </tr></thead>
            <tbody id="corpoTabela"><tr><td colspan="10" class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i>Carregando...</td></tr></tbody>
          </table>
        </div>
      </div>
    </main>`;
  pesquisar();
}

function coletarFiltros() {
  return {
    cliente: document.getElementById('fCliente').value.trim(),
    cidade: document.getElementById('fCidade').value.trim(),
    cnpj: document.getElementById('fCnpj').value.trim(),
    telefone: document.getElementById('fTelefone').value.trim(),
    numero_pedido: document.getElementById('fNumero').value.trim(),
    status: document.getElementById('fStatus').value,
    forma_pagamento: document.getElementById('fPagamento').value,
    data_inicio: document.getElementById('fInicio').value,
    data_fim: document.getElementById('fFim').value,
  };
}

function limparFiltros() {
  ['fCliente','fCidade','fCnpj','fTelefone','fNumero','fStatus','fPagamento','fInicio','fFim'].forEach((id) => document.getElementById(id).value = '');
  pesquisar();
}

async function pesquisar() {
  const corpo = document.getElementById('corpoTabela');
  corpo.innerHTML = `<tr><td colspan="10" class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i>Buscando...</td></tr>`;
  try {
    const dados = await api('pedidos', { params: coletarFiltros() });
    pedidosAtuais = dados;
    document.getElementById('totalResultados').textContent = `Pedidos (${dados.length})`;
    if (!dados.length) {
      corpo.innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="fa-solid fa-inbox"></i>Nenhum pedido encontrado com esses filtros.</div></td></tr>`;
      return;
    }
    corpo.innerHTML = dados.map(linhaPedido).join('');
  } catch (err) {
    corpo.innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>${err.message}</div></td></tr>`;
  }
}

function linhaPedido(p) {
  const podeEditar = usuario.perfil === 'ADMIN' || p.status === 'AGUARDANDO_APROVACAO';
  const isAdmin = usuario.perfil === 'ADMIN';

  const seletorStatus = isAdmin ? `
    <select class="form-select" style="font-size:12px; padding:4px 8px;" onchange="alterarStatus('${p.id}', this.value)">
      ${['AGUARDANDO_APROVACAO','VENDA_CONCLUIDA','PENDENTE_PAGAMENTO','NAO_EFETIVADA','CANCELADA'].map((s) =>
        `<option value="${s}" ${s === p.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}
    </select>` : badgeStatus(p.status);

  return `
    <tr>
      <td class="num">#${p.numero_pedido}</td>
      <td>${formatarDataBR(p.data_pedido)}</td>
      <td><strong>${p.nome_empresa}</strong><div style="font-size:11px; color:var(--ink-soft);">${p.cidade || ''}${p.cidade && p.estado ? '/' : ''}${p.estado || ''}</div></td>
      <td>${p.cidade || '-'}</td>
      <td class="num">${formatarMoeda(p.valor_total)}</td>
      <td class="num">${formatarMoeda(p.valor_frete || 0)}</td>
      <td>${PAGAMENTO_LABEL[p.forma_pagamento] || p.forma_pagamento}</td>
      <td>${seletorStatus}</td>
      <td class="num">${formatarMoeda(p.valor_comissao)} <span style="font-size:10px; color:var(--ink-soft);">${p.comissao_status === 'APROVADA' ? '· aprovada' : '· pendente'}</span></td>
      <td style="white-space:nowrap;">
        ${podeEditar ? `<a class="icon-btn" href="/novo-pedido.html?id=${p.id}" title="Editar"><i class="fa-solid fa-pen"></i></a>` : ''}
        ${isAdmin ? `<button class="icon-btn" onclick="excluirPedido('${p.id}', ${p.numero_pedido})" title="Excluir" style="color:var(--coral);"><i class="fa-solid fa-trash"></i></button>` : ''}
      </td>
    </tr>`;
}

async function alterarStatus(id, status) {
  try {
    await api('pedidos', { method: 'PATCH', body: { id, status } });
    toast('Status atualizado.');
    pesquisar();
  } catch (err) {
    toast(err.message, 'error');
    pesquisar();
  }
}

async function excluirPedido(id, numero) {
  if (!confirm(`Confirma a exclusão definitiva do pedido #${numero}? Esta ação não pode ser desfeita.`)) return;
  try {
    await api('pedidos', { method: 'DELETE', params: { id } });
    toast('Pedido excluído.');
    pesquisar();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function carregarLogoBase64() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = '/img/logo.png';
  });
}

async function exportarPDF() {
  if (!pedidosAtuais.length) return toast('Nada para exportar.', 'error');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const nomeUsuario = usuario.nome_completo || usuario.nome_usuario;
  const hoje = new Date().toLocaleDateString('pt-BR');

  const totalVendido = pedidosAtuais.reduce((s, p) => s + Number(p.valor_total || 0), 0);
  const totalFrete = pedidosAtuais.reduce((s, p) => s + Number(p.valor_frete || 0), 0);
  const valorAReceber = pedidosAtuais.filter((p) => p.comissao_status === 'APROVADA').reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
  const valorPendenteComissao = pedidosAtuais.reduce((s, p) => s + Number(p.valor_comissao || 0), 0) - valorAReceber;

  const logo = await carregarLogoBase64();
  if (logo) doc.addImage(logo, 'PNG', 14, 8, 20, 20);

  doc.setFontSize(15);
  doc.text('Relatório de Pedidos LambeLove', logo ? 38 : 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Emitido em: ${hoje}`, logo ? 38 : 14, 22);
  doc.text(`Gerado por: ${nomeUsuario}`, logo ? 38 : 14, 27);
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.text(`Total vendido: ${formatarMoeda(totalVendido)}   |   Frete: ${formatarMoeda(totalFrete)}`, 14, 36);
  doc.setTextColor(15, 76, 69);
  doc.text(`Comissão a Receber (Vendas Concluídas): ${formatarMoeda(valorAReceber)}`, 14, 42);
  doc.setTextColor(184, 108, 26);
  doc.text(`Comissão Pendente (Não Confirmada): ${formatarMoeda(valorPendenteComissao)}`, 14, 48);
  doc.setTextColor(0);

  doc.autoTable({
    startY: 54,
    head: [['Nº', 'Data', 'Empresa', 'Cidade', 'Valor', 'Frete', 'Pagamento', 'Status', 'Comissão']],
    body: pedidosAtuais.map((p) => [
      p.numero_pedido, formatarDataBR(p.data_pedido), p.nome_empresa, p.cidade || '-',
      formatarMoeda(p.valor_total), formatarMoeda(p.valor_frete || 0), PAGAMENTO_LABEL[p.forma_pagamento] || p.forma_pagamento,
      STATUS_LABEL[p.status], formatarMoeda(p.valor_comissao) + (p.comissao_status === 'APROVADA' ? ' (a receber)' : ' (pendente)'),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 76, 69] },
  });
  doc.save('pedidos.pdf');
}

function exportarExcel() {
  if (!pedidosAtuais.length) return toast('Nada para exportar.', 'error');
  const linhas = pedidosAtuais.map((p) => ({
    'Nº Pedido': p.numero_pedido, 'Data': formatarDataBR(p.data_pedido), 'Empresa': p.nome_empresa,
    'CNPJ': p.cnpj, 'Cidade': p.cidade, 'Estado': p.estado, 'Valor Total': p.valor_total, 'Frete': p.valor_frete || 0,
    'Forma de Pagamento': PAGAMENTO_LABEL[p.forma_pagamento] || p.forma_pagamento,
    'Status': STATUS_LABEL[p.status], 'Comissão (15%)': p.valor_comissao,
    'Situação da Comissão': p.comissao_status === 'APROVADA' ? 'A Receber (Venda Concluída)' : 'Pendente (Não Confirmada)',
  }));
  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
  XLSX.writeFile(wb, 'pedidos.xlsx');
}
</script>
</body>
</html>
