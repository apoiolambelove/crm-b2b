-- =========================================================
-- CRM B2B - VERSÃO FINAL: ORIGEM + CONSIGNAÇÃO + REGRAS COMERCIAIS
-- Execute uma vez no Supabase SQL Editor.
-- =========================================================

alter table pedidos add column if not exists origem_pedido text not null default 'MATRIZ';
alter table pedidos drop constraint if exists pedidos_origem_pedido_check;
alter table pedidos add constraint pedidos_origem_pedido_check check (origem_pedido in ('MATRIZ','CONSIGNACAO'));
create index if not exists idx_pedidos_origem on pedidos (origem_pedido);

-- Regras comerciais são referências operacionais, não restrições do banco.
-- O pedido pode ter qualquer quantidade e qualquer preço negociado.
-- Valores padrão/sugestões ficam na interface: R$ 59,00/un.; acima de 50 un., R$ 49,00/un.

-- Baixa imediata para consignação, com ajuste por diferença, estorno ao sair
-- da consignação e reposição ao excluir uma venda ativa.
create or replace function trg_pedidos_consignacao()
returns trigger as $$
declare
  estoque_atual integer;
  old_ativa boolean;
  new_ativa boolean;
  old_vendedora uuid;
  new_vendedora uuid;
  delta integer;
begin
  if tg_op = 'DELETE' then
    old_ativa := old.origem_pedido = 'CONSIGNACAO' and old.status not in ('CANCELADA','NAO_EFETIVADA');
    if old_ativa then
      insert into consignacao_movimentos (vendedora_id, tipo, quantidade, pedido_id, observacao, criado_por)
      values (old.criado_por, 'ESTORNO', old.quantidade, old.id,
              'Estorno automático pela exclusão da venda de consignação — Pedido #' || old.numero_pedido,
              old.criado_por);
    end if;
    return old;
  end if;

  old_ativa := (tg_op = 'UPDATE' and old.origem_pedido = 'CONSIGNACAO' and old.status not in ('CANCELADA','NAO_EFETIVADA'));
  new_ativa := (new.origem_pedido = 'CONSIGNACAO' and new.status not in ('CANCELADA','NAO_EFETIVADA'));
  old_vendedora := case when tg_op = 'UPDATE' then old.criado_por else null end;
  new_vendedora := new.criado_por;

  if tg_op = 'INSERT' then
    if new_ativa then
      select coalesce(sum(quantidade),0) into estoque_atual
      from consignacao_movimentos where vendedora_id = new_vendedora;
      if estoque_atual < new.quantidade then
        raise exception 'Estoque de consignação insuficiente. Disponível: %, solicitado: %.', estoque_atual, new.quantidade;
      end if;
      insert into consignacao_movimentos (vendedora_id, tipo, quantidade, pedido_id, observacao, criado_por)
      values (new_vendedora, 'SAIDA_VENDA', -new.quantidade, new.id,
              'Baixa automática no cadastro da venda de consignação — Pedido #' || new.numero_pedido,
              new.criado_por);
    end if;
    return new;
  end if;

  -- UPDATE: só mexe no estoque quando origem/status/quantidade/vendedora realmente exigem ajuste.
  if old_ativa and new_ativa and old_vendedora = new_vendedora and old.quantidade = new.quantidade then
    return new;
  end if;

  if old_ativa then
    insert into consignacao_movimentos (vendedora_id, tipo, quantidade, pedido_id, observacao, criado_por)
    values (old_vendedora, 'ESTORNO', old.quantidade, new.id,
            'Estorno automático da baixa anterior — Pedido #' || old.numero_pedido,
            new.criado_por);
  end if;

  if new_ativa then
    select coalesce(sum(quantidade),0) into estoque_atual
    from consignacao_movimentos where vendedora_id = new_vendedora;
    if estoque_atual < new.quantidade then
      raise exception 'Estoque de consignação insuficiente. Disponível: %, solicitado: %.', estoque_atual, new.quantidade;
    end if;
    insert into consignacao_movimentos (vendedora_id, tipo, quantidade, pedido_id, observacao, criado_por)
    values (new_vendedora, 'SAIDA_VENDA', -new.quantidade, new.id,
            'Baixa automática no cadastro/alteração da venda de consignação — Pedido #' || new.numero_pedido,
            new.criado_por);
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists set_consignacao on pedidos;
create trigger set_consignacao
after insert or update or delete on pedidos
for each row execute function trg_pedidos_consignacao();
