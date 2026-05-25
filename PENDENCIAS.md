# PENDENCIAS - ReceiTassia's

Versao atual: 1.17.0
Ultima coisa feita: bloqueio por horario no Order (17:00 aviso / 17:30 bloqueia).

---

## MELHORIAS ANOTADAS PRA DEPOIS

- [ ] **Travar caloteiro** — bloquear novo pedido de quem tem divida aberta (a decidir)
- [ ] **Seletor de data no Menu admin** — hoje a semana e criada automaticamente
      a partir da segunda mais proxima; considerar permitir escolher outra data
- [ ] **PWA: icone definitivo** — icones atuais sao provisorios (icon-180/192/512.png)
- [ ] **Polimento visual geral** — cores, contrastes e espacamentos quando
      o fluxo todo estiver estavel

---

## DECISOES JA TOMADAS (nao reabrir)

- Tudo em ingles no app | 1 Supabase + 1 GitHub | apps separados (admin/ cliente/ shared/)
- Semana toda = $12/dia (special sempre $15) | avulso $14
- Corte em dois estagios, fuso Central (Alabama), referente ao dia anterior:
  - ate 17:00 → selecao normal
  - 17:01–17:30 → aviso "past cutoff – needs confirmation" (admin aprova)
  - 17:31+ → card bloqueado (apagado, nao selecionavel)
- Pagamento externo: CashApp (link com valor) + Zelle / Venmo / Apple Cash
  com confirmacao manual do admin; cliente registra qual metodo usou
- Versao muda SO no config.js — footer le sozinho, cache-busting automatico
- Login: telefone + senha (Supabase Auth, sem SMS)
- config.js carregado dinamicamente com ?v= da URL para garantir cache miss apos refresh

---

## LEMBRETES TECNICOS

- config.js tem URL + anon key reais embutidas (anon key e segura via RLS)
- SQL ja rodados: setup inicial + supabase_update_v1.5 (campos de aprovacao)
- Status de pedido: status_pagamento (pendente/pago/confirmado),
  cancelado (bool), precisa_aprovacao, status_aprovacao, metodo_pagamento
- Horarios de corte ficam em config.js: HORA_CORTE/MIN_CORTE (aviso) e
  HORA_BLOQUEIO/MIN_BLOQUEIO (bloqueio) — facil de ajustar
