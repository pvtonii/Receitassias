-- ============================================================
-- RECEITASSIAS - BANCO DE DADOS (Supabase / PostgreSQL)
-- Supabase > SQL Editor > New Query > cole tudo > Run
-- ============================================================

-- 1) CLIENTES (ligado ao login do Supabase em auth.users)
create table clientes (
  id              uuid primary key references auth.users(id) on delete cascade,
  telefone        text unique not null,
  nome            text not null,
  total_gasto     numeric(10,2) default 0,
  total_marmitas  int default 0,
  ultima_compra   date,
  is_admin        boolean default false,
  criado_em       timestamptz default now()
);

-- 2) INGREDIENTES
create table ingredientes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  categoria  text,
  criado_em  timestamptz default now()
);

-- 3) MENUS (uma linha por semana)
create table menus (
  id             uuid primary key default gen_random_uuid(),
  semana_inicio  date not null,
  semana_fim     date not null,
  criado_em      timestamptz default now()
);

-- 4) MENU_ITENS (marmita de cada dia)
create table menu_itens (
  id        uuid primary key default gen_random_uuid(),
  menu_id   uuid not null references menus(id) on delete cascade,
  dia       date not null,
  nome      text not null,
  especial  boolean default false,
  preco     numeric(10,2) not null default 14,
  criado_em timestamptz default now()
);

create table menu_item_ingredientes (
  menu_item_id   uuid references menu_itens(id) on delete cascade,
  ingrediente_id uuid references ingredientes(id) on delete cascade,
  primary key (menu_item_id, ingrediente_id)
);

-- 5) PEDIDOS
create table pedidos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references clientes(id) on delete cascade,
  dia_consumo       date not null,
  total             numeric(10,2) not null,
  status_pagamento  text default 'pendente',  -- pendente | pago | confirmado
  metodo_pagamento  text,                      -- cashapp | venmo | zelle | applecash
  cancelado         boolean default false,
  criado_em         timestamptz default now()
);

-- 6) PEDIDO_ITENS
create table pedido_itens (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references pedidos(id) on delete cascade,
  menu_item_id  uuid not null references menu_itens(id),
  preco         numeric(10,2) not null
);

-- ============================================================
-- RLS
-- ============================================================
alter table clientes      enable row level security;
alter table pedidos       enable row level security;
alter table pedido_itens  enable row level security;
alter table menus         enable row level security;
alter table menu_itens    enable row level security;
alter table ingredientes  enable row level security;
alter table menu_item_ingredientes enable row level security;

create or replace function eh_admin()
returns boolean language sql security definer stable as $$
  select coalesce((select is_admin from clientes where id = auth.uid()), false);
$$;

create policy "cliente ve o proprio" on clientes
  for select using (id = auth.uid() or eh_admin());
create policy "cliente edita o proprio" on clientes
  for update using (id = auth.uid() or eh_admin());
create policy "cadastro de cliente" on clientes
  for insert with check (id = auth.uid() or eh_admin());

create policy "cliente ve seus pedidos" on pedidos
  for select using (cliente_id = auth.uid() or eh_admin());
create policy "cliente cria pedido" on pedidos
  for insert with check (cliente_id = auth.uid() or eh_admin());
create policy "cliente atualiza seu pedido" on pedidos
  for update using (cliente_id = auth.uid() or eh_admin());

create policy "itens do proprio pedido" on pedido_itens
  for all using (
    eh_admin() or exists (
      select 1 from pedidos p
      where p.id = pedido_itens.pedido_id and p.cliente_id = auth.uid()
    )
  );

create policy "todos leem menus" on menus for select using (true);
create policy "admin edita menus" on menus for all using (eh_admin());
create policy "todos leem itens" on menu_itens for select using (true);
create policy "admin edita itens" on menu_itens for all using (eh_admin());
create policy "todos leem ingredientes" on ingredientes for select using (true);
create policy "admin edita ingredientes" on ingredientes for all using (eh_admin());
create policy "todos leem item_ing" on menu_item_ingredientes for select using (true);
create policy "admin edita item_ing" on menu_item_ingredientes for all using (eh_admin());

-- ============================================================
-- TRIGGER: atualiza totais do cliente quando pedido e confirmado
-- ============================================================
create or replace function atualizar_totais_cliente()
returns trigger language plpgsql security definer as $$
begin
  if new.status_pagamento = 'confirmado'
     and (old.status_pagamento is distinct from 'confirmado') then
    update clientes c set
      total_gasto    = total_gasto + new.total,
      total_marmitas = total_marmitas + (
        select count(*) from pedido_itens where pedido_id = new.id
      ),
      ultima_compra  = greatest(coalesce(ultima_compra, new.dia_consumo), new.dia_consumo)
    where c.id = new.cliente_id;
  end if;
  return new;
end;
$$;

create trigger trg_totais_cliente
  after update on pedidos
  for each row execute function atualizar_totais_cliente();
