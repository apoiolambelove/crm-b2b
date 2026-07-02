const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight, getClientIp } = require('./utils/http');

const STATUS_ADMIN_ONLY = ['VENDA_CONCLUIDA', 'PENDENTE_PAGAMENTO', 'NAO_EFETIVADA', 'CANCELADA'];
const FORMAS_PAGAMENTO_PERMITIDAS = ['PIX', 'TRANSFERENCIA'];

async function registrarHistorico(supabase, usuario, pedidoId, acao, detalhes, ip) {
  await supabase.from('historico').insert({
    usuario_id: usuario.id,
    nome_usuario: usuario.nome_usuario,
    pedido_id: pedidoId,
    acao,
    detalhes,
    ip,
  });
}

async function upsertCliente(supabase, dados) {
  // Tenta achar cliente existente pelo CNPJ; senão cria um novo.
  let clienteId = dados.cliente_id || null;

  const clienteDados = {
    nome_empresa: dados.nome_empresa,
    cnpj: dados.cnpj,
    inscricao_estadual: dados.inscricao_estadual,
    nome_socio: dados.nome_socio,
    telefone: dados.telefone,
    whatsapp: dados.whatsapp,
    email: dados.email,
    cep: dados.cep,
    endereco: dados.endereco,
    numero: dados.numero,
    complemento: dados.complemento,
    bairro: dados.bairro,
    cidade: dados.cidade,
    estado: dados.estado,
  };

  if (clienteId) {
    const { error } = await supabase.from('clientes').update(clienteDados).eq('id', clienteId);
    if (error) throw error;
    return clienteId;
  }

  if (dados.cnpj) {
    const { data: existente } = await supabase.from('clientes').select('id').eq('cnpj', dados.cnpj).maybeSingle();
    if (existente) {
      await supabase.from('clientes').update(clienteDados).eq('id', existente.id);
      return existente.id;
    }
  }

  const { data: novo, error: insErr } = await supabase.from('clientes').insert(clienteDados).select('id').single();
  if (insErr) throw insErr;
  return novo.id;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const supabase = getSupabase();
  const ip = getClientIp(event);
  const params = event.queryStringParameters || {};

  try {
    // ---------------- LISTAR / PESQUISAR ----------------
    if (event.httpMethod === 'GET') {
      if (params.id) {
        const { data, error } = await supabase.from('vw_pedidos').select('*').eq('id', params.id).maybeSingle();
        if (error) throw error;
        if (!data) return fail('Pedido não encontrado', 404);
        return ok(data);
      }

      let query = supabase.from('vw_pedidos').select('*').order('criado_em', { ascending: false });

      if (params.cliente) query = query.ilike('nome_empresa', `%${params.cliente}%`);
      if (params.cidade) query = query.ilike('cidade', `%${params.cidade}%`);
      if (params.cnpj) query = query.ilike('cnpj', `%${params.cnpj}%`);
      if (params.telefone) query = query.or(`telefone.ilike.%${params.telefone}%,whatsapp.ilike.%${params.telefone}%`);
      if (params.numero_pedido) query = query.eq('numero_pedido', params.numero_pedido);
      if (params.status) query = query.eq('status', params.status);
      if (params.forma_pagamento) query = query.eq('forma_pagamento', params.forma_pagamento);
      if (params.data_inicio) query = query.gte('data_pedido', params.data_inicio);
      if (params.data_fim) query = query.lte('data_pedido', params.data_fim);

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return ok(data);
    }

    // ---------------- CRIAR PEDIDO ----------------
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.nome_empresa || !body.produtos || !body.valor_total || !body.forma_pagamento) {
        return fail('Preencha empresa, produtos, valor total e forma de pagamento.', 400);
      }
      if (!FORMAS_PAGAMENTO_PERMITIDAS.includes(body.forma_pagamento)) {
        return fail('Forma de pagamento inválida. Use PIX ou Transferência.', 400);
      }

      const cliente_id = await upsertCliente(supabase, body);

      const { data: pedido, error } = await supabase
        .from('pedidos')
        .insert({
          data_pedido: body.data_pedido || new Date().toISOString().slice(0, 10),
          hora_pedido: body.hora_pedido || new Date().toTimeString().slice(0, 8),
          cliente_id,
          produtos: body.produtos,
          quantidade: body.quantidade || 1,
          valor_total: body.valor_total,
          valor_frete: body.valor_frete || 0,
          forma_pagamento: body.forma_pagamento,
          observacoes: body.observacoes || null,
          status: 'AGUARDANDO_APROVACAO',
          criado_por: usuario.id,
        })
        .select('*')
        .single();

      if (error) throw error;

      await registrarHistorico(supabase, usuario, pedido.id, 'CRIACAO', `Pedido #${pedido.numero_pedido} criado`, ip);
      return ok(pedido, 201);
    }

    // ---------------- EDITAR PEDIDO ----------------
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return fail('Informe o id do pedido', 400);

      const { data: atual, error: getErr } = await supabase.from('pedidos').select('*').eq('id', body.id).maybeSingle();
      if (getErr) throw getErr;
      if (!atual) return fail('Pedido não encontrado', 404);

      // Vendedora só pode editar enquanto o pedido está pendente; admin edita sempre.
      if (!ehAdmin(usuario) && atual.status !== 'AGUARDANDO_APROVACAO') {
        return fail('Este pedido já foi avaliado pelo administrador e não pode mais ser editado.', 403);
      }

      if (body.forma_pagamento !== undefined && !FORMAS_PAGAMENTO_PERMITIDAS.includes(body.forma_pagamento)) {
        return fail('Forma de pagamento inválida. Use PIX ou Transferência.', 400);
      }

      if (body.nome_empresa) {
        await upsertCliente(supabase, { ...body, cliente_id: atual.cliente_id });
      }

      const camposEditaveis = ['data_pedido', 'hora_pedido', 'produtos', 'quantidade', 'valor_total', 'valor_frete', 'forma_pagamento', 'observacoes'];
      const updateData = {};
      camposEditaveis.forEach((campo) => {
        if (body[campo] !== undefined) updateData[campo] = body[campo];
      });

      const { data: pedido, error } = await supabase.from('pedidos').update(updateData).eq('id', body.id).select('*').single();
      if (error) throw error;

      await registrarHistorico(supabase, usuario, pedido.id, 'EDICAO', `Pedido #${pedido.numero_pedido} editado`, ip);
      return ok(pedido);
    }

    // ---------------- ALTERAR STATUS (somente ADMIN) ----------------
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id || !body.status) return fail('Informe id e status', 400);

      if (!ehAdmin(usuario)) return fail('Apenas o administrador pode alterar o status do pedido.', 403);
      if (!STATUS_ADMIN_ONLY.includes(body.status)) return fail('Status inválido', 400);

      const { data: pedido, error } = await supabase
        .from('pedidos')
        .update({ status: body.status })
        .eq('id', body.id)
        .select('*')
        .single();

      if (error) throw error;

      await registrarHistorico(
        supabase, usuario, pedido.id, 'ALTERACAO_STATUS',
        `Status do pedido #${pedido.numero_pedido} alterado para ${body.status}`, ip
      );
      return ok(pedido);
    }

    // ---------------- EXCLUIR (somente ADMIN) ----------------
    if (event.httpMethod === 'DELETE') {
      if (!ehAdmin(usuario)) return fail('Apenas o administrador pode excluir pedidos.', 403);
      if (!params.id) return fail('Informe o id do pedido', 400);

      const { data: pedido } = await supabase.from('pedidos').select('numero_pedido').eq('id', params.id).maybeSingle();
      const { error } = await supabase.from('pedidos').delete().eq('id', params.id);
      if (error) throw error;

      await registrarHistorico(
        supabase, usuario, params.id, 'EXCLUSAO',
        `Pedido #${pedido ? pedido.numero_pedido : params.id} excluído`, ip
      );
      return ok({ excluido: true });
    }

    return fail('Método não permitido', 405);
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
