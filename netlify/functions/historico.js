const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return fail('Método não permitido', 405);

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);
  if (!ehAdmin(usuario)) return fail('Apenas o administrador pode ver o histórico.', 403);

  const supabase = getSupabase();
  const params = event.queryStringParameters || {};

  try {
    let query = supabase.from('historico').select('*').order('criado_em', { ascending: false }).limit(300);
    if (params.pedido_id) query = query.eq('pedido_id', params.pedido_id);
    const { data, error } = await query;
    if (error) throw error;
    return ok(data);
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
