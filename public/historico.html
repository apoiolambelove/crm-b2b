<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Histórico · Comercial B2B</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="app-shell" id="shell"></div>

<script src="/js/api.js"></script>
<script src="/js/ui.js"></script>
<script>
const usuario = protegerPagina(true);
if (usuario) {
  document.getElementById('shell').innerHTML = `
    ${montarShell('historico', usuario)}
    <main class="main">
      ${montarTopbar('Histórico', 'Toda alteração fica registrada permanentemente e nunca é apagada')}
      <div class="content">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data / Hora</th><th>Usuário</th><th>Ação</th><th>Detalhes</th><th>IP</th></tr></thead>
            <tbody id="corpoHistorico"><tr><td colspan="5" class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i>Carregando...</td></tr></tbody>
          </table>
        </div>
      </div>
    </main>`;
  carregarHistorico();
}

const ACAO_LABEL = {
  LOGIN: 'Login', CRIACAO: 'Pedido criado', EDICAO: 'Pedido editado',
  ALTERACAO_STATUS: 'Status alterado', EXCLUSAO: 'Pedido excluído',
  CRIACAO_USUARIO: 'Usuário criado', EDICAO_USUARIO: 'Usuário editado',
};

async function carregarHistorico() {
  const corpo = document.getElementById('corpoHistorico');
  try {
    const dados = await api('historico');
    if (!dados.length) {
      corpo.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-inbox"></i>Nenhum registro ainda.</div></td></tr>`;
      return;
    }
    corpo.innerHTML = dados.map((h) => `
      <tr>
        <td class="num">${new Date(h.criado_em).toLocaleString('pt-BR')}</td>
        <td>${h.nome_usuario || '-'}</td>
        <td>${ACAO_LABEL[h.acao] || h.acao}</td>
        <td>${h.detalhes || '-'}</td>
        <td class="num" style="color:var(--ink-soft);">${h.ip || '-'}</td>
      </tr>`).join('');
  } catch (err) {
    corpo.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>${err.message}</div></td></tr>`;
  }
}
</script>
</body>
</html>
