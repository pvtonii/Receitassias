/* ============================================
   APP ADMIN - SETOR: Ingredientes
   Lista de ingredientes que podem entrar nas marmitas.
   Categoria e livre (digitada), com sugestao das ja usadas.
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Ingredientes = {

  _itens: [],   // cache do que veio do banco

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">Ingredients</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        What can go into the meals.</p>

      <button class="btn" id="btn-novo-ing" style="width:100%;margin-bottom:18px">
        + New ingredient</button>

      <div id="lista-ing">Loading...</div>`;

    document.getElementById("btn-novo-ing")
      .addEventListener("click", () => this._abrirForm());

    await this._carregar();
  },

  async _carregar() {
    const { data, error } = await sb
      .from("ingredientes")
      .select("*")
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    const el = document.getElementById("lista-ing");
    if (error) { el.innerHTML = this._aviso("Error loading: " + error.message); return; }

    this._itens = data || [];
    if (!this._itens.length) {
      el.innerHTML = this._aviso("No ingredients yet. Tap \u201CNew ingredient\u201D.");
      return;
    }

    // agrupa por categoria
    const grupos = {};
    for (const it of this._itens) {
      const cat = (it.categoria || "No category").trim();
      (grupos[cat] = grupos[cat] || []).push(it);
    }

    el.innerHTML = Object.keys(grupos).map(cat => `
      <div style="margin-bottom:18px">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;
                    letter-spacing:.5px;color:var(--texto-suave);margin-bottom:8px">
          ${this._esc(cat)}</div>
        ${grupos[cat].map(it => this._linha(it)).join("")}
      </div>`).join("");
  },

  _linha(it) {
    return `
      <div class="card" style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="flex:1;font-weight:600">${this._esc(it.nome)}</span>
        <button class="btn-icone editar" title="Edit"
                onclick="Ingredientes._abrirForm('${it.id}')">&#9999;&#65039;</button>
        <button class="btn-icone excluir" title="Delete"
                onclick="Ingredientes._excluir('${it.id}')">&#128465;</button>
      </div>`;
  },

  _categoriasUsadas() {
    const set = new Set(this._itens.map(i => (i.categoria || "").trim()).filter(Boolean));
    return [...set].sort();
  },

  _abrirForm(id = null) {
    const editando = this._itens.find(i => i.id === id);
    const container = document.getElementById("app");
    container.innerHTML = `
      <h2 style="margin-bottom:16px">${editando ? "Edit" : "New"} ingredient</h2>

      <label>Name</label>
      <input class="campo" id="f-nome" type="text" placeholder="e.g. Grilled chicken"
             value="${editando ? this._esc(editando.nome) : ""}">

      <label>Category</label>
      <input class="campo" id="f-cat" type="text" list="cats-usadas"
             placeholder="e.g. Protein"
             value="${editando ? this._esc(editando.categoria || "") : ""}">
      <datalist id="cats-usadas">
        ${this._categoriasUsadas().map(c => `<option value="${this._esc(c)}">`).join("")}
      </datalist>

      <div class="erro-msg" id="f-erro"></div>

      <button class="btn" id="f-salvar" style="width:100%;margin-bottom:10px">Save</button>
      <button class="btn-secundario" id="f-cancelar" style="width:100%">Cancel</button>`;

    document.getElementById("f-salvar")
      .addEventListener("click", () => this._salvar(id));
    document.getElementById("f-cancelar")
      .addEventListener("click", () => this.render(container));
  },

  async _salvar(id) {
    const erro = document.getElementById("f-erro");
    const btn  = document.getElementById("f-salvar");
    const nome = document.getElementById("f-nome").value.trim();
    const categoria = document.getElementById("f-cat").value.trim() || null;

    if (!nome) { erro.textContent = "Enter the ingredient name."; return; }

    btn.disabled = true; erro.textContent = "";
    let resp;
    if (id) {
      resp = await sb.from("ingredientes").update({ nome, categoria }).eq("id", id);
    } else {
      resp = await sb.from("ingredientes").insert({ nome, categoria });
    }
    btn.disabled = false;

    if (resp.error) { erro.textContent = "Error: " + resp.error.message; return; }
    this.render(document.getElementById("app"));
  },

  async _excluir(id) {
    const it = this._itens.find(i => i.id === id);
    if (!confirm('Delete "' + (it ? it.nome : "this ingredient") + '"?')) return;
    const { error } = await sb.from("ingredientes").delete().eq("id", id);
    if (error) { alert("Delete error: " + error.message); return; }
    this._carregar();
  },

  _aviso(txt) {
    return '<div class="card" style="text-align:center;color:var(--texto-suave)">' + txt + '</div>';
  },
  _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  }
};
