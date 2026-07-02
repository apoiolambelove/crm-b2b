const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const supabase = getSupabase();
  const params = event.queryStringParameters || {};

  try {
    // ---------- GET ----------
    if (event.httpMethod === 'GET') {

      // Pedidos concluídos e ainda não vinculados a nenhum pagamento (para o Admin escolher o que pagar).
      if (params.pendentes) {
        if (!ehAdmin(usuario)) return fail('Apenas o administrador pode ver isso.', 403);
        const { data, error } = await supabase.from('vw_pedidos').select('*')
          .eq('status', 'VENDA_CONCLUIDA').is('pagamento_comissao_id', null)
          .order('data_pedido', { ascending: true });
        if (error) throw error;

        const { data: usuariosLista } = await supabase.from('usuarios').select('id, nome_completo');
        const nomesPorId = Object.fromEntries((usuariosLista || []).map((u) => [u.id, u.nome_completo]));
        const dataComNome = data.map((p) => ({ ...p, criado_por_nome: nomesPorId[p.criado_por] || '-' }));
        return ok(dataComNome);
      }

      // Pagamentos aguardando aceite da vendedora logada (ou de todas, se Admin quiser conferir).
      if (params.aguardando) {
        let query = supabase.from('pagamentos_comissao').select('*').eq('status', 'AGUARDANDO_ACEITE');
        if (!ehAdmin(usuario)) query = query.eq('vendedora_id', usuario.id);
        const { data, error } = await query.order('criado_em', { ascending: false });
        if (error) throw error;
        return ok(data);
      }

      // Histórico de todos os pagamentos (lançados e aceitos).
      if (params.historico) {
        let query = supabase.from('pagamentos_comissao').select('*, usuarios:vendedora_id(nome_completo)').order('criado_em', { ascending: false });
        if (!ehAdmin(usuario)) query = query.eq('vendedora_id', usuario.id);
        const { data, error } = await query;
        if (error) throw error;
        return ok(data);
      }

      // Resumo mensal: pago / a receber (concluídas, não pagas) / futuras (não concluídas).
      if (params.resumo) {
        let query = supabase.from('vw_pedidos').select('*');
        if (!ehAdmin(usuario)) query = query.eq('criado_por', usuario.id);
        const { data: pedidos, error } = await query;
        if (error) throw error;

        const porMes = {};
        for (const p of pedidos) {
          if (p.status === 'CANCELADA' || p.status === 'NAO_EFETIVADA') continue;
          const chave = p.data_pedido.slice(0, 7); // YYYY-MM
          if (!porMes[chave]) porMes[chave] = { pago: 0, aReceber: 0, futuras: 0 };
          const valor = Number(p.valor_comissao || 0);
          if (p.status === 'VENDA_CONCLUIDA' && p.pagamento_comissao_id) porMes[chave].pago += valor;
          else if (p.status === 'VENDA_CONCLUIDA') porMes[chave].aReceber += valor;
          else porMes[chave].futuras += valor;
        }
        const resumo = Object.entries(porMes).map(([mes, v]) => ({ mes, ...v })).sort((a, b) => b.mes.localeCompare(a.mes));
        return ok(resumo);
      }

      return fail('Parâmetro de consulta não informado.', 400);
    }

    // ---------- POST: Admin lança um novo pagamento ----------
    if (event.httpMethod === 'POST') {
      if (!ehAdmin(usuario)) return fail('Apenas o administrador pode lançar pagamentos.', 403);

      const body = JSON.parse(event.body || '{}');
      const { vendedora_id, pedido_ids, periodo_inicio, periodo_fim } = body;
      if (!vendedora_id || !Array.isArray(pedido_ids) || !pedido_ids.length || !periodo_inicio || !periodo_fim) {
        return fail('Informe a vendedora, o período e ao menos um pedido.', 400);
      }

      const { data: pedidosSelecionados, error: e1 } = await supabase.from('pedidos').select('id, valor_comissao, status, pagamento_comissao_id')
        .in('id', pedido_ids);
      if (e1) throw e1;

      const invalidos = pedidosSelecionados.filter((p) => p.status !== 'VENDA_CONCLUIDA' || p.pagamento_comissao_id);
      if (invalidos.length) return fail('Algum pedido selecionado já foi pago ou não está concluído.', 409);

      const valorTotal = pedidosSelecionados.reduce((s, p) => s + Number(p.valor_comissao || 0), 0);

      const { data: pagamento, error: e2 } = await supabase.from('pagamentos_comissao').insert({
        vendedora_id, periodo_inicio, periodo_fim, valor_total: valorTotal,
        status: 'AGUARDANDO_ACEITE', criado_por: usuario.id,
      }).select('*').single();
      if (e2) throw e2;

      const { error: e3 } = await supabase.from('pedidos').update({ pagamento_comissao_id: pagamento.id }).in('id', pedido_ids);
      if (e3) throw e3;

      return ok(pagamento, 201);
    }

    // ---------- PUT: vendedora aceita/confirma o recebimento ----------
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return fail('ID do pagamento não informado.', 400);

      const { data: pagamento, error: e1 } = await supabase.from('pagamentos_comissao').select('*').eq('id', body.id).maybeSingle();
      if (e1) throw e1;
      if (!pagamento) return fail('Pagamento não encontrado.', 404);
      if (pagamento.vendedora_id !== usuario.id && !ehAdmin(usuario)) return fail('Esse pagamento não pertence a você.', 403);
      if (pagamento.status === 'ACEITO') return fail('Esse pagamento já foi confirmado antes.', 409);

      const { data, error } = await supabase.from('pagamentos_comissao')
        .update({ status: 'ACEITO', aceito_em: new Date().toISOString() })
        .eq('id', body.id).select('*').single();
      if (error) throw error;
      return ok(data);
    }

    return fail('Método não permitido', 405);
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
