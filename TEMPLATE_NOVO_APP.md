# TEMPLATE — Como pedir um app modular (reaproveitável)
> Cole isto no começo de um chat novo quando quiser criar OUTRO app
> na mesma filosofia (separado por setores, fácil de manter, econômico).

---

## INSTRUÇÃO PARA A CLAUDE (cole e preencha os [  ])

Quero criar um app web seguindo ESTA arquitetura modular (não um index.html
gigante). Siga estas regras de estrutura:

### Filosofia
- Separar por SETORES: cada tela = 1 arquivo próprio. Editar uma tela mexe
  em 1 arquivo só, nunca no app inteiro.
- Pasta `shared/` com o que é comum (cores, config, login). Apps/áreas
  diferentes (ex: admin e usuário) em pastas separadas, dividindo a `shared/`.
- 1 repositório só. 1 backend só (separação por permissões, não por projeto).

### Estrutura de pastas (modelo)
```
meu-app/
├── shared/
│   ├── css/theme.css        # TODAS as cores num lugar (CSS variables)
│   └── js/
│       ├── config.js        # VERSÃO + conexão backend + regras de negócio
│       └── auth.js          # login (se houver)
├── [area1]/                 # ex: admin
│   ├── index.html
│   └── js/
│       ├── app.js           # navegação + roteador
│       └── [tela].js        # 1 arquivo por tela
├── [area2]/                 # ex: cliente/usuário
│   └── (mesma ideia)
├── MAPA_DO_PROJETO.md       # mapa "onde mexo pra X" (ESSENCIAL p/ economizar tokens)
└── README.md
```

### Convenções obrigatórias
1. Cada tela é um objeto JS com método `.render(container)`.
2. Controle de VERSÃO num lugar só (config.js); o footer lê automático.
   Numeração MAIOR.MENOR.CORREÇÃO.
3. Comentário de versão no topo do index (opcional) + footer dinâmico.
4. Cores só no theme.css via CSS variables (nada de cor "hardcoded" nas telas).
5. Mobile-first se for usado no celular; PWA se quiser ícone na tela.
6. Sempre me entregar o ARQUIVO COMPLETO pronto pra colar, e dizer QUAIS
   arquivos mudaram a cada versão.
7. Validar a sintaxe (e testar a lógica de cálculos) antes de entregar.
8. Manter um MAPA_DO_PROJETO.md atualizado: tabela "funcionalidade → arquivo".

### Para economizar tokens (IMPORTANTE)
- No começo de cada chat novo, vou colar o MAPA_DO_PROJETO.md.
- Use o mapa pra ir DIRETO no arquivo certo, sem reler o projeto todo.
- Só me peça pra colar o conteúdo de um arquivo se você realmente precisar dele.

### Antes de codar
- Faça poucas perguntas de cada vez (use botões/opções) pra alinhar o que
  eu quero, principalmente regras de negócio, ANTES de escrever código.
- Se algo tiver risco (segurança, dinheiro, dados), me avise honestamente.

---

## MEU APP (preencher)
- Nome: [   ]
- O que faz: [   ]
- Quem usa (áreas/perfis): [ ex: admin + cliente ]
- Idioma(s): [   ]
- Onde roda: [ celular / desktop / ambos ]
- Backend: [ ex: Supabase / nenhum / outro ]
- Telas que imagino: [ liste por área ]
- Regras de negócio principais: [   ]
