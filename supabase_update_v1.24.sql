-- ============================================
-- ReceiTassias v1.24 — Cupons de desconto
-- Rodar no Supabase SQL Editor
-- ============================================

-- Tabela de cupons
CREATE TABLE IF NOT EXISTS cupons (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo       TEXT UNIQUE NOT NULL,
  desconto_pct INTEGER NOT NULL CHECK (desconto_pct BETWEEN 1 AND 100),
  ativo        BOOLEAN DEFAULT true,
  criado_em    TIMESTAMPTZ DEFAULT now()
);

-- Colunas novas em pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS cupom_codigo TEXT,
  ADD COLUMN IF NOT EXISTS desconto_pct INTEGER;

-- RLS
ALTER TABLE cupons ENABLE ROW LEVEL SECURITY;

-- Admins gerenciam tudo
CREATE POLICY "admins_cupons_all" ON cupons
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM clientes WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM clientes WHERE id = auth.uid() AND is_admin = true)
  );

-- Clientes autenticados podem ler cupons ativos (para validar o codigo)
CREATE POLICY "clientes_read_cupons" ON cupons
  FOR SELECT TO authenticated
  USING (ativo = true);
