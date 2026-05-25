# MAPA DO PROJETO — ReceiTassia's
> Cole este arquivo no INÍCIO de um chat novo. Ele diz a Claude
> exatamente qual arquivo abrir para cada tarefa, evitando ler o
> projeto todo (economiza tokens).

## O que é
App de venda de marmitas. DOIS apps separados (admin + cliente),
UM Supabase, UM repositório GitHub. Tudo em inglês. Mobile-first (iPhone) + PWA.
Hospedado em GitHub Pages. Versão atual: **1.12.0**.

## Stack
- HTML/CSS/JS puro (sem framework). Supabase via CDN (`window.supabase`).
- Nosso cliente Supabase chama-se `sb` (NÃO `supabase` — conflita com a lib).
- Edição direta no GitHub pelo navegador (Claude entrega arquivo completo p/ colar).

## ESTRUTURA DE PASTAS  (1 repo)
```
receitassias/
├── shared/                      # usado pelos DOIS apps
│   ├── css/theme.css            # TODAS as cores + estilos de botão/card
│   └── js/
│       ├── config.js            # VERSÃO + conexão Supabase + REGRAS (preços, corte, pagamento)
│       └── auth.js              # login/cadastro (telefone+senha); liga registro manual ao sign up
├── admin/
│   ├── index.html               # carrega os js do admin
│   ├── icons/                   # ícones PWA
│   ├── manifest.json            # PWA admin
│   └── js/
│       ├── app.js               # navegação (barra inferior) + roteador admin
│       ├── dashboard.js         # $ recebido/a receber, marmitas, falta pagar, Top 5 (período navegável)
│       ├── pedidos.js           # ORDERS: produção do dia + lista + confirmar pgto + aprovar atrasado
│       ├── menu.js              # monta marmita de cada dia da semana (escolhe ingredientes, special, preço)
│       ├── ingredientes.js      # CRUD de ingredientes (categoria livre c/ autocomplete)
│       └── clientes.js          # CUSTOMERS: lista (gasto/marmitas/última), busca, add manual, editar
├── cliente/
│   ├── index.html               # carrega os js do cliente
│   ├── icons/ · manifest.json   # PWA cliente
│   └── js/
│       ├── app.js               # navegação (Home/Order/Profile) + roteador cliente
│       ├── dashboard.js         # HOME: marmita de amanhã + meus pedidos agrupados por semana + Pay now
│       ├── pedido.js            # ORDER: ver cardápio, escolher dias, preços, pagamento (CashApp link etc.)
│       ├── profile.js           # (STUB - ainda não construído)
│       └── menu.js              # (STUB - removido da navegação; ignorar)
├── supabase_setup.sql           # cria tabelas + RLS + trigger (rodar 1x)
├── supabase_update_v1.5.sql     # add campos precisa_aprovacao/status_aprovacao (rodar 1x)
├── PENDENCIAS.md                # o que falta
└── MAPA_DO_PROJETO.md           # este arquivo
```

## "ONDE MEXO PRA...?"  (atalho pra Claude)
- Cores / aparência de botão / card .......... shared/css/theme.css
- Versão do app / preços / corte / pagamento .. shared/js/config.js
- Login, cadastro, senha ...................... shared/js/auth.js
- Navegação / abas do admin .................. admin/js/app.js
- Navegação / abas do cliente ................ cliente/js/app.js
- Relatórios, faturamento, Top 5 ............. admin/js/dashboard.js
- Ver/confirmar pedidos, produção do dia ..... admin/js/pedidos.js
- Montar cardápio da semana .................. admin/js/menu.js
- Cadastrar ingredientes ..................... admin/js/ingredientes.js
- Gerenciar clientes ......................... admin/js/clientes.js
- Tela inicial do cliente / meus pedidos ..... cliente/js/dashboard.js
- Fazer pedido / tela de pagamento ........... cliente/js/pedido.js
- Editar perfil do cliente ................... cliente/js/profile.js (a construir)

## BANCO (tabelas)
- clientes (id, telefone, nome, total_gasto, total_marmitas, ultima_compra, is_admin)
- ingredientes (id, nome, categoria)
- menus (id, semana_inicio, semana_fim)
- menu_itens (id, menu_id, dia, nome, especial, preco)
- menu_item_ingredientes (menu_item_id, ingrediente_id)
- pedidos (id, cliente_id, dia_consumo, total, status_pagamento, metodo_pagamento,
           cancelado, precisa_aprovacao, status_aprovacao)
- pedido_itens (id, pedido_id, menu_item_id, preco)
- RLS: cliente vê só o seu; admin (is_admin=true) vê tudo.
- Trigger: ao confirmar pagamento, atualiza total_gasto/total_marmitas/ultima_compra.

## REGRAS DE NEGÓCIO
- Avulso $14 | semana cheia (5 dias) $12/marmita | special sempre $15
- Corte: 15:30 do dia anterior, fuso Central (America/Chicago). Não trava;
  pedido atrasado é marcado e o admin aprova (Accept/Too late).
- Pagamento externo: CashApp (link cash.app/$tag/valor) + Zelle/Venmo/Apple Cash.
  Cliente marca "I paid" + método; admin confirma no Orders.
- status_pagamento: pendente → pago (cliente marcou) → confirmado (admin validou)

## CONVENÇÕES
- Cada setor é um objeto JS com `.render(container)`. Edita-se UM arquivo por tela.
- Versão muda SÓ em shared/js/config.js (APP_VERSION). Footer lê sozinho.
- Numeração: MAIOR.MENOR.CORREÇÃO (bug=último, feature=meio, refator grande=primeiro).
- Comentários do código em PT (só p/ leitura); textos visíveis em inglês.
- Ao colar no GitHub: Ctrl+A → Delete → colar (nunca colar por cima!).
- config.js já vem com URL + anon key reais embutidas.

## O QUE FALTA
- cliente/js/profile.js (editar dados + "esqueci a senha")
- Polimento visual geral
- Seletor de calendário no menu admin (hoje digita AAAA-MM-DD)
- (opcional) travar quem tem dívida aberta
