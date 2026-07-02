-- =========================================================
-- CRM B2B - Pedidos Comerciais
-- Schema para Supabase (PostgreSQL)
-- Execute este script inteiro no SQL Editor do Supabase
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome_usuario text unique not null,
  nome_completo text not null,
  senha_hash text not null,
  perfil text not null check (perfil in ('ADMIN', 'VENDEDORA')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------
-- CLIENTES
-- ---------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome_empresa text not null,
  cnpj text,
  inscricao_estadual text,
  nome_socio text,
  telefone text,
  whatsapp text,
  email text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_clientes_cnpj on clientes (cnpj);
create index if not exists idx_clientes_cidade on clientes (cidade);

-- ---------------------------------------------------------
-- PEDIDOS
-- ---------------------------------------------------------
create sequence if not exists pedidos_numero_seq start 1001;

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  numero_pedido integer not null default nextval('pedidos_numero_seq') unique,
  data_pedido date not null default current_date,
  hora_pedido time not null default current_time,
  cliente_id uuid not null references clientes(id),
  produtos text not null,
  quantidade integer not null default 1,
  valor_total numeric(12,2) not null default 0,
  valor_frete numeric(12,2) not null default 0,
  forma_pagamento text not null check (forma_pagamento in ('PIX','BOLETO','CARTAO','DINHEIRO','TRANSFERENCIA','OUTROS')),
  observacoes text,
  status text not null default 'AGUARDANDO_APROVACAO'
    check (status in ('AGUARDANDO_APROVACAO','VENDA_CONCLUIDA','PENDENTE_PAGAMENTO','NAO_EFETIVADA','CANCELADA')),
  percentual_comissao numeric(5,2) not null default 15.00,
  valor_comissao numeric(12,2) generated always as (round(valor_total * percentual_comissao / 100, 2)) stored,
  comissao_status text not null default 'PENDENTE' check (comissao_status in ('PENDENTE','APROVADA')),
  criado_por uuid references usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_pedidos_status on pedidos (status);
create index if not exists idx_pedidos_data on pedidos (data_pedido);
create index if not exists idx_pedidos_cliente on pedidos (cliente_id);

-- Quando o status mudar para VENDA_CONCLUIDA a comissao_status vira APROVADA automaticamente
create or replace function trg_pedidos_comissao()
returns trigger as $$
begin
  if new.status = 'VENDA_CONCLUIDA' then
    new.comissao_status := 'APROVADA';
  else
    new.comissao_status := 'PENDENTE';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_comissao on pedidos;
create trigger set_comissao
before insert or update on pedidos
for each row execute function trg_pedidos_comissao();

-- ---------------------------------------------------------
-- HISTORICO (auditoria - nunca apagar)
-- ---------------------------------------------------------
create table if not exists historico (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id),
  nome_usuario text,
  pedido_id uuid references pedidos(id),
  acao text not null,
  detalhes text,
  ip text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_historico_pedido on historico (pedido_id);
create index if not exists idx_historico_data on historico (criado_em);

-- ---------------------------------------------------------
-- VIEW: pedidos com dados do cliente (facilita consultas)
-- ---------------------------------------------------------
create or replace view vw_pedidos as
select
  p.*,
  c.nome_empresa, c.cnpj, c.inscricao_estadual, c.nome_socio,
  c.telefone, c.whatsapp, c.email, c.cep, c.endereco, c.numero,
  c.complemento, c.bairro, c.cidade, c.estado
from pedidos p
join clientes c on c.id = p.cliente_id;

-- ---------------------------------------------------------
-- Row Level Security: desabilitado pois o acesso é feito
-- exclusivamente pelas Netlify Functions usando a service_role key
-- (nunca exponha a service_role key no frontend).
-- ---------------------------------------------------------
alter table usuarios enable row level security;
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table historico enable row level security;
-- Nenhuma policy é criada de propósito: somente a service_role
-- (usada pelas Functions) consegue ler/escrever. O frontend nunca
-- fala diretamente com o Supabase.
