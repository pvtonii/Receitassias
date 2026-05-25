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
    const { data } = await sb.auth.getSession();
    if (!data.session) { this._cliente = null; return null; }

    const { data: cliente } = await sb
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
        <h2 style="margin-bottom:6px">Log in</h2>
        <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
          Use your phone number and password.</p>

        <label>Phone</label>
        <input class="campo" id="in-telefone" type="tel"
               placeholder="(205) 555-1234" autocomplete="tel">

        <label>Password</label>
        <input class="campo" id="in-senha" type="password"
               placeholder="your password" autocomplete="current-password">

        <div class="erro-msg" id="auth-erro"></div>

        <button class="btn" id="btn-entrar" style="width:100%">Log in</button>
        ${permitirCadastro ? `
        <p style="text-align:center;margin-top:14px;font-size:14px">
          Don't have an account?
          <a href="#" id="link-cadastro" style="color:var(--primaria)">Sign up</a>
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
        <h2 style="margin-bottom:16px">Sign up</h2>

        <label>Name</label>
        <input class="campo" id="in-nome" type="text" placeholder="your name">

        <label>Phone</label>
        <input class="campo" id="in-telefone" type="tel" placeholder="(205) 555-1234">

        <label>Password (min. 6 characters)</label>
        <input class="campo" id="in-senha" type="password" placeholder="create a password">

        <div class="erro-msg" id="auth-erro"></div>

        <button class="btn" id="btn-cadastrar" style="width:100%">Sign up</button>
        <p style="text-align:center;margin-top:14px;font-size:14px">
          Already have an account?
          <a href="#" id="link-voltar" style="color:var(--primaria)">Log in</a>
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

    if (!telefone || !senha) { erro.textContent = "Please enter phone and password."; return; }

    btn.disabled = true; erro.textContent = "";
    const { error } = await sb.auth.signInWithPassword({
      email: telefoneParaEmail(telefone),
      password: senha
    });
    btn.disabled = false;

    if (error) { erro.textContent = "Incorrect phone or password."; return; }

    const cliente = await this.checarSessao();

    // App admin: bloqueia quem nao e admin
    if (opts.exigirAdmin && !this.ehAdmin()) {
      await this.sair();
      erro.textContent = "This account does not have admin access.";
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

    if (!nome || !telefone || !senha) { erro.textContent = "Please fill in all fields."; return; }
    if (senha.length < 6) { erro.textContent = "Password must be at least 6 characters."; return; }

    btn.disabled = true; erro.textContent = "";

    // 1) cria o usuario no Auth (telefone vira email interno)
    const { data, error } = await sb.auth.signUp({
      email: telefoneParaEmail(telefone),
      password: senha
    });
    if (error) {
      btn.disabled = false;
      erro.textContent = error.message.includes("already")
        ? "This phone already has an account. Try logging in."
        : "Sign up error: " + error.message;
      return;
    }

    // 2) cria/conecta a linha em 'clientes'
    const so_numeros = telefone.replace(/\D/g, "");

    // Se o admin ja criou um registro manual com este telefone (id diferente),
    // conecta esse registro ao login novo em vez de criar outro (evita duplicata).
    const { data: existente } = await sb.from("clientes")
      .select("id").eq("telefone", so_numeros).maybeSingle();

    let e2 = null;
    if (existente) {
      // muda o id do registro existente para o id do Auth recem-criado
      const r = await sb.from("clientes")
        .update({ id: data.user.id, nome: nome }).eq("telefone", so_numeros);
      e2 = r.error;
    } else {
      const r = await sb.from("clientes").insert({
        id: data.user.id,
        telefone: so_numeros,
        nome: nome,
        is_admin: false
      });
      e2 = r.error;
    }
    btn.disabled = false;
    if (e2) { erro.textContent = "Error saving profile: " + e2.message; return; }

    const cliente = await this.checarSessao();
    if (opts.aoEntrar) opts.aoEntrar(cliente);
  },

  async sair() {
    await sb.auth.signOut();
    this._cliente = null;
    location.reload();
  }
};
