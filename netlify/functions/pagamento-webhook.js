const { getSupabase } = require('./utils/db');
const { ok, fail, preflight } = require('./utils/http');

// Endpoint PÚBLICO (sem autenticação) — é o próprio Mercado Pago quem chama
// essa function, não a vendedora pelo navegador. Por segurança, NUNCA
// confiamos no status que vier dentro da notificação em si: sempre buscamos
// o pagamento de novo direto na API do Mercado Pago antes de dar como certo.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Método não permitido', 405);

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return fail('Pagamento online não configurado.', 500);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    // Mercado Pago às vezes manda notificação vazia/de teste — só confirma recebimento.
    return ok({ recebido: true });
  }

  const paymentId = body?.data?.id;
  const tipo = body?.type || body?.action || '';
  if (!paymentId || !tipo.includes('payment')) {
    // Não é uma notificação de pagamento (pode ser outro tipo de evento) — ignora sem erro.
    return ok({ recebido: true, ignorado: true });
  }

  try {
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const pagamento = await resp.json();
    if (!resp.ok) {
      // Responde 200 mesmo assim pro Mercado Pago não ficar retentando à toa;
      // o erro fica registrado no log da function pra investigar depois.
      console.error('Erro ao consultar pagamento no Mercado Pago:', pagamento);
      return ok({ recebido: true, erro: true });
    }

    const pedidoId = pagamento.external_reference;
    if (!pedidoId) return ok({ recebido: true, sem_referencia: true });

    const supabase = getSupabase();
    const atualizacao = {
      mp_payment_id: String(pagamento.id),
      mp_status: pagamento.status, // approved | pending | rejected | in_process | cancelled | refunded ...
    };

    // Só avança o pedido pra "Venda Concluída" automaticamente quando o
    // pagamento é aprovado de verdade. Em qualquer outro status, só
    // atualizamos o rastreamento (mp_status) e deixamos a decisão do que
    // fazer com o pedido nas mãos de quem administra o sistema.
    if (pagamento.status === 'approved') {
      atualizacao.status = 'VENDA_CONCLUIDA';
      atualizacao.forma_pagamento = 'CARTAO';
    }

    await supabase.from('pedidos').update(atualizacao).eq('id', pedidoId);

    return ok({ recebido: true });
  } catch (e) {
    console.error('Erro no webhook de pagamento:', e);
    return ok({ recebido: true, erro: true });
  }
};
