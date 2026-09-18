const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight, getClientIp } = require('./utils/http');

async function registrarHistorico(supabase, usuario, acao, detalhes, ip) {
  await supabase.from('historico').insert({
    usuario_id: usuario.id,
    nome_usuario: usuario.nome_usuario,
    acao,
    detalhes,
    ip,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const supabase = getSupabase();
  const ip = getClientIp(event);
  const params = event.queryStringParameters || {};

  try {
    // ---------- GET ----------
    if (event.httpMethod === 'GET') {

      // Estoque atual (entregue / vendido / restante) por vendedora.
      if (params.estoque) {
        let vendedorasQuery = supabase.from('usuarios').select('id, nome_completo, ativo').eq('perfil', 'VENDEDORA');
        if (!ehAdmin(usuario)) vendedorasQuery = vendedorasQuery.eq('id', usuario.id);
        const { data: vendedoras, error: e1 } = await vendedorasQuery.order('nome_completo', { ascending: true });
        if (e1) throw e1;

        const { data: estoques, error: e2 } = await supabase.from('vw_estoque_consignacao').select('*');
        if (e2) throw e2;
        const porVendedora = Object.fromEntries((estoques || []).map((e) => [e.vendedora_id, e]));

        const resultado = vendedoras.map((v) => {
          const e = porVendedora[v.id] || { total_entregue: 0, total_vendido: 0, estoque_atual: 0 };
          return {
            vendedora_id: v.id,
            nome_completo: v.nome_completo,
            ativo: v.ativo,
            total_entregue: Number(e.total_entregue || 0),
            total_vendido: Number(e.total_vendido || 0),
            estoque_atual: Number(e.estoque_atual || 0),
          };
        });
        return ok(resultado);
      }

      // Extrato de movimentos de uma vendedora (ou de todas, se Admin não filtrar).
      if (params.movimentos) {
        let query = supabase.from('consignacao_movimentos').select('*, pedidos(numero_pedido)').order('criado_em', { ascending: false }).limit(200);
        if (!ehAdmin(usuario)) query = query.eq('vendedora_id', usuario.id);
        else if (params.vendedora_id) query = query.eq('vendedora_id', params.vendedora_id);
        const { data, error } = await query;
        if (error) throw error;
        return ok(data);
      }

      // Pedidos "Venda Concluída" ainda não incluídos em nenhum repasse, agrupados por vendedora.
      // Serve tanto para o Admin decidir o que fechar quanto para a vendedora ver o que está pendente.
      if (params.pendentes) {
        let query = supabase.from('vw_pedidos').select('id, numero_pedido, data_pedido, nome_empresa, valor_total, valor_comissao, criado_por, origem_pedido')
          .eq('status', 'VENDA_CONCLUIDA').eq('origem_pedido', 'CONSIGNACAO').is('repasse_consignacao_id', null);
        if (!ehAdmin(usuario)) query = query.eq('criado_por', usuario.id);
        else if (params.vendedora_id) query = query.eq('criado_por', params.vendedora_id);
        const { data: pedidos, error } = await query.order('data_pedido', { ascending: true });
        if (error) throw error;

        const { data: usuariosLista } = await supabase.from('usuarios').select('id, nome_completo');
        const nomesPorId = Object.fromEntries((usuariosLista || []).map((u) => [u.id, u.nome_completo]));

        const porVendedora = {};
        for (const p of pedidos) {
          if (!porVendedora[p.criado_por]) {
            porVendedora[p.criado_por] = {
              vendedora_id: p.criado_por,
              nome_completo: nomesPorId[p.criado_por] || '-',
              valor_vendido: 0, valor_comissao: 0, valor_repassar: 0,
              pedidos: [],
            };
          }
          const grupo = porVendedora[p.criado_por];
          grupo.valor_vendido += Number(p.valor_total || 0);
          grupo.valor_comissao += Number(p.valor_comissao || 0);
          grupo.pedidos.push(p);
        }
        const resultado = Object.values(porVendedora).map((g) => ({
          ...g,
          valor_repassar: Math.round((g.valor_vendido - g.valor_comissao) * 100) / 100,
        }));
        return ok(resultado);
      }

      // Histórico de repasses já fechados.
      if (params.repasses) {
        let query = supabase.from('repasses_consignacao').select('*, usuarios:vendedora_id(nome_completo)').order('criado_em', { ascending: false });
        if (!ehAdmin(usuario)) query = query.eq('vendedora_id', usuario.id);
        const { data, error } = await query;
        if (error) throw error;
        return ok(data);
      }

      return fail('Parâmetro de consulta não informado.', 400);
    }

    // ---------- POST ----------
    if (event.httpMethod === 'POST') {
      if (!ehAdmin(usuario)) return fail('Apenas o administrador (Master) pode fazer isso.', 403);

      const body = JSON.parse(event.body || '{}');

      // Registrar entrega física de produto para a vendedora (entra em estoque).
      if (body.tipo === 'ENTREGA') {
        if (!body.vendedora_id || !body.quantidade || Number(body.quantidade) <= 0) {
          return fail('Informe a vendedora e uma quantidade maior que zero.', 400);
        }
        const { data: mov, error } = await supabase.from('consignacao_movimentos').insert({
          vendedora_id: body.vendedora_id,
          tipo: 'ENTREGA',
          quantidade: Math.round(Number(body.quantidade)),
          observacao: body.observacao || null,
          criado_por: usuario.id,
        }).select('*').single();
        if (error) throw error;

        await registrarHistorico(supabase, usuario, 'CONSIGNACAO_ENTREGA', `Entrega de ${body.quantidade} unidades registrada em consignação`, ip);
        return ok(mov, 201);
      }

      // Ajuste manual (correção de contagem, perda, quebra, devolução etc.). Pode ser negativo.
      if (body.tipo === 'AJUSTE') {
        if (!body.vendedora_id || body.quantidade === undefined || Number(body.quantidade) === 0) {
          return fail('Informe a vendedora e uma quantidade de ajuste diferente de zero.', 400);
        }
        if (!body.observacao) return fail('Descreva o motivo do ajuste.', 400);
        const { data: mov, error } = await supabase.from('consignacao_movimentos').insert({
          vendedora_id: body.vendedora_id,
          tipo: 'AJUSTE',
          quantidade: Math.round(Number(body.quantidade)),
          observacao: body.observacao,
          criado_por: usuario.id,
        }).select('*').single();
        if (error) throw error;

        await registrarHistorico(supabase, usuario, 'CONSIGNACAO_AJUSTE', `Ajuste de estoque: ${body.quantidade} unidades (${body.observacao})`, ip);
        return ok(mov, 201);
      }

      // Fechar a semana: soma os pedidos concluídos ainda não fechados da vendedora
      // dentro do período informado, cria o repasse e vincula os pedidos a ele.
      if (body.tipo === 'FECHAR_SEMANA') {
        const { vendedora_id, periodo_inicio, periodo_fim } = body;
        if (!vendedora_id || !periodo_inicio || !periodo_fim) {
          return fail('Informe a vendedora e o período (início e fim).', 400);
        }

        const { data: pedidosElegiveis, error: e1 } = await supabase.from('pedidos')
          .select('id, valor_total, valor_comissao, status, repasse_consignacao_id, origem_pedido')
          .eq('criado_por', vendedora_id)
          .eq('status', 'VENDA_CONCLUIDA')
          .eq('origem_pedido', 'CONSIGNACAO')
          .is('repasse_consignacao_id', null)
          .gte('data_pedido', periodo_inicio)
          .lte('data_pedido', periodo_fim);
        if (e1) throw e1;

        if (!pedidosElegiveis.length) {
          return fail('Não há pedidos concluídos e pendentes de repasse dessa vendedora nesse período.', 409);
        }

        const valorVendido = pedidosElegiveis.reduce((s, p) => s + Number(p.valor_total || 0), 0);
        const valorComissao = pedidosElegiveis.reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
        const valorRepassar = Math.round((valorVendido - valorComissao) * 100) / 100;

        const { data: repasse, error: e2 } = await supabase.from('repasses_consignacao').insert({
          vendedora_id, periodo_inicio, periodo_fim,
          valor_vendido: Math.round(valorVendido * 100) / 100,
          valor_comissao: Math.round(valorComissao * 100) / 100,
          valor_repassar: valorRepassar,
          status: 'PENDENTE',
          criado_por: usuario.id,
        }).select('*').single();
        if (e2) throw e2;

        const { error: e3 } = await supabase.from('pedidos')
          .update({ repasse_consignacao_id: repasse.id })
          .in('id', pedidosElegiveis.map((p) => p.id));
        if (e3) throw e3;

        await registrarHistorico(
          supabase, usuario, 'CONSIGNACAO_FECHAMENTO',
          `Semana de consignação fechada (${periodo_inicio} a ${periodo_fim}), valor a repassar: R$ ${valorRepassar.toFixed(2)}`, ip
        );
        return ok(repasse, 201);
      }

      return fail('Tipo de lançamento inválido.', 400);
    }

    // ---------- PUT: Admin confirma que recebeu o repasse da vendedora ----------
    if (event.httpMethod === 'PUT') {
      if (!ehAdmin(usuario)) return fail('Apenas o administrador (Master) pode confirmar o recebimento.', 403);

      const body = JSON.parse(event.body || '{}');
      if (!body.id) return fail('ID do repasse não informado.', 400);

      const { data: repasse, error: e1 } = await supabase.from('repasses_consignacao').select('*').eq('id', body.id).maybeSingle();
      if (e1) throw e1;
      if (!repasse) return fail('Repasse não encontrado.', 404);
      if (repasse.status === 'RECEBIDO') return fail('Esse repasse já foi confirmado antes.', 409);

      const { data, error } = await supabase.from('repasses_consignacao')
        .update({ status: 'RECEBIDO', recebido_em: new Date().toISOString() })
        .eq('id', body.id).select('*').single();
      if (error) throw error;

      await registrarHistorico(supabase, usuario, 'CONSIGNACAO_RECEBIMENTO', `Recebimento do repasse confirmado (R$ ${Number(repasse.valor_repassar).toFixed(2)})`, ip);
      return ok(data);
    }

    // ---------- DELETE: Admin cancela um fechamento feito por engano (só antes de RECEBIDO) ----------
    if (event.httpMethod === 'DELETE') {
      if (!ehAdmin(usuario)) return fail('Apenas o administrador (Master) pode cancelar um fechamento.', 403);

      if (!params.id) return fail('Informe o id do repasse.', 400);

      const { data: repasse, error: e1 } = await supabase.from('repasses_consignacao').select('*').eq('id', params.id).maybeSingle();
      if (e1) throw e1;
      if (!repasse) return fail('Repasse não encontrado.', 404);
      if (repasse.status === 'RECEBIDO') {
        return fail('Esse repasse já foi confirmado como recebido e não pode mais ser cancelado por aqui.', 409);
      }

      const { error: e2 } = await supabase.from('pedidos').update({ repasse_consignacao_id: null }).eq('repasse_consignacao_id', params.id);
      if (e2) throw e2;

      const { error: e3 } = await supabase.from('repasses_consignacao').delete().eq('id', params.id);
      if (e3) throw e3;

      await registrarHistorico(supabase, usuario, 'CONSIGNACAO_CANCELAMENTO', `Fechamento de consignação cancelado (R$ ${Number(repasse.valor_repassar).toFixed(2)})`, ip);
      return ok({ cancelado: true });
    }

    return fail('Método não permitido', 405);
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
