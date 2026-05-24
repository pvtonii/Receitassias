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
      <h2 style="margin-bottom:4px">Ingredientes</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        O que pode entrar nas marmitas.</p>

      <button class="btn" id="btn-novo-ing" style="width:100%;margin-bottom:18px">
        + Novo ingrediente</button>

      <div id="lista-ing">Carregando...</div>`;

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
    if (error) { el.innerHTML = this._aviso("Erro ao carregar: " + error.message); return; }

    this._itens = data || [];
    if (!this._itens.length) {
      el.innerHTML = this._aviso("Nenhum ingrediente ainda. Toque em \u201CNovo ingrediente\u201D.");
      return;
    }

    // agrupa por categoria
    const grupos = {};
    for (const it of this._itens) {
      const cat = (it.categoria || "Sem categoria").trim();
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
        <button class="btn-secundario" style="padding:8px 12px"
                onclick="Ingredientes._abrirForm('${it.id}')">Editar</button>
        <button class="btn-perigo" style="padding:8px 12px"
                onclick="Ingredientes._excluir('${it.id}')">Excluir</button>
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
      <h2 style="margin-bottom:16px">${editando ? "Editar" : "Novo"} ingrediente</h2>

      <label>Nome</label>
      <input class="campo" id="f-nome" type="text" placeholder="ex: Frango grelhado"
             value="${editando ? this._esc(editando.nome) : ""}">

      <label>Categoria</label>
      <input class="campo" id="f-cat" type="text" list="cats-usadas"
             placeholder="ex: Proteina"
             value="${editando ? this._esc(editando.categoria || "") : ""}">
      <datalist id="cats-usadas">
        ${this._categoriasUsadas().map(c => `<option value="${this._esc(c)}">`).join("")}
      </datalist>

      <div class="erro-msg" id="f-erro"></div>

      <button class="btn" id="f-salvar" style="width:100%;margin-bottom:10px">Salvar</button>
      <button class="btn-secundario" id="f-cancelar" style="width:100%">Cancelar</button>`;

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

    if (!nome) { erro.textContent = "Digite o nome do ingrediente."; return; }

    btn.disabled = true; erro.textContent = "";
    let resp;
    if (id) {
      resp = await sb.from("ingredientes").update({ nome, categoria }).eq("id", id);
    } else {
      resp = await sb.from("ingredientes").insert({ nome, categoria });
    }
    btn.disabled = false;

    if (resp.error) { erro.textContent = "Erro: " + resp.error.message; return; }
    this.render(document.getElementById("app"));
  },

  async _excluir(id) {
    const it = this._itens.find(i => i.id === id);
    if (!confirm('Excluir "' + (it ? it.nome : "este ingrediente") + '"?')) return;
    const { error } = await sb.from("ingredientes").delete().eq("id", id);
    if (error) { alert("Erro ao excluir: " + error.message); return; }
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
