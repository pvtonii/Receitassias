/* ============================================
   APP ADMIN - SETOR: Menu
   Monta a marmita de cada dia (Mon-Fri) de uma semana.
   1 marmita por dia, com ingredientes escolhidos da lista,
   marca de "special" e preco automatico ($14 / $15 special).
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Menu = {

  _semanas: [],        // menus (semanas) do banco
  _ingredientes: [],   // lista de ingredientes pra escolher
  _DIAS: ["Mon", "Tue", "Wed", "Thu", "Fri"],

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">Menu</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Weekly meals (Mon-Fri).</p>
      <button class="btn" id="btn-nova-semana" style="width:100%;margin-bottom:18px">
        + New week</button>
      <div id="lista-semanas">Loading...</div>`;

    document.getElementById("btn-nova-semana")
      .addEventListener("click", () => this._novaSemana());

    await this._carregarSemanas();
  },

  async _carregarSemanas() {
    const { data, error } = await sb
      .from("menus")
      .select("*")
      .order("semana_inicio", { ascending: false });

    const el = document.getElementById("lista-semanas");
    if (error) { el.innerHTML = this._aviso("Error loading: " + error.message); return; }

    this._semanas = data || [];
    if (!this._semanas.length) {
      el.innerHTML = this._aviso('No weeks yet. Tap "New week".');
      return;
    }

    el.innerHTML = this._semanas.map(s => `
      <div class="card" style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="flex:1;font-weight:600">${this._intervalo(s.semana_inicio, s.semana_fim)}</span>
        <button class="btn-secundario"
                style="padding:0 16px;height:40px;min-height:0;flex-shrink:0"
                onclick="Menu._abrirSemana('${s.id}')">Open</button>
        <button class="btn-icone excluir" title="Delete week"
                style="flex-shrink:0"
                onclick="event.stopPropagation();Menu._excluirSemana('${s.id}')">&#128465;</button>
      </div>`).join("");
  },

  /* Cria uma semana nova: pede a data da segunda-feira (Monday) */
  async _novaSemana() {
    const monday = await this._pedirData();
    if (!monday) return;

    const fim = new Date(monday);
    fim.setDate(fim.getDate() + 4);  // Mon + 4 = Fri

    const { error } = await sb.from("menus").insert({
      semana_inicio: this._iso(monday),
      semana_fim: this._iso(fim)
    });
    if (error) { alert("Error: " + error.message); return; }
    this._carregarSemanas();
  },

  /* Tela de uma semana: os 5 dias com a marmita de cada um */
  async _abrirSemana(menuId) {
    const semana = this._semanas.find(s => s.id === menuId);
    const container = document.getElementById("app");
    container.innerHTML = `<p style="color:var(--texto-suave)">Loading week...</p>`;

    // carrega ingredientes (uma vez) e os itens ja salvos desta semana
    if (!this._ingredientes.length) await this._carregarIngredientes();
    const itens = await this._itensDaSemana(menuId);

    container.innerHTML = `
      <button class="btn-voltar"
              onclick="Menu.render(document.getElementById('app'))">← Back</button>
      <h2 style="margin-bottom:4px">${this._intervalo(semana.semana_inicio, semana.semana_fim)}</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Tap a day to set its meal.</p>
      <div id="dias-semana"></div>`;

    const wrap = document.getElementById("dias-semana");
    wrap.innerHTML = this._DIAS.map((dia, i) => {
      const dataDia = this._diaData(semana.semana_inicio, i);
      const item = itens.find(it => it.dia === this._iso(dataDia));
      return this._cardDia(menuId, dia, dataDia, item);
    }).join("");
  },

  _cardDia(menuId, diaNome, dataDia, item) {
    const iso = this._iso(dataDia);
    const temItem = !!item;
    return `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <strong>${diaNome} · ${this._diaMes(dataDia)}</strong>
              ${temItem && item.especial ? '<span class="badge-especial">SPECIAL</span>' : ""}
            </div>
            ${temItem ? `
              <div style="font-weight:600;margin-top:4px">${this._esc(item.nome)}</div>
              <div style="color:var(--texto-suave);font-size:13px;margin-top:2px">
                $${Number(item.preco).toFixed(0)}${item._ings && item._ings.length ? " · " + item._ings.map(x => this._esc(x)).join(", ") : ""}
              </div>` : ""}
          </div>
          <button class="btn-secundario"
                  style="padding:0 14px;height:40px;min-height:0;flex-shrink:0"
                  onclick="Menu._editarDia('${menuId}','${iso}','${diaNome}', ${item ? `'${item.id}'` : "null"})">
            ${temItem ? "Edit" : "+ Add"}</button>
        </div>
      </div>`;
  },

  /* Formulario da marmita de um dia */
  _editarDia(menuId, iso, diaNome, itemId) {
    itemId = (itemId === "null" || !itemId) ? null : itemId;
    const container = document.getElementById("app");
    // procura item existente no cache montado em _abrirSemana
    const item = this._cacheItens && this._cacheItens.find(i => i.id === itemId);

    const nome = item ? item.nome : "";
    const especial = item ? item.especial : false;
    const ingsMarcados = (item && item._ingIds) ? item._ingIds : [];

    // agrupa ingredientes por categoria pra escolha
    const grupos = {};
    for (const ing of this._ingredientes) {
      const c = (ing.categoria || "Other").trim();
      (grupos[c] = grupos[c] || []).push(ing);
    }

    container.innerHTML = `
      <button class="btn-voltar"
              onclick="Menu._abrirSemana('${menuId}')">← Back</button>
      <h2 style="margin-bottom:16px">${diaNome} meal</h2>

      <label>Meal name</label>
      <input class="campo" id="m-nome" type="text"
             placeholder="e.g. Grilled Chicken Bowl" value="${this._esc(nome)}">

      <label style="display:flex;align-items:center;gap:10px;margin:10px 0 16px;cursor:pointer">
        <input type="checkbox" id="m-especial" ${especial ? "checked" : ""}
               style="width:22px;height:22px"> This is a special ($15)
      </label>

      <label style="display:block;margin-bottom:8px">Ingredients</label>
      <div id="m-ings">
        ${Object.keys(grupos).map(cat => `
          <div style="margin-bottom:12px">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;
                        color:var(--texto-suave);margin-bottom:6px">${this._esc(cat)}</div>
            ${grupos[cat].map(ing => `
              <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer">
                <input type="checkbox" class="ing-chk" value="${ing.id}"
                  ${ingsMarcados.includes(ing.id) ? "checked" : ""}
                  style="width:20px;height:20px">
                ${this._esc(ing.nome)}
              </label>`).join("")}
          </div>`).join("") || this._aviso("No ingredients. Add some in the Items tab first.")}
      </div>

      <div class="erro-msg" id="m-erro"></div>
      <button class="btn" id="m-salvar" style="width:100%;margin-bottom:10px">Save meal</button>
      ${itemId ? `<button class="btn-perigo" id="m-remover" style="width:100%">Remove meal</button>` : ""}`;

    document.getElementById("m-salvar")
      .addEventListener("click", () => this._salvarDia(menuId, iso, itemId));
    if (itemId) {
      document.getElementById("m-remover")
        .addEventListener("click", () => this._removerDia(menuId, itemId));
    }
  },

  async _salvarDia(menuId, iso, itemId) {
    const erro = document.getElementById("m-erro");
    const btn = document.getElementById("m-salvar");
    const nome = document.getElementById("m-nome").value.trim();
    const especial = document.getElementById("m-especial").checked;
    const ingIds = [...document.querySelectorAll(".ing-chk:checked")].map(c => c.value);

    if (!nome) { erro.textContent = "Enter the meal name."; return; }

    const preco = especial ? REGRAS.PRECO_ESPECIAL : REGRAS.PRECO_AVULSO;
    btn.disabled = true; erro.textContent = "";

    let savedId = itemId;
    if (itemId) {
      const { error } = await sb.from("menu_itens")
        .update({ nome, especial, preco }).eq("id", itemId);
      if (error) { btn.disabled = false; erro.textContent = "Error: " + error.message; return; }
    } else {
      const { data, error } = await sb.from("menu_itens")
        .insert({ menu_id: menuId, dia: iso, nome, especial, preco })
        .select().single();
      if (error) { btn.disabled = false; erro.textContent = "Error: " + error.message; return; }
      savedId = data.id;
    }

    // regrava os ingredientes do item (apaga e insere os marcados)
    await sb.from("menu_item_ingredientes").delete().eq("menu_item_id", savedId);
    if (ingIds.length) {
      const linhas = ingIds.map(id => ({ menu_item_id: savedId, ingrediente_id: id }));
      await sb.from("menu_item_ingredientes").insert(linhas);
    }

    btn.disabled = false;
    this._abrirSemana(menuId);
  },

  async _removerDia(menuId, itemId) {
    if (!confirm("Remove this meal?")) return;
    const { error } = await sb.from("menu_itens").delete().eq("id", itemId);
    if (error) { alert("Error: " + error.message); return; }
    this._abrirSemana(menuId);
  },

  async _excluirSemana(menuId) {
    const s = this._semanas.find(x => x.id === menuId);
    if (!confirm("Delete the week " + this._intervalo(s.semana_inicio, s.semana_fim) + "? This removes all its meals.")) return;
    const { error } = await sb.from("menus").delete().eq("id", menuId);
    if (error) { alert("Error: " + error.message); return; }
    this._carregarSemanas();
  },

  /* --- dados auxiliares --- */

  async _carregarIngredientes() {
    const { data } = await sb.from("ingredientes").select("*")
      .order("categoria", { ascending: true }).order("nome", { ascending: true });
    this._ingredientes = data || [];
  },

  async _itensDaSemana(menuId) {
    const { data: itens } = await sb.from("menu_itens")
      .select("*").eq("menu_id", menuId);
    const lista = itens || [];
    // busca os ingredientes ligados a cada item (pra mostrar e pra editar)
    for (const it of lista) {
      const { data: links } = await sb.from("menu_item_ingredientes")
        .select("ingrediente_id").eq("menu_item_id", it.id);
      it._ingIds = (links || []).map(l => l.ingrediente_id);
      it._ings = it._ingIds
        .map(id => (this._ingredientes.find(g => g.id === id) || {}).nome)
        .filter(Boolean);
    }
    this._cacheItens = lista;   // usado pelo formulario
    return lista;
  },

  /* --- datas --- */
  _pedirData() {
    return new Promise(resolve => {
      // sugere a proxima segunda-feira
      const hoje = new Date();
      const diff = hoje.getDay() === 0 ? 1 : 8 - hoje.getDay();
      const proxSegunda = new Date(hoje);
      proxSegunda.setDate(hoje.getDate() + diff);

      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;" +
        "display:flex;align-items:flex-end;justify-content:center";

      overlay.innerHTML = `
        <div style="background:#fff;width:100%;max-width:720px;border-radius:16px 16px 0 0;
                    padding:24px 24px calc(24px + env(safe-area-inset-bottom))">
          <h3 style="margin:0 0 4px">New week</h3>
          <p style="color:var(--texto-suave);font-size:14px;margin:0 0 16px">
            Pick any day — the Monday of that week is used.</p>
          <input type="date" id="seletor-data"
                 value="${this._iso(proxSegunda)}"
                 style="width:100%;padding:10px 12px;border:1px solid var(--borda);
                        border-radius:var(--raio-sm);font-size:16px;
                        background:#fff;color:var(--texto);margin-bottom:8px">
          <div id="seletor-preview" style="font-size:14px;color:var(--texto-suave);
               min-height:20px;margin-bottom:20px"></div>
          <div style="display:flex;gap:10px">
            <button class="btn-secundario" id="seletor-cancel" style="flex:1">Cancel</button>
            <button class="btn" id="seletor-ok" style="flex:1">Create week</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);

      const input  = overlay.querySelector("#seletor-data");
      const preview = overlay.querySelector("#seletor-preview");

      const atualizar = () => {
        if (!input.value) { preview.textContent = ""; return; }
        const monday = this._snapMonday(new Date(input.value + "T00:00:00"));
        const friday = new Date(monday);
        friday.setDate(friday.getDate() + 4);
        preview.innerHTML = `Week: <strong>${this._intervalo(this._iso(monday), this._iso(friday))}</strong>`;
      };
      input.addEventListener("input", atualizar);
      atualizar();

      const fechar = val => { document.body.removeChild(overlay); resolve(val); };

      overlay.querySelector("#seletor-cancel").addEventListener("click", () => fechar(null));
      overlay.querySelector("#seletor-ok").addEventListener("click", () => {
        if (!input.value) return;
        fechar(this._snapMonday(new Date(input.value + "T00:00:00")));
      });
      overlay.addEventListener("click", e => { if (e.target === overlay) fechar(null); });
    });
  },

  // retorna a segunda-feira da semana do dia informado
  _snapMonday(d) {
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return monday;
  },
  _diaData(inicioIso, offset) {
    const d = new Date(inicioIso + "T00:00:00");
    d.setDate(d.getDate() + offset);
    return d;
  },
  _iso(d) { return d.toISOString().slice(0, 10); },
  _intervalo(ini, fim) {
    const a = new Date(ini + "T00:00:00"), b = new Date(fim + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (a.getMonth() === b.getMonth())
      return `${m[a.getMonth()]} ${a.getDate()}-${b.getDate()}`;
    return `${m[a.getMonth()]} ${a.getDate()} - ${m[b.getMonth()]} ${b.getDate()}`;
  },
  _diaMes(d) {
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
