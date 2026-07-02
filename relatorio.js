const { autenticar } = require('./utils/auth');
const { ok, fail, preflight } = require('./utils/http');

// Peso e caixa padrão do produto único (LambeLove - Pele e Pêlo 150g).
// Mantido em sincronia com public/js/produto.js — se o produto mudar, ajuste os dois lugares.
const PESO_UNITARIO_KG = 0.2;
const CAIXA_PADRAO = { comprimento_cm: 40, largura_cm: 30, altura_cm: 20, tara_kg: 0.5 };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return fail('Método não permitido', 405);

  const usuario = autenticar(event);
  if (!usuario) return fail('Sessão inválida ou expirada. Faça login novamente.', 401);

  const token = process.env.MELHOR_ENVIO_TOKEN;
  const cepOrigem = process.env.CEP_ORIGEM; // nunca exposto ao frontend
  if (!token || !cepOrigem) {
    return fail('Frete não configurado. Peça ao administrador para configurar MELHOR_ENVIO_TOKEN e CEP_ORIGEM.', 500);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return fail('Corpo da requisição inválido', 400);
  }

  const cepDestino = (body.cep_destino || '').replace(/\D/g, '');
  const quantidade = Number(body.quantidade) || 0;
  if (cepDestino.length !== 8) return fail('Informe um CEP de destino válido.', 400);
  if (quantidade <= 0) return fail('Informe a quantidade do pedido.', 400);

  const pesoTotalKg = Math.round((quantidade * PESO_UNITARIO_KG + CAIXA_PADRAO.tara_kg) * 100) / 100;

  try {
    const resp = await fetch('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'LambeLove CRM (contato@lambelove.com.br)',
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem },
        to: { postal_code: cepDestino },
        package: {
          height: CAIXA_PADRAO.altura_cm,
          width: CAIXA_PADRAO.largura_cm,
          length: CAIXA_PADRAO.comprimento_cm,
          weight: pesoTotalKg,
        },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return fail('Erro ao consultar frete: ' + (data.message || resp.statusText), 502);
    }

    const opcoes = (Array.isArray(data) ? data : [])
      .filter((o) => !o.error && o.price)
      .map((o) => ({
        transportadora: o.company && o.company.name ? o.company.name : 'Transportadora',
        servico: o.name || 'Serviço',
        preco: Number(o.price),
        prazo_dias: o.delivery_time || o.delivery_range?.max || null,
      }))
      .sort((a, b) => a.preco - b.preco);

    return ok(opcoes);
  } catch (e) {
    return fail('Erro ao calcular frete: ' + e.message, 500);
  }
};
