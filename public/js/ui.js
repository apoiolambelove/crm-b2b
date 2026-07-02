// ---------- Toasts ----------
function toast(mensagem, tipo = 'success') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast-msg ${tipo}`;
  const icon = tipo === 'success' ? 'fa-circle-check' : tipo === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${mensagem}</span>`;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 250); }, 3200);
}

// ---------- Tema claro/escuro ----------
function initTheme() {
  const salvo = localStorage.getItem('crm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', salvo);
}
function toggleTheme() {
  const atual = document.documentElement.getAttribute('data-theme') || 'light';
  const novo = atual === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', novo);
  localStorage.setItem('crm_theme', novo);
}
initTheme();

// ---------- Formatação ----------
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatarDataBR(iso) {
  if (!iso) return '-';
  const [ano, mes, dia] = iso.split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}
function formatarHora(h) {
  if (!h) return '-';
  return h.slice(0, 5);
}

const STATUS_LABEL = {
  AGUARDANDO_APROVACAO: 'Aguardando Aprovação',
  VENDA_CONCLUIDA: 'Venda Concluída',
  PENDENTE_PAGAMENTO: 'Pendente de Pagamento',
  NAO_EFETIVADA: 'Não Efetivada',
  CANCELADA: 'Cancelada',
};
const STATUS_CLASS = {
  AGUARDANDO_APROVACAO: 'st-aguardando',
  VENDA_CONCLUIDA: 'st-concluida',
  PENDENTE_PAGAMENTO: 'st-pendente_pagamento',
  NAO_EFETIVADA: 'st-nao_efetivada',
  CANCELADA: 'st-cancelada',
};
function badgeStatus(status) {
  return `<span class="badge-status ${STATUS_CLASS[status] || ''}">${STATUS_LABEL[status] || status}</span>`;
}

const PAGAMENTO_LABEL = {
  PIX: 'PIX', BOLETO: 'Boleto', CARTAO: 'Cartão', DINHEIRO: 'Dinheiro',
  TRANSFERENCIA: 'Transferência', OUTROS: 'Outros',
};

// ---------- Sidebar / shell comum ----------
function montarShell(paginaAtiva, usuario) {
  const isAdmin = usuario.perfil === 'ADMIN';
  const iniciais = usuario.nome_completo.slice(0, 2).toUpperCase();

  const links = [
    { id: 'dashboard', href: '/dashboard.html', icon: 'fa-gauge-high', label: 'Dashboard' },
    { id: 'novo-pedido', href: '/novo-pedido.html', icon: 'fa-circle-plus', label: 'Novo Pedido' },
    { id: 'pedidos', href: '/pedidos.html', icon: 'fa-list-check', label: 'Pedidos' },
    { id: 'clientes', href: '/clientes.html', icon: 'fa-address-book', label: 'Clientes' },
    { id: 'relatorios', href: '/relatorios.html', icon: 'fa-chart-column', label: 'Relatório Mensal' },
    { id: 'comissoes', href: '/comissoes.html', icon: 'fa-hand-holding-dollar', label: 'Comissões' },
  ];
  if (isAdmin) links.push({ id: 'historico', href: '/historico.html', icon: 'fa-clock-rotate-left', label: 'Histórico' });
  if (isAdmin) links.push({ id: 'usuarios', href: '/usuarios.html', icon: 'fa-users-gear', label: 'Usuários' });

  const navHtml = links.map((l) => `
    <a class="nav-link ${l.id === paginaAtiva ? 'active' : ''}" href="${l.href}">
      <i class="fa-solid ${l.icon}"></i> ${l.label}
    </a>`).join('');

  return `
  <aside class="sidebar" id="sidebar">
    <div class="brand"><img src="/img/logo.png" class="brand-logo" alt="LambeLove"> LambeLove</div>
    <nav>${navHtml}</nav>
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="avatar">${iniciais}</div>
        <div>
          <div style="font-weight:600;">${usuario.nome_completo}</div>
          <div style="opacity:.7; font-size:11px;">${isAdmin ? 'Administrador' : 'Vendedora'}</div>
        </div>
      </div>
      <button class="logout-btn" onclick="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Sair</button>
    </div>
  </aside>`;
}

function montarTopbar(titulo, subtitulo) {
  return `
  <div class="topbar">
    <div>
      <button class="icon-btn d-mobile-only" id="btnMenu" style="display:none; margin-right:10px;"><i class="fa-solid fa-bars"></i></button>
      <h1>${titulo}</h1>
      <div class="subtitle">${subtitulo || ''}</div>
    </div>
    <button class="theme-toggle" onclick="toggleTheme()"><i class="fa-solid fa-circle-half-stroke"></i> Tema</button>
  </div>`;
}

function aplicarPermissoesUI(usuario) {
  if (usuario.perfil !== 'ADMIN') {
    document.querySelectorAll('.somente-admin').forEach((el) => el.remove());
  }
}
