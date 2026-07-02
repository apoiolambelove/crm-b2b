const { getSupabase } = require('./utils/db');
const { autenticar } = require('./utils/auth');
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
    const { data: pedidos, error } = await supabase
      .from('vw_pedidos')
      .select('*')
      .gte('data_pedido', inicio)
      .lte('data_pedido', fim)
      .order('data_pedido', { ascending: true });
    if (error) throw error;

    const quantidadePedidos = pedidos.length;
    const totalVendido = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    const totalFrete = pedidos.reduce((s, p) => s + Number(p.valor_frete || 0), 0);
    const concluidos = pedidos.filter((p) => p.status === 'VENDA_CONCLUIDA');
    const pendentes = pedidos.filter((p) => p.status === 'AGUARDANDO_APROVACAO' || p.status === 'PENDENTE_PAGAMENTO');
    const cancelados = pedidos.filter((p) => p.status === 'CANCELADA' || p.status === 'NAO_EFETIVADA');

    const valorComissoes = pedidos.reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const valorAprovado = pedidos.filter((p) => p.comissao_status === 'APROVADA').reduce((s, p) => s + Number(p.valor_comissao || 0), 0);
    const valorPendente = valorComissoes - valorAprovado;

    return ok({
      periodo: { mes: Number(mes), ano: Number(ano) },
      quantidadePedidos,
      totalVendido,
      totalFrete,
      pedidosConcluidos: concluidos.length,
      pedidosPendentes: pendentes.length,
      pedidosCancelados: cancelados.length,
      valorComissoes,
      valorAprovado,
      valorPendente,
      pedidos,
    });
  } catch (e) {
    return fail('Erro no servidor: ' + e.message, 500);
  }
};
