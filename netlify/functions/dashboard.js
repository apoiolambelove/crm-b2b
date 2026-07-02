const { getSupabase } = require('./utils/db');
const { autenticar } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return fail('Método não permitido', 405);

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const supabase = getSupabase();

  try {
    const { data: pedidos, error } = await supabase.from('pedidos').select('*');
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

    const comissaoPrevista = pedidos
      .filter((p) => !['NAO_EFETIVADA', 'CANCELADA'].includes(p.status))
      .reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const comissaoAprovada = pedidos
      .filter((p) => p.comissao_status === 'APROVADA')
      .reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const comissaoPaga = comissaoAprovada; // paga = aprovada neste modelo (sem etapa extra de pagamento)

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
      comissaoPrevista, comissaoAprovada, comissaoPaga, grafico,
    });
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
