-- ============================================================
-- ATUALIZACAO v1.21.0 - dia sem marmita
-- Rode no Supabase > SQL Editor (uma vez)
-- ============================================================

-- Marca dias que nao terao marmita naquela semana.
-- false (default) = dia normal | true = sem marmita pra ninguem
alter table menu_itens
  add column if not exists fechado boolean default false;
