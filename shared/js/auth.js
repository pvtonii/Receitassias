/* ============================================
   SETOR: AUTH  (login telefone + senha)
   Compartilhado por admin/ e cliente/.
   Edite SO este arquivo para mexer no login/cadastro.

   API publica:
     Auth.checarSessao()      -> retorna o cliente logado ou null
     Auth.ehAdmin()           -> true/false
     Auth.mostrarLogin(opts)  -> desenha a tela de login no #app
     Auth.sair()
============================================ */

const Auth = {

  _cliente: null,   // guarda os dados do cliente logado nesta sessao

  /* Retorna o registro do cliente logado (ou null se nao ha sessao) */
  async checarSessao() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { this._cliente = null; return null; }

    const { data: cliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", data.session.user.id)
      .single();

    this._cliente = cliente || null;
    return this._cliente;
  },

  ehAdmin() {
    return !!(this._cliente && this._cliente.is_admin);
  },

  /* ---------------------------------------------
     Tela de LOGIN / CADASTRO
     opts.exigirAdmin = true  -> usado no app admin:
       bloqueia quem nao for admin depois do login.
     opts.permitirCadastro = true -> mostra a aba "Criar conta"
       (true no app cliente, false no admin)
     opts.aoEntrar = funcao chamada apos login com sucesso
  --------------------------------------------- */
  mostrarLogin(opts = {}) {
    const permitirCadastro = opts.permitirCadastro ?? true;
    const app = document.getElementById("app");

    app.innerHTML = `
      <div class="card" style="max-width:340px;margin:48px auto">
        <h2 style="margin-bottom:6px">Entrar</h2>
        <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
          Use seu telefone e senha.</p>

        <label>Telefone</label>
        <input class="campo" id="in-telefone" type="tel"
               placeholder="(205) 555-1234" autocomplete="tel">

        <label>Senha</label>
        <input class="campo" id="in-senha" type="password"
               placeholder="sua senha" autocomplete="current-password">

        <div class="erro-msg" id="auth-erro"></div>

        <button class="btn" id="btn-entrar" style="width:100%">Entrar</button>
        ${permitirCadastro ? `
        <p style="text-align:center;margin-top:14px;font-size:14px">
          Nao tem conta?
          <a href="#" id="link-cadastro" style="color:var(--primaria)">Criar conta</a>
        </p>` : ""}
      </div>`;

    document.getElementById("btn-entrar")
      .addEventListener("click", () => this._entrar(opts));

    // Enter envia
    document.getElementById("in-senha")
      .addEventListener("keydown", e => { if (e.key === "Enter") this._entrar(opts); });

    if (permitirCadastro) {
      document.getElementById("link-cadastro")
        .addEventListener("click", e => { e.preventDefault(); this._mostrarCadastro(opts); });
    }
  },

  /* Tela de CADASTRO (so cliente) */
  _mostrarCadastro(opts) {
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="card" style="max-width:340px;margin:48px auto">
        <h2 style="margin-bottom:16px">Criar conta</h2>

        <label>Nome</label>
        <input class="campo" id="in-nome" type="text" placeholder="seu nome">

        <label>Telefone</label>
        <input class="campo" id="in-telefone" type="tel" placeholder="(205) 555-1234">

        <label>Senha (min. 6 caracteres)</label>
        <input class="campo" id="in-senha" type="password" placeholder="crie uma senha">

        <div class="erro-msg" id="auth-erro"></div>

        <button class="btn" id="btn-cadastrar" style="width:100%">Cadastrar</button>
        <p style="text-align:center;margin-top:14px;font-size:14px">
          Ja tem conta?
          <a href="#" id="link-voltar" style="color:var(--primaria)">Entrar</a>
        </p>
      </div>`;

    document.getElementById("btn-cadastrar")
      .addEventListener("click", () => this._cadastrar(opts));
    document.getElementById("link-voltar")
      .addEventListener("click", e => { e.preventDefault(); this.mostrarLogin(opts); });
  },

  /* --- acoes --- */

  async _entrar(opts) {
    const erro = document.getElementById("auth-erro");
    const btn = document.getElementById("btn-entrar");
    const telefone = document.getElementById("in-telefone").value.trim();
    const senha = document.getElementById("in-senha").value;

    if (!telefone || !senha) { erro.textContent = "Preencha telefone e senha."; return; }

    btn.disabled = true; erro.textContent = "";
    const { error } = await supabase.auth.signInWithPassword({
      email: telefoneParaEmail(telefone),
      password: senha
    });
    btn.disabled = false;

    if (error) { erro.textContent = "Telefone ou senha incorretos."; return; }

    const cliente = await this.checarSessao();

    // App admin: bloqueia quem nao e admin
    if (opts.exigirAdmin && !this.ehAdmin()) {
      await this.sair();
      erro.textContent = "Esta conta nao tem acesso de administrador.";
      return;
    }

    if (opts.aoEntrar) opts.aoEntrar(cliente);
  },

  async _cadastrar(opts) {
    const erro = document.getElementById("auth-erro");
    const btn = document.getElementById("btn-cadastrar");
    const nome = document.getElementById("in-nome").value.trim();
    const telefone = document.getElementById("in-telefone").value.trim();
    const senha = document.getElementById("in-senha").value;

    if (!nome || !telefone || !senha) { erro.textContent = "Preencha todos os campos."; return; }
    if (senha.length < 6) { erro.textContent = "A senha precisa de ao menos 6 caracteres."; return; }

    btn.disabled = true; erro.textContent = "";

    // 1) cria o usuario no Auth (telefone vira email interno)
    const { data, error } = await supabase.auth.signUp({
      email: telefoneParaEmail(telefone),
      password: senha
    });
    if (error) {
      btn.disabled = false;
      erro.textContent = error.message.includes("already")
        ? "Este telefone ja tem conta. Tente entrar."
        : "Erro ao cadastrar: " + error.message;
      return;
    }

    // 2) cria a linha em 'clientes' ligada ao id do Auth
    const so_numeros = telefone.replace(/\D/g, "");
    const { error: e2 } = await supabase.from("clientes").insert({
      id: data.user.id,
      telefone: so_numeros,
      nome: nome,
      is_admin: false
    });
    btn.disabled = false;
    if (e2) { erro.textContent = "Erro ao salvar perfil: " + e2.message; return; }

    const cliente = await this.checarSessao();
    if (opts.aoEntrar) opts.aoEntrar(cliente);
  },

  async sair() {
    await supabase.auth.signOut();
    this._cliente = null;
    location.reload();
  }
};
