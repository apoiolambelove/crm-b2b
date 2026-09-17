const bcrypt = require('bcryptjs');
const { getSupabase } = require('./utils/db');
const { verificarToken } = require('./utils/auth');
const { ok, fail, preflight, getClientIp } = require('./utils/http');

// Endpoint exclusivo do ADMIN para resetar a senha de uma vendedora.
// Nunca reseta a senha de outra conta ADMIN por aqui — isso é intencional.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Método não permitido', 405);

  const token = event.headers['authorization']?.replace('Bearer ', '');
  if (!token) return fail('Token não fornecido', 401);

  let usuarioToken;
  try {
    usuarioToken = verificarToken(token);
  } catch (e) {
    return fail('Token inválido', 401);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return fail('JSON inválido', 400);
  }

  const { nome_usuario, nova_senha } = body;
  if (!nome_usuario) return fail('Informe o usuário', 400);
  if (!nova_senha || nova_senha.length < 6) {
    return fail('A nova senha deve ter pelo menos 6 caracteres', 400);
  }

  try {
    const supabase = getSupabase();

    // Confirma o perfil direto no banco (não confia só no que está no token)
    const { data: quemPediu, error: erroQuemPediu } = await supabase
      .from('usuarios')
      .select('id, perfil, nome_usuario, ativo')
      .eq('id', usuarioToken.id)
      .maybeSingle();

    if (erroQuemPediu) throw erroQuemPediu;
    if (!quemPediu || !quemPediu.ativo || quemPediu.perfil !== 'ADMIN') {
      return fail('Acesso restrito a administradores', 403);
    }

    const { data: alvo, error: erroAlvo } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('nome_usuario', nome_usuario)
      .maybeSingle();

    if (erroAlvo) throw erroAlvo;
    if (!alvo) return fail('Usuário não encontrado', 404);

    if (alvo.perfil === 'ADMIN') {
      return fail('Não é permitido resetar a senha de uma conta administradora por aqui', 403);
    }

    const nova_senha_hash = await bcrypt.hash(nova_senha, 10);

    const { error: erroUpdate } = await supabase
      .from('usuarios')
      .update({
        senha_hash: nova_senha_hash,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', alvo.id);

    if (erroUpdate) throw erroUpdate;

    await supabase.from('historico').insert({
      usuario_id: alvo.id,
      nome_usuario: alvo.nome_usuario,
      acao: 'RESET_SENHA_ADMIN',
      detalhes: `Senha resetada pelo admin ${quemPediu.nome_usuario}`,
      ip: getClientIp(event),
    });

    return ok({
      mensagem: `Senha de ${alvo.nome_completo || alvo.nome_usuario} redefinida com sucesso.`,
    });
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
