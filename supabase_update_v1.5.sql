-- ============================================================
-- ATUALIZACAO v1.5.0 - controle de prazo (meio-termo)
-- Rode no Supabase > SQL Editor (uma vez)
-- ============================================================

-- Marca pedidos feitos APOS o corte (15:30 do dia anterior).
-- false = entrou no prazo normal | true = atrasado, admin precisa aprovar
alter table pedidos
  add column if not exists precisa_aprovacao boolean default false;

-- status_aprovacao: null = nao precisa | 'pendente' | 'aceito' | 'recusado'
alter table pedidos
  add column if not exists status_aprovacao text;
