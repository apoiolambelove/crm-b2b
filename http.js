const { getSupabase } = require('./utils/db');
const { autenticar } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const supabase = getSupabase();

  try {
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};

      if (params.id) {
        const { data, error } = await supabase.from('clientes').select('*').eq('id', params.id).maybeSingle();
        if (error) throw error;
        if (!data) return fail('Cliente não encontrado.', 404);
        return ok(data);
      }

      let query = supabase.from('clientes').select('*').order('nome_empresa', { ascending: true });

      // Busca usada tanto pela tela de Clientes quanto pelo autocomplete do Novo Pedido.
      if (params.busca) {
        const termo = params.busca.trim();
        query = query.or(`nome_empresa.ilike.%${termo}%,cnpj.ilike.%${termo}%`);
      }

      const limite = params.limite ? Number(params.limite) : 500;
      const { data, error } = await query.limit(limite);
      if (error) throw error;
      return ok(data);
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.nome_empresa) return fail('Informe o nome da empresa.', 400);

      if (body.cnpj) {
        const { data: existente } = await supabase.from('clientes').select('id').eq('cnpj', body.cnpj).maybeSingle();
        if (existente) return fail('Já existe um cliente cadastrado com esse CNPJ.', 409);
      }

      const { data, error } = await supabase.from('clientes').insert({
        nome_empresa: body.nome_empresa, cnpj: body.cnpj || null, inscricao_estadual: body.inscricao_estadual || null,
        nome_socio: body.nome_socio || null, telefone: body.telefone || null, whatsapp: body.whatsapp || null,
        email: body.email || null, cep: body.cep || null, endereco: body.endereco || null, numero: body.numero || null,
        complemento: body.complemento || null, bairro: body.bairro || null, cidade: body.cidade || null, estado: body.estado || null,
      }).select('*').single();
      if (error) throw error;
      return ok(data, 201);
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return fail('ID do cliente não informado.', 400);

      const camposEditaveis = ['nome_empresa', 'cnpj', 'inscricao_estadual', 'nome_socio', 'telefone', 'whatsapp',
        'email', 'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
      const updateData = {};
      camposEditaveis.forEach((c) => { if (body[c] !== undefined) updateData[c] = body[c]; });
      updateData.atualizado_em = new Date().toISOString();

      const { data, error } = await supabase.from('clientes').update(updateData).eq('id', body.id).select('*').single();
      if (error) throw error;
      return ok(data);
    }

    if (event.httpMethod === 'DELETE') {
      const params = event.queryStringParameters || {};
      if (!params.id) return fail('ID do cliente não informado.', 400);

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
