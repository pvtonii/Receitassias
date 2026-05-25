/* ============================================
   APP ADMIN - SETOR: Customers (Clientes)
   - Lista de clientes em cards: nome, total gasto, qtde marmitas, ultima compra
   - Busca por nome/telefone
   - Adicionar cliente manualmente (so registro: nome + telefone)
     (o login o proprio cliente cria depois no app, com esse telefone)
   - Editar nome/telefone
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Clientes = {

  _todos: [],
  _busca: "",
  _ordem: "nome",   // nome | gasto | marmitas

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">Customers</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Your customers and their history.</p>

      <button class="btn" id="btn-novo-cli" style="width:100%;margin-bottom:14px">
        + Add customer</button>

      <input class="campo" id="busca-cli" type="text"
             placeholder="Search by name or phone" value="${this._esc(this._busca)}">

      <div style="display:flex;gap:6px;margin-bottom:6px">
        <button class="${this._ordem==='nome'?'btn':'btn-secundario'}" style="flex:1;padding:9px;font-size:13px"
          onclick="Clientes._setOrdem('nome')">A-Z</button>
        <button class="${this._ordem==='gasto'?'btn':'btn-secundario'}" style="flex:1;padding:9px;font-size:13px"
          onclick="Clientes._setOrdem('gasto')">Top spender</button>
        <button class="${this._ordem==='marmitas'?'btn':'btn-secundario'}" style="flex:1;padding:9px;font-size:13px"
          onclick="Clientes._setOrdem('marmitas')">Most meals</button>
      </div>

      <div id="lista-cli" style="margin-top:6px">Loading...</div>`;

    document.getElementById("btn-novo-cli")
      .addEventListener("click", () => this._abrirForm());
    document.getElementById("busca-cli")
      .addEventListener("input", e => { this._busca = e.target.value; this._desenharLista(); });

    await this._carregar();
  },

  async _carregar() {
    const { data, error } = await sb.from("clientes")
      .select("*").order("nome", { ascending: true });
    if (error) {
      document.getElementById("lista-cli").innerHTML = this._aviso("Error: " + error.message);
      return;
    }
    // nao mostra admins na lista de clientes
    this._todos = (data || []).filter(c => !c.is_admin);
    this._desenharLista();
  },

  _desenharLista() {
    const el = document.getElementById("lista-cli");
    if (!el) return;
    const termo = this._busca.trim().toLowerCase();
    let lista = this._todos;
    if (termo) {
      lista = lista.filter(c =>
        (c.nome || "").toLowerCase().includes(termo) ||
        (c.telefone || "").includes(termo));
    }

    if (!lista.length) {
      el.innerHTML = this._aviso(termo ? "No customer found." : "No customers yet.");
      return;
    }

    // ordenacao
    lista = [...lista].sort((a, b) => {
      if (this._ordem === "gasto")
        return Number(b.total_gasto||0) - Number(a.total_gasto||0);
      if (this._ordem === "marmitas")
        return (b.total_marmitas||0) - (a.total_marmitas||0);
      return (a.nome||"").localeCompare(b.nome||"");  // alfabetica
    });

    el.innerHTML = lista.map(c => this._card(c)).join("");
  },

  _setOrdem(o) {
    this._ordem = o;
    this.render(document.getElementById("app"));
  },

  _card(c) {
    return `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:start;gap:8px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:16px">${this._esc(c.nome)}</div>
            <div style="font-size:13px;color:var(--texto-suave)">${this._fmtTel(c.telefone)}</div>
          </div>
          <button class="btn-icone editar" title="Edit"
            onclick="Clientes._abrirForm('${c.id}')">&#9999;&#65039;</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <div style="flex:1;text-align:center;background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase">Spent</div>
            <div style="font-weight:700">$${Number(c.total_gasto||0).toFixed(0)}</div>
          </div>
          <div style="flex:1;text-align:center;background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase">Meals</div>
            <div style="font-weight:700">${c.total_marmitas||0}</div>
          </div>
          <div style="flex:1;text-align:center;background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase">Last</div>
            <div style="font-weight:700;font-size:13px">${c.ultima_compra ? this._fmtData(c.ultima_compra) : "—"}</div>
          </div>
        </div>
      </div>`;
  },

  /* Form: adicionar (so registro) ou editar nome/telefone */
  _abrirForm(id = null) {
    const editando = this._todos.find(c => c.id === id);
    const container = document.getElementById("app");
    container.innerHTML = `
      <button class="btn-voltar" onclick="Clientes.render(document.getElementById('app'))">← Back</button>
      <h2 style="margin-bottom:6px">${editando ? "Edit" : "Add"} customer</h2>
      ${!editando ? `<p style="font-size:13px;color:var(--texto-suave);margin-bottom:14px">
        This creates a record so you can track their orders. They can sign up
        in the app later using this phone number.</p>` : ""}

      <label>Name</label>
      <input class="campo" id="c-nome" type="text" placeholder="Customer name"
             value="${editando ? this._esc(editando.nome) : ""}">

      <label>Phone</label>
      <input class="campo" id="c-tel" type="tel" placeholder="(803) 555-1234"
             value="${editando ? this._esc(editando.telefone) : ""}">

      <div class="erro-msg" id="c-erro"></div>
      <button class="btn" id="c-salvar" style="width:100%">Save</button>`;

    document.getElementById("c-salvar")
      .addEventListener("click", () => this._salvar(id));
  },

  async _salvar(id) {
    const erro = document.getElementById("c-erro");
    const btn = document.getElementById("c-salvar");
    const nome = document.getElementById("c-nome").value.trim();
    const telBruto = document.getElementById("c-tel").value.trim();
    const telefone = telBruto.replace(/\D/g, "");

    if (!nome || !telefone) { erro.textContent = "Enter name and phone."; return; }

    btn.disabled = true; erro.textContent = "";
    let resp;
    if (id) {
      resp = await sb.from("clientes").update({ nome, telefone }).eq("id", id);
    } else {
      // cria so o registro. id gerado aqui; quando o cliente fizer sign up
      // com este telefone, o app liga a conta a este registro.
      resp = await sb.from("clientes").insert({
        id: crypto.randomUUID(),
        nome, telefone, is_admin: false
      });
    }
    btn.disabled = false;

    if (resp.error) {
      erro.textContent = resp.error.message.includes("duplicate")
        ? "A customer with this phone already exists."
        : "Error: " + resp.error.message;
      return;
    }
    this.render(document.getElementById("app"));
  },

  /* helpers */
  _fmtTel(t) {
    const s = String(t || "").replace(/\D/g, "");
    if (s.length === 10) return `(${s.slice(0,3)}) ${s.slice(3,6)}-${s.slice(6)}`;
    return t || "";
  },
  _fmtData(iso) {
    const d = new Date(iso + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[d.getMonth()]} ${d.getDate()}`;
  },
  _aviso(txt) {
    return '<div class="card" style="text-align:center;color:var(--texto-suave)">' + txt + '</div>';
  },
  _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  }
};/* ============================================
   APP ADMIN - SETOR: Customers (Clientes)
   - Lista de clientes em cards: nome, total gasto, qtde marmitas, ultima compra
   - Busca por nome/telefone
   - Adicionar cliente manualmente (so registro: nome + telefone)
     (o login o proprio cliente cria depois no app, com esse telefone)
   - Editar nome/telefone
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Clientes = {

  _todos: [],
  _busca: "",

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">Customers</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Your customers and their history.</p>

      <button class="btn" id="btn-novo-cli" style="width:100%;margin-bottom:14px">
        + Add customer</button>

      <input class="campo" id="busca-cli" type="text"
             placeholder="Search by name or phone" value="${this._esc(this._busca)}">

      <div id="lista-cli" style="margin-top:6px">Loading...</div>`;

    document.getElementById("btn-novo-cli")
      .addEventListener("click", () => this._abrirForm());
    document.getElementById("busca-cli")
      .addEventListener("input", e => { this._busca = e.target.value; this._desenharLista(); });

    await this._carregar();
  },

  async _carregar() {
    const { data, error } = await sb.from("clientes")
      .select("*").order("nome", { ascending: true });
    if (error) {
      document.getElementById("lista-cli").innerHTML = this._aviso("Error: " + error.message);
      return;
    }
    // nao mostra admins na lista de clientes
    this._todos = (data || []).filter(c => !c.is_admin);
    this._desenharLista();
  },

  _desenharLista() {
    const el = document.getElementById("lista-cli");
    if (!el) return;
    const termo = this._busca.trim().toLowerCase();
    let lista = this._todos;
    if (termo) {
      lista = lista.filter(c =>
        (c.nome || "").toLowerCase().includes(termo) ||
        (c.telefone || "").includes(termo));
    }

    if (!lista.length) {
      el.innerHTML = this._aviso(termo ? "No customer found." : "No customers yet.");
      return;
    }

    el.innerHTML = lista.map(c => this._card(c)).join("");
  },

  _card(c) {
    return `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:start;gap:8px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:16px">${this._esc(c.nome)}</div>
            <div style="font-size:13px;color:var(--texto-suave)">${this._fmtTel(c.telefone)}</div>
          </div>
          <button class="btn-icone editar" title="Edit"
            onclick="Clientes._abrirForm('${c.id}')">&#9999;&#65039;</button>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <div style="flex:1;text-align:center;background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase">Spent</div>
            <div style="font-weight:700">$${Number(c.total_gasto||0).toFixed(0)}</div>
          </div>
          <div style="flex:1;text-align:center;background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase">Meals</div>
            <div style="font-weight:700">${c.total_marmitas||0}</div>
          </div>
          <div style="flex:1;text-align:center;background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--texto-suave);text-transform:uppercase">Last</div>
            <div style="font-weight:700;font-size:13px">${c.ultima_compra ? this._fmtData(c.ultima_compra) : "—"}</div>
          </div>
        </div>
      </div>`;
  },

  /* Form: adicionar (so registro) ou editar nome/telefone */
  _abrirForm(id = null) {
    const editando = this._todos.find(c => c.id === id);
    const container = document.getElementById("app");
    container.innerHTML = `
      <button class="btn-voltar" onclick="Clientes.render(document.getElementById('app'))">← Back</button>
      <h2 style="margin-bottom:6px">${editando ? "Edit" : "Add"} customer</h2>
      ${!editando ? `<p style="font-size:13px;color:var(--texto-suave);margin-bottom:14px">
        This creates a record so you can track their orders. They can sign up
        in the app later using this phone number.</p>` : ""}

      <label>Name</label>
      <input class="campo" id="c-nome" type="text" placeholder="Customer name"
             value="${editando ? this._esc(editando.nome) : ""}">

      <label>Phone</label>
      <input class="campo" id="c-tel" type="tel" placeholder="(803) 555-1234"
             value="${editando ? this._esc(editando.telefone) : ""}">

      <div class="erro-msg" id="c-erro"></div>
      <button class="btn" id="c-salvar" style="width:100%">Save</button>`;

    document.getElementById("c-salvar")
      .addEventListener("click", () => this._salvar(id));
  },

  async _salvar(id) {
    const erro = document.getElementById("c-erro");
    const btn = document.getElementById("c-salvar");
    const nome = document.getElementById("c-nome").value.trim();
    const telBruto = document.getElementById("c-tel").value.trim();
    const telefone = telBruto.replace(/\D/g, "");

    if (!nome || !telefone) { erro.textContent = "Enter name and phone."; return; }

    btn.disabled = true; erro.textContent = "";
    let resp;
    if (id) {
      resp = await sb.from("clientes").update({ nome, telefone }).eq("id", id);
    } else {
      // cria so o registro. id gerado aqui; quando o cliente fizer sign up
      // com este telefone, o app liga a conta a este registro.
      resp = await sb.from("clientes").insert({
        id: crypto.randomUUID(),
        nome, telefone, is_admin: false
      });
    }
    btn.disabled = false;

    if (resp.error) {
      erro.textContent = resp.error.message.includes("duplicate")
        ? "A customer with this phone already exists."
        : "Error: " + resp.error.message;
      return;
    }
    this.render(document.getElementById("app"));
  },

  /* helpers */
  _fmtTel(t) {
    const s = String(t || "").replace(/\D/g, "");
    if (s.length === 10) return `(${s.slice(0,3)}) ${s.slice(3,6)}-${s.slice(6)}`;
    return t || "";
  },
  _fmtData(iso) {
    const d = new Date(iso + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[d.getMonth()]} ${d.getDate()}`;
  },
  _aviso(txt) {
    return '<div class="card" style="text-align:center;color:var(--texto-suave)">' + txt + '</div>';
  },
  _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  }
};
