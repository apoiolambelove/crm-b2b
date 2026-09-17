const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return fail('Método não permitido', 405);

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const { mes, ano } = event.queryStringParameters || {};
  if (!mes || !ano) return fail('Informe mês e ano', 400);

  const supabase = getSupabase();
  const mesFmt = String(mes).padStart(2, '0');
  const inicio = `${ano}-${mesFmt}-01`;
  const fimDate = new Date(Number(ano), Number(mes), 0); // último dia do mês
  const fim = fimDate.toISOString().slice(0, 10);

  try {
    // Vendedora só vê o relatório dos próprios pedidos; Administrador vê de todos.
    let query = supabase
      .from('vw_pedidos')
      .select('*')
      .gte('data_pedido', inicio)
      .lte('data_pedido', fim)
      .order('data_pedido', { ascending: true });
    if (!ehAdmin(usuario)) query = query.eq('criado_por', usuario.id);

    const { data: pedidos, error } = await query;
    if (error) throw error;

    const quantidadePedidos = pedidos.length;
    const totalVendido = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    const totalFrete = pedidos.reduce((s, p) => s + Number(p.valor_frete || 0), 0);
    const concluidos = pedidos.filter((p) => p.status === 'VENDA_CONCLUIDA');
    const pendentes = pedidos.filter((p) => p.status === 'AGUARDANDO_APROVACAO' || p.status === 'PENDENTE_PAGAMENTO');
    const cancelados = pedidos.filter((p) => p.status === 'CANCELADA' || p.status === 'NAO_EFETIVADA');

    const valorComissoes = pedidos.reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const valorPago = pedidos.filter((p) => p.status === 'VENDA_CONCLUIDA' && p.status_pagamento_comissao === 'ACEITO')
      .reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const valorAprovado = pedidos.filter((p) => p.status === 'VENDA_CONCLUIDA' && p.status_pagamento_comissao !== 'ACEITO')
      .reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const valorPendente = valorComissoes - valorAprovado - valorPago;

    return ok({
      periodo: { mes: Number(mes), ano: Number(ano) },
      quantidadePedidos,
      totalVendido,
      totalFrete,
      pedidosConcluidos: concluidos.length,
      pedidosPendentes: pendentes.length,
      pedidosCancelados: cancelados.length,
      valorComissoes,
      valorPago,
      valorAprovado,
      valorPendente,
      pedidos,
    });
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
