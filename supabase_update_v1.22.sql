-- ============================================================
-- ATUALIZACAO v1.22.0 - quantidade de marmitas por pedido
-- Rode no Supabase > SQL Editor (uma vez)
-- ============================================================

alter table pedidos
  add column if not exists quantidade integer default 1;
