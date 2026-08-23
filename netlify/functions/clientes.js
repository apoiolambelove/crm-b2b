const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const supabase = getSupabase();
  const admin = ehAdmin(usuario);

  try {
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};

      if (params.id) {
        const { data, error } = await supabase.from('clientes').select('*').eq('id', params.id).maybeSingle();
        if (error) throw error;
        if (!data) return fail('Cliente não encontrado.', 404);
        if (!admin && data.criado_por !== usuario.id) {
          return fail('Você não tem permissão para ver este cliente.', 403);
        }
        return ok(data);
      }

      let query = supabase.from('clientes').select('*').order('nome_empresa', { ascending: true });

      // Vendedora só vê/busca os próprios clientes; Administrador vê todos.
      if (!admin) query = query.eq('criado_por', usuario.id);

      // Busca usada tanto pela tela de Clientes quanto pelo autocomplete do Novo Pedido.
      if (params.busca) {
        const termo = params.busca.trim();
        query = query.or(`nome_empresa.ilike.%${termo}%,cnpj.ilike.%${termo}%`);
      }

      const limite = params.limite ? Number(params.limite) : 500;
      const { data, error } = await query.limit(limite);
      if (error) throw error;

      // Para o Administrador, anexa o nome de quem cadastrou cada cliente.
      if (admin && data.length) {
        const { data: usuariosLista } = await supabase.from('usuarios').select('id, nome_completo');
        const nomesPorId = Object.fromEntries((usuariosLista || []).map((u) => [u.id, u.nome_completo]));
        return ok(data.map((c) => ({ ...c, criado_por_nome: nomesPorId[c.criado_por] || '—' })));
      }

      return ok(data);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.nome_empresa) return fail('Informe o nome da empresa.', 400);

      if (body.cnpj) {
        // Verifica duplicidade apenas dentro dos próprios clientes da vendedora
        // (Admin verifica em toda a base), para não revelar cadastros alheios.
        let dupQuery = supabase.from('clientes').select('id').eq('cnpj', body.cnpj);
        if (!admin) dupQuery = dupQuery.eq('criado_por', usuario.id);
        const { data: existente } = await dupQuery.maybeSingle();
        if (existente) return fail('Já existe um cliente cadastrado com esse CNPJ.', 409);
      }

      const { data, error } = await supabase.from('clientes').insert({
        nome_empresa: body.nome_empresa, cnpj: body.cnpj || null, inscricao_estadual: body.inscricao_estadual || null,
        nome_socio: body.nome_socio || null, telefone: body.telefone || null, whatsapp: body.whatsapp || null,
        email: body.email || null, cep: body.cep || null, endereco: body.endereco || null, numero: body.numero || null,
        complemento: body.complemento || null, bairro: body.bairro || null, cidade: body.cidade || null, estado: body.estado || null,
        criado_por: (admin && body.criado_por) ? body.criado_por : usuario.id,
      }).select('*').single();
      if (error) throw error;
      return ok(data, 201);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return fail('ID do cliente não informado.', 400);

      const { data: atual, error: getErr } = await supabase.from('clientes').select('criado_por').eq('id', body.id).maybeSingle();
      if (getErr) throw getErr;
      if (!atual) return fail('Cliente não encontrado.', 404);
      if (!admin && atual.criado_por !== usuario.id) {
        return fail('Você não tem permissão para editar este cliente.', 403);
      }

      const camposEditaveis = ['nome_empresa', 'cnpj', 'inscricao_estadual', 'nome_socio', 'telefone', 'whatsapp',
        'email', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
      const updateData = {};
      camposEditaveis.forEach((c) => { if (body[c] !== undefined) updateData[c] = body[c]; });

      // Só o Administrador pode transferir o cliente para outro vendedor.
      if (admin && body.criado_por !== undefined) {
        updateData.criado_por = body.criado_por || null;
      }

      updateData.atualizado_em = new Date().toISOString();

      const { data, error } = await supabase.from('clientes').update(updateData).eq('id', body.id).select('*').single();
      if (error) throw error;
      return ok(data);
    }

    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {};
      if (!params.id) return fail('ID do cliente não informado.', 400);

      const { data: atual, error: getErr } = await supabase.from('clientes').select('criado_por').eq('id', params.id).maybeSingle();
      if (getErr) throw getErr;
      if (!atual) return fail('Cliente não encontrado.', 404);
      if (!admin && atual.criado_por !== usuario.id) {
        return fail('Você não tem permissão para excluir este cliente.', 403);
      }

      const { error } = await supabase.from('clientes').delete().eq('id', params.id);
      if (error) {
        if (error.code === '23503') {
          return fail('Esse cliente já tem pedidos registrados e não pode ser excluído.', 409);
        }
        throw error;
      }
      return ok({ deletado: true });
    }

    return fail('Método não permitido', 405);
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
