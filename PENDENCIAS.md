# PENDENCIAS - ReceiTassia's

Versao atual: 1.9.0
Ultima coisa feita: Home do cliente (menu de amanha + lista de pedidos + Pay now).
A aba Menu foi removida do cliente.

---

## PRIMEIRO AO RETOMAR: subir e testar a v1.9.0
- [ ] Subir os arquivos da v1.9.0 no GitHub (ou o zip)
- [ ] Testar Home do cliente: card de amanha, lista de pedidos, botao Pay now
- [ ] Confirmar que a aba Menu sumiu (3 abas: Home, Order, Profile)

---

## TELAS QUE FALTAM CONSTRUIR

### Admin
- [ ] **Orders** (PRIORIDADE) - ver pedidos, confirmar pagamentos, ver metodo usado,
      aprovar atrasados (Accept/Too late), ver QUANTO COZINHAR AMANHA
- [ ] **Customers** - lista (nome, gasto, qtde, ultima compra), add manual,
      editar/excluir, editar senha do cliente
- [ ] **Dashboard** - $ por periodo, qtde marmitas, quem falta pagar,
      Top 5 marmitas, Top 5 clientes

### Cliente
- [ ] **Profile** - editar dados do cliente

---

## MELHORIAS ANOTADAS PRA DEPOIS
- [ ] Polimento visual geral (cores/contrastes) quando as telas estiverem prontas
- [ ] Seletor de calendario no Menu admin (hoje digita data AAAA-MM-DD na mao)
- [ ] PWA: gerar icone definitivo (hoje e provisorio) + instalar no iPhone
- [ ] Travar caloteiro: bloquear novo pedido de quem tem divida aberta (a decidir)

---

## DECISOES JA TOMADAS (nao reabrir)
- Tudo em ingles | 1 Supabase + 1 GitHub | apps separados (admin/ cliente/ shared/)
- Semana toda = $12/dia (special sempre $15) | avulso $14
- Corte 15:30 do dia anterior, fuso Central (Alabama) - avisa mas nao trava;
  admin aprova os atrasados
- Pagamento externo: CashApp (link com valor) + Zelle/Venmo/Apple Cash
  com confirmacao manual do admin; cliente registra qual metodo usou
- Versao muda SO no config.js (footer le sozinho)
- Login: telefone + senha (Supabase Auth, sem SMS)

---

## LEMBRETES TECNICOS
- Ao atualizar arquivo no GitHub: Ctrl+A -> Delete -> colar (nao colar por cima!)
- config.js ja vem com URL + anon key reais embutidas
- SQL ja rodados: setup inicial + supabase_update_v1.5 (campos de aprovacao)
- Status de pedido: status_pagamento (pendente/pago/confirmado),
  cancelado (bool), precisa_aprovacao, status_aprovacao, metodo_pagamento
