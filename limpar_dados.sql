-- ============================================
-- ReceiTassias — Limpar todos os dados de teste
-- Mantém: clientes, ingredientes, cupons
-- Apaga: pedidos, menus e tudo relacionado
-- ============================================
-- Rodar no Supabase SQL Editor
-- ============================================

-- 1. pedido_itens (depende de pedidos e menu_itens)
DELETE FROM pedido_itens;

-- 2. pedidos (depende de clientes)
DELETE FROM pedidos;

-- 3. menu_item_ingredientes (depende de menu_itens e ingredientes)
DELETE FROM menu_item_ingredientes;

-- 4. menu_itens (depende de menus)
DELETE FROM menu_itens;

-- 5. menus
DELETE FROM menus;

-- 6. Resetar estatisticas dos clientes (total_gasto, total_marmitas, ultima_compra)
UPDATE clientes SET total_gasto = 0, total_marmitas = 0, ultima_compra = NULL
WHERE NOT is_admin;

-- ============================================
-- Clientes, ingredientes e cupons sao mantidos.
-- Se quiser apagar ingredientes tambem, rode:
--   DELETE FROM ingredientes;
-- Se quiser apagar cupons tambem, rode:
--   DELETE FROM cupons;
-- ============================================
