const bcrypt = require('bcryptjs');
const { getSupabase } = require('./utils/db');
const { gerarToken } = require('./utils/auth');
const { ok, fail, preflight, getClientIp } = require('./utils/http');

// Seed inicial: roda sozinho na primeira chamada de login se a tabela
// usuarios ainda estiver vazia. As senhas nunca ficam em texto puro:
// são criptografadas com BCrypt antes de ir para o banco.
async function seedInicial(supabase) {
  const { count, error } = await supabase.from('usuarios').select('id', { count: 'exact', head: true });
  if (error) throw error;
  if (count && count > 0) return;

  const seedUsers = [
    { nome_usuario: 'Alessandra', nome_completo: 'Alessandra', senha: 'Favilla', perfil: 'VENDEDORA' },
    { nome_usuario: 'Lambelove', nome_completo: 'Lambelove (Administrador)', senha: 'Julian@13', perfil: 'ADMIN' },
  ];

  for (const u of seedUsers) {
    const senha_hash = await bcrypt.hash(u.senha, 10);
    const { error: insErr } = await supabase
      .from('usuarios')
      .insert({ nome_usuario: u.nome_usuario, nome_completo: u.nome_completo, senha_hash, perfil: u.perfil });
    if (insErr) throw insErr;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Método não permitido', 405);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return fail('JSON inválido', 400);
  }

  const { nome_usuario, senha } = body;
  if (!nome_usuario || !senha) return fail('Informe usuário e senha', 400);

  try {
    const supabase = getSupabase();
    await seedInicial(supabase);

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .ilike('nome_usuario', nome_usuario)
      .eq('ativo', true)
      .maybeSingle();

    if (error) throw error;
    if (!usuario) return fail('Usuário ou senha inválidos', 401);

    const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaOk) return fail('Usuário ou senha inválidos', 401);

    const token = gerarToken(usuario);

    await supabase.from('historico').insert({
      usuario_id: usuario.id,
      nome_usuario: usuario.nome_usuario,
      acao: 'LOGIN',
      detalhes: 'Login realizado com sucesso',
      ip: getClientIp(event),
    });

    return ok({
      token,
      usuario: {
        id: usuario.id,
        nome_usuario: usuario.nome_usuario,
        nome_completo: usuario.nome_completo,
        perfil: usuario.perfil,
      },
    });
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
