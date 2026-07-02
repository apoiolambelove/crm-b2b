// Wrapper central para falar com as Netlify Functions (rotas /api/*).
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('crm_token');
}

function getUsuario() {
  try { return JSON.parse(localStorage.getItem('crm_usuario') || 'null'); }
  catch { return null; }
}

async function api(path, { method = 'GET', body, params } = {}) {
  let url = `${API_BASE}/${path}`;
  if (params) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));
    if ([...qs].length) url += `?${qs.toString()}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await resp.json(); } catch { /* sem corpo */ }

  if (resp.status === 401) {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_usuario');
    if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
      window.location.href = '/index.html';
    }
  }

  if (!resp.ok) {
    const erro = new Error((data && data.erro) || 'Erro inesperado');
    erro.status = resp.status;
    throw erro;
  }

  return data;
}

// Garante que a página atual só seja vista por quem está logado.
// Use exigirAdmin = true em páginas restritas ao administrador.
function protegerPagina(exigirAdmin = false) {
  const usuario = getUsuario();
  if (!getToken() || !usuario) {
    window.location.href = '/index.html';
    return null;
  }
  if (exigirAdmin && usuario.perfil !== 'ADMIN') {
    window.location.href = '/dashboard.html';
    return null;
  }
  return usuario;
}

function logout() {
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_usuario');
  window.location.href = '/index.html';
}
