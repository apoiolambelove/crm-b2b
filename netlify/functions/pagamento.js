const { getSupabase } = require('./utils/db');
const { autenticar, ehAdmin } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

// Cria um link de pagamento (Checkout Pro) no Mercado Pago pra um pedido já
// existente, e salva o id da preferência no pedido pra rastrear depois.
// Quem confirma se o pagamento realmente caiu é a function pagamento-webhook.js,
// nunca esta aqui — esta só GERA o link.
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Método não permitido', 405);

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const siteUrl = process.env.SITE_URL; // ex: https://lambelove.netlify.app (sem barra no final)
  if (!accessToken || !siteUrl) {
    return fail('Pagamento online não configurado. Peça ao administrador para configurar MERCADO_PAGO_ACCESS_TOKEN e SITE_URL.', 500);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return fail('Corpo da requisição inválido', 400);
  }

  const pedidoId = body.pedido_id;
  if (!pedidoId) return fail('Informe o pedido_id.', 400);

  const supabase = getSupabase();
  const { data: pedido, error } = await supabase
    .from('vw_pedidos')
    .select('id, numero_pedido, nome_empresa, valor_total, produtos, email, criado_por')
    .eq('id', pedidoId)
    .single();

  if (error || !pedido) return fail('Pedido não encontrado.', 404);
  if (!ehAdmin(usuario) && pedido.criado_por !== usuario.id) {
    return fail('Você não tem permissão para gerar cobrança para este pedido.', 403);
  }
  if (!pedido.valor_total || Number(pedido.valor_total) <= 0) {
    return fail('Esse pedido não tem um valor total válido para gerar cobrança.', 400);
  }

  try {
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        external_reference: pedido.id, // é assim que o webhook sabe a qual pedido o pagamento pertence
        items: [
          {
            id: `pedido-${pedido.numero_pedido}`,
            title: `Pedido #${pedido.numero_pedido} - ${pedido.produtos || 'LambeLove'}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(pedido.valor_total),
          },
        ],
        payer: pedido.email ? { email: pedido.email } : undefined,
        notification_url: `${siteUrl}/api/pagamento-webhook`,
        back_urls: {
          success: `${siteUrl}/pedidos.html`,
          pending: `${siteUrl}/pedidos.html`,
          failure: `${siteUrl}/pedidos.html`,
        },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return fail('Erro ao criar cobrança no Mercado Pago: ' + (data.message || resp.statusText), 502);
    }

    await supabase
      .from('pedidos')
      .update({ mp_preference_id: data.id, mp_status: 'PENDENTE' })
      .eq('id', pedidoId);

    return ok({ link: data.init_point, preference_id: data.id });
  } catch (e) {
    return fail('Erro ao gerar link de pagamento: ' + e.message, 500);
  }
};
