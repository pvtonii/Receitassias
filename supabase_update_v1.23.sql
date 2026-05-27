-- ============================================================
-- ATUALIZACAO v1.23.0 - pedidos manuais do admin (walk-in)
-- Rode no Supabase > SQL Editor (uma vez)
-- ============================================================

-- Nome livre para pedidos sem cliente cadastrado (walk-in)
alter table pedidos
  add column if not exists nome_avulso text;
