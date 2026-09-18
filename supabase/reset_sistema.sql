-- =========================================================
-- CRM B2B - RESET OPERACIONAL
-- ATENÇÃO: apaga clientes, pedidos, histórico, consignação,
-- repasses e pagamentos de comissão. PRESERVA os usuários/login.
-- Execute somente quando a versão final estiver publicada e testada.
-- =========================================================
begin;

truncate table
  consignacao_movimentos,
  historico,
  pagamentos_comissao,
  repasses_consignacao,
  pedidos,
  clientes
restart identity;

alter sequence pedidos_numero_seq restart with 1001;

commit;

select 'usuarios' as tabela, count(*) as registros from usuarios
union all select 'clientes', count(*) from clientes
union all select 'pedidos', count(*) from pedidos
union all select 'historico', count(*) from historico
union all select 'consignacao_movimentos', count(*) from consignacao_movimentos
union all select 'repasses_consignacao', count(*) from repasses_consignacao
union all select 'pagamentos_comissao', count(*) from pagamentos_comissao;
