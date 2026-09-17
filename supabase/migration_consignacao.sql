-- =========================================================
-- MÓDULO: Consignação
-- Execute este script no SQL Editor do Supabase (projeto já existente).
-- É seguro rodar mais de uma vez (idempotente).
-- =========================================================

-- ---------------------------------------------------------
-- MOVIMENTOS DE ESTOQUE EM CONSIGNAÇÃO
-- Cada linha é um evento: entrega física para a vendedora (ENTREGA,
-- quantidade positiva), baixa automática por venda concluída
-- (SAIDA_VENDA, quantidade negativa), estorno se a venda deixar de estar
-- concluída (ESTORNO, positiva) ou correção manual do admin (AJUSTE,
-- positiva ou negativa). O estoque atual de uma vendedora é sempre a
-- SOMA de quantidade dos movimentos dela — nunca apagamos linha daqui,
-- só lançamos o movimento inverso, pelo mesmo motivo do histórico geral.
-- ---------------------------------------------------------
create table if not exists consignacao_movimentos (
  id uuid primary key default gen_random_uuid(),
  vendedora_id uuid not null references usuarios(id),
  tipo text not null check (tipo in ('ENTREGA', 'SAIDA_VENDA', 'ESTORNO', 'AJUSTE')),
  quantidade integer not null,
  pedido_id uuid references pedidos(id),
  observacao text,
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now()
);

create index if not exists idx_consignacao_mov_vendedora on consignacao_movimentos (vendedora_id);
create index if not exists idx_consignacao_mov_pedido on consignacao_movimentos (pedido_id);

-- ---------------------------------------------------------
-- REPASSES DE CONSIGNAÇÃO
-- Fechamento semanal (toda quarta-feira): soma os pedidos "Venda
-- Concluída" da vendedora no período que ainda não entraram em nenhum
-- repasse. valor_comissao é o que ela retém (15%, ou o percentual do
-- pedido); valor_repassar é o que ela devolve para a empresa.
-- ---------------------------------------------------------
create table if not exists repasses_consignacao (
  id uuid primary key default gen_random_uuid(),
  vendedora_id uuid not null references usuarios(id),
  periodo_inicio date not null,
  periodo_fim date not null,
  valor_vendido numeric(12,2) not null default 0,
  valor_comissao numeric(12,2) not null default 0,
  valor_repassar numeric(12,2) not null default 0,
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'RECEBIDO')),
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  recebido_em timestamptz
);

create index if not exists idx_repasses_vendedora on repasses_consignacao (vendedora_id);

alter table pedidos add column if not exists repasse_consignacao_id uuid references repasses_consignacao(id) on delete set null;

-- ---------------------------------------------------------
-- VIEW: estoque atual por vendedora (soma dos movimentos)
-- ---------------------------------------------------------
create or replace view vw_estoque_consignacao as
select
  vendedora_id,
  coalesce(sum(case when quantidade > 0 then quantidade else 0 end), 0) as total_entregue,
  coalesce(sum(case when tipo = 'SAIDA_VENDA' then -quantidade else 0 end), 0) as total_vendido,
  coalesce(sum(quantidade), 0) as estoque_atual
from consignacao_movimentos
group by vendedora_id;

-- ---------------------------------------------------------
-- GATILHO: baixa/estorno automático de estoque quando o status do
-- pedido muda para/de "VENDA_CONCLUIDA". Roda no banco, então funciona
-- não importa por onde o status seja alterado.
-- ---------------------------------------------------------
create or replace function trg_pedidos_consignacao()
returns trigger as $$
begin
  if new.status = 'VENDA_CONCLUIDA' and (tg_op = 'INSERT' or old.status is distinct from 'VENDA_CONCLUIDA') then
    if not exists (select 1 from consignacao_movimentos where pedido_id = new.id and tipo = 'SAIDA_VENDA') then
      insert into consignacao_movimentos (vendedora_id, tipo, quantidade, pedido_id, observacao, criado_por)
      values (
        new.criado_por, 'SAIDA_VENDA', -new.quantidade, new.id,
        'Baixa automática — Pedido #' || new.numero_pedido || ' marcado como Venda Concluída',
        new.criado_por
      );
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'VENDA_CONCLUIDA' and new.status is distinct from 'VENDA_CONCLUIDA' then
    if exists (select 1 from consignacao_movimentos where pedido_id = new.id and tipo = 'SAIDA_VENDA')
       and not exists (select 1 from consignacao_movimentos where pedido_id = new.id and tipo = 'ESTORNO') then
      insert into consignacao_movimentos (vendedora_id, tipo, quantidade, pedido_id, observacao, criado_por)
      values (
        old.criado_por, 'ESTORNO', new.quantidade, new.id,
        'Estorno automático — Pedido #' || new.numero_pedido || ' saiu do status Venda Concluída',
        new.criado_por
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_consignacao on pedidos;
create trigger set_consignacao
after insert or update on pedidos
for each row execute function trg_pedidos_consignacao();

-- ---------------------------------------------------------
-- Row Level Security: mesmo padrão do restante do banco — só a
-- service_role (usada pelas Functions) lê/escreve, o frontend nunca
-- fala direto com o Supabase.
-- ---------------------------------------------------------
alter table consignacao_movimentos enable row level security;
alter table repasses_consignacao enable row level security;
