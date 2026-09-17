const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';
const EXPIRES_IN = '8h'; // logout automático por expiração de sessão

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nome_usuario: usuario.nome_usuario, perfil: usuario.perfil, nome_completo: usuario.nome_completo },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

// Lê e valida o token Bearer enviado no header Authorization.
// Retorna o payload decodificado ou null se inválido/ausente.
function autenticar(event) {
  const auth = event.headers.authorization || event.headers.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

function ehAdmin(usuario) {
  return !!usuario && usuario.perfil === 'ADMIN';
}

module.exports = { gerarToken, autenticar, ehAdmin };
