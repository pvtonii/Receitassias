# Receitassias

App de controle e venda de marmitas. **Dois apps** (Admin e Cliente),
**um GitHub** (este repo) e **um Supabase**.

## Estrutura (um repositorio, tres pastas)

```
receitassias/
├── supabase_setup.sql   <- cole no Supabase 1x para criar o banco
├── shared/              <- usado pelos DOIS apps (sem duplicar nada)
│   ├── css/theme.css    <- TODAS as cores
│   └── js/
│       ├── config.js    <- VERSAO + conexao Supabase + regras
│       └── auth.js      <- login/cadastro (telefone + senha)
├── admin/
│   ├── index.html
│   └── js/
│       ├── app.js       <- roteador (exige login admin)
│       ├── dashboard.js · pedidos.js · ingredientes.js
│       └── clientes.js  · menu.js
└── cliente/
    ├── index.html
    └── js/
        ├── app.js       <- roteador (permite cadastro)
        ├── dashboard.js · menu.js · pedido.js · profile.js
```

Cada `index.html` puxa `../shared/...`. Mudou a cor ou a conexao?
Mexe so no `shared/` e os dois apps mudam juntos.

**Regra de ouro:** para editar uma tela, mexa SO no arquivo dela
em `admin/js/<tela>.js` ou `cliente/js/<tela>.js`.

## Como mudar a VERSAO (faca SEMPRE que editar algo)

A versao e UNICA para os dois apps. Sao 2 lugares:

1. `shared/js/config.js` (topo):
   ```js
   const APP_VERSION = "1.0.1";
   const APP_DATA    = "2026-05-24";
   ```
2. O comentario no topo do `index.html` que voce editou
   (`admin/index.html` ou `cliente/index.html`): VERSAO / DATA / MUDANCA.

Os footers atualizam sozinhos. Numeracao: MAIOR.MENOR.CORRECAO
(bug = ultimo numero · funcao nova = numero do meio · mudanca grande = primeiro).

## Setup (1 vez)

1. Crie um projeto no Supabase.
2. SQL Editor > cole `supabase_setup.sql` > Run.
3. Settings > API: copie Project URL + anon public key.
4. Cole os dois em `shared/js/config.js`. Preencha REGRAS.PAGAMENTO.
5. Crie seu usuario admin: Authentication > Add user. Use como email
   `SEUTELEFONE@receitassias.app` (so numeros, ex 2055551234@receitassias.app)
   e uma senha. Depois, na tabela `clientes`, crie a linha desse usuario
   com `is_admin = true` (id = o id do usuario no Auth).

## Rodar localmente
Abra `admin/index.html` ou `cliente/index.html` num servidor local
(ex: extensao "Live Server" do VS Code). Abrir como arquivo direto
pode bloquear os scripts.

## Seguranca
- A anon key PODE ficar no codigo (protegida pelo RLS).
- A service_role key NUNCA vai no codigo.
- O codigo do admin nao e carregado no app do cliente (apps separados).
