const bcrypt = require('bcryptjs');
const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight, getClientIp } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);
  if (!ehAdmin(usuario)) return fail('Apenas o administrador pode gerenciar usuários.', 403);

  const supabase = getSupabase();
  const ip = getClientIp(event);

  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome_usuario, nome_completo, perfil, ativo, criado_em')
        .order('criado_em', { ascending: true });
      if (error) throw error;
      return ok(data);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.nome_usuario || !body.nome_completo || !body.senha || !body.perfil) {
        return fail('Preencha usuário, nome completo, senha e perfil.', 400);
      }
      if (!['ADMIN', 'VENDEDORA'].includes(body.perfil)) return fail('Perfil inválido', 400);

      const senha_hash = await bcrypt.hash(body.senha, 10);
      const { data: novo, error } = await supabase
        .from('usuarios')
        .insert({ nome_usuario: body.nome_usuario, nome_completo: body.nome_completo, senha_hash, perfil: body.perfil })
        .select('id, nome_usuario, nome_completo, perfil, ativo')
        .single();
      if (error) throw error;

      await supabase.from('historico').insert({
        usuario_id: usuario.id, nome_usuario: usuario.nome_usuario,
        acao: 'CRIACAO_USUARIO', detalhes: `Usuário ${novo.nome_usuario} criado`, ip,
      });
      return ok(novo, 201);
    }

    if (event.httpMethod === 'PUT') {
      // Editar dados do usuário e/ou resetar senha
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return fail('Informe o id do usuário', 400);

      const updateData = {};
      if (body.nome_completo) updateData.nome_completo = body.nome_completo;
      if (body.perfil) updateData.perfil = body.perfil;
      if (typeof body.ativo === 'boolean') updateData.ativo = body.ativo;
      if (body.nova_senha) updateData.senha_hash = await bcrypt.hash(body.nova_senha, 10);
      updateData.atualizado_em = new Date().toISOString();

      const { data: editado, error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', body.id)
        .select('id, nome_usuario, nome_completo, perfil, ativo')
        .single();
      if (error) throw error;

      await supabase.from('historico').insert({
        usuario_id: usuario.id, nome_usuario: usuario.nome_usuario,
        acao: 'EDICAO_USUARIO',
        detalhes: body.nova_senha ? `Senha de ${editado.nome_usuario} resetada` : `Usuário ${editado.nome_usuario} editado`,
        ip,
      });
      return ok(editado);
    }

    return fail('Método não permitido', 405);
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
