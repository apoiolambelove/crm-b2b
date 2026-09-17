const bcrypt = require('bcryptjs');
const { getSupabase } = require('./utils/db');
const { verificarToken } = require('./utils/auth');
const { ok, fail, preflight, getClientIp } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Método não permitido', 405);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return fail('JSON inválido', 400);
  }

  // Verifica autenticação
  const token = event.headers['authorization']?.replace('Bearer ', '');
  if (!token) return fail('Token não fornecido', 401);

  let usuarioToken;
  try {
    usuarioToken = verificarToken(token);
  } catch (e) {
    return fail('Token inválido', 401);
  }

  const { senha_antiga, senha_nova, confirmar_senha } = body;

  // Validações
  if (!senha_antiga) return fail('Informe a senha antiga', 400);
  if (!senha_nova) return fail('Informe a nova senha', 400);
  if (!confirmar_senha) return fail('Confirme a nova senha', 400);
  
  if (senha_nova.length < 6) {
    return fail('A nova senha deve ter pelo menos 6 caracteres', 400);
  }

  if (senha_nova !== confirmar_senha) {
    return fail('As senhas não conferem', 400);
  }

  if (senha_nova === senha_antiga) {
    return fail('A nova senha não pode ser igual à senha antiga', 400);
  }

  try {
    const supabase = getSupabase();

    // Busca o usuário
    const { data: usuario, error: erroUsuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuarioToken.id)
      .eq('ativo', true)
      .maybeSingle();

    if (erroUsuario) throw erroUsuario;
    if (!usuario) return fail('Usuário não encontrado', 404);

    // Valida a senha antiga
    const senhaAntigaOk = await bcrypt.compare(senha_antiga, usuario.senha_hash);
    if (!senhaAntigaOk) return fail('Senha antiga inválida', 401);

    // Hash da nova senha
    const nova_senha_hash = await bcrypt.hash(senha_nova, 10);

    // Atualiza a senha e marca como não primeira vez login
    const { error: erroUpdate } = await supabase
      .from('usuarios')
      .update({
        senha_hash: nova_senha_hash,
        primeira_vez_login: false,
        primeiro_acesso_em: usuario.primeira_vez_login ? new Date().toISOString() : usuario.primeiro_acesso_em,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', usuario.id);

    if (erroUpdate) throw erroUpdate;

    // Registra no histórico
    await supabase.from('historico').insert({
      usuario_id: usuario.id,
      nome_usuario: usuario.nome_usuario,
      acao: 'ALTERAR_SENHA',
      detalhes: usuario.primeira_vez_login ? 'Alterou senha no primeiro acesso' : 'Alterou senha',
      ip: getClientIp(event),
    });

    return ok({
      mensagem: 'Senha alterada com sucesso!',
      usuario: {
        id: usuario.id,
        nome_usuario: usuario.nome_usuario,
        nome_completo: usuario.nome_completo,
        perfil: usuario.perfil,
        primeira_vez_login: false,
      },
    });
  } catch (e) {
    console.error('Erro ao alterar senha:', e);
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
