const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return fail('Método não permitido', 405);

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const supabase = getSupabase();

  try {
    // Vendedora só vê indicadores dos próprios pedidos; Administrador vê tudo.
    let query = supabase.from('vw_pedidos').select('*');
    if (!ehAdmin(usuario)) query = query.eq('criado_por', usuario.id);
    const { data: pedidos, error } = await query;
    if (error) throw error;

    const hoje = new Date().toISOString().slice(0, 10);
    const mesAtual = hoje.slice(0, 7); // YYYY-MM

    const totalPedidos = pedidos.length;
    const totalVendido = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    const pedidosDoMes = pedidos.filter((p) => p.data_pedido.slice(0, 7) === mesAtual).length;
    const pedidosDoDia = pedidos.filter((p) => p.data_pedido === hoje).length;
    const pedidosPendentes = pedidos.filter((p) => p.status === 'AGUARDANDO_APROVACAO').length;
    const pedidosConcluidos = pedidos.filter((p) => p.status === 'VENDA_CONCLUIDA').length;
    const pedidosNaoEfetivados = pedidos.filter((p) => p.status === 'NAO_EFETIVADA').length;
    const pedidosAguardandoPagamento = pedidos.filter((p) => p.status === 'PENDENTE_PAGAMENTO').length;

    // Uma comissão só é considerada "Paga" depois que a vendedora confirma o recebimento
    // (status_pagamento_comissao = 'ACEITO'). Antes disso, mesmo que já tenha sido lançada
    // pelo Admin, ela continua contando como "a receber".
    const comissaoPrevista = pedidos
      .filter((p) => !['NAO_EFETIVADA', 'CANCELADA'].includes(p.status))
      .reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const comissaoPaga = pedidos
      .filter((p) => p.status === 'VENDA_CONCLUIDA' && p.status_pagamento_comissao === 'ACEITO')
      .reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const comissaoAReceber = pedidos
      .filter((p) => p.status === 'VENDA_CONCLUIDA' && p.status_pagamento_comissao !== 'ACEITO')
      .reduce((s, p) => s + Number(p.valor_comissao || 0), 0);

    // Série dos últimos 6 meses para o gráfico
    const seriePorMes = {};
    pedidos.forEach((p) => {
      const chave = p.data_pedido.slice(0, 7);
      seriePorMes[chave] = (seriePorMes[chave] || 0) + Number(p.valor_total || 0);
    });
    const meses = Object.keys(seriePorMes).sort().slice(-6);
    const grafico = meses.map((m) => ({ mes: m, total: seriePorMes[m] }));

    return ok({
      totalPedidos, totalVendido, pedidosDoMes, pedidosDoDia,
      pedidosPendentes, pedidosConcluidos, pedidosNaoEfetivados, pedidosAguardandoPagamento,
      comissaoPrevista, comissaoAReceber, comissaoPaga, grafico,
    });
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
