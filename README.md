# CRM B2B — LambeLove

## Regras comerciais
- Pedido mínimo: **10 unidades**.
- De **10 a 50 unidades**: **R$ 59,00 por unidade**.
- A partir de **51 unidades**: **R$ 49,00 por unidade**.
- Frete: permanece com a configuração atual do **Melhor Envio**, sem alterações.
- Origem do pedido: **Matriz** ou **Consignação**.
- Consignação: baixa imediata do estoque da vendedora no cadastro da venda; cancelamento, alteração de origem/quantidade ou exclusão de uma venda ativa estorna o estoque.

## Mercado Pago
A função de pagamento usa `MERCADO_PAGO_ACCESS_TOKEN` e `SITE_URL` no ambiente da Netlify. O Checkout Pro gera um link que pode oferecer os meios habilitados na conta do Mercado Pago, incluindo Pix e cartão. O webhook confirma o pagamento consultando novamente a API do Mercado Pago.

Nunca coloque tokens secretos no GitHub ou no frontend.

## Banco
1. Para um banco já existente, execute `supabase/migration_origem_consignacao.sql`.
2. Para zerar os dados operacionais depois de publicar/testar, execute `supabase/reset_sistema.sql`.
3. O reset preserva a tabela `usuarios`.

## Netlify
Variáveis necessárias:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `MELHOR_ENVIO_TOKEN`
- `CEP_ORIGEM`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `SITE_URL`

O `SITE_URL` deve ser a URL pública do site, sem barra final.
