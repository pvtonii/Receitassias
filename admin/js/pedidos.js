/* ============================================
   APP ADMIN - SETOR: Orders (Pedidos)
   - Producao: quantas marmitas de cada fazer no dia escolhido
   - Lista por cliente, com filtros (dia, status)
   - Acoes: confirmar pagamento, aprovar/recusar atrasados, ver metodo
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Pedidos = {

  _todos: [],
  _filtroDia: "",       // "" = todos os dias | ISO de um dia
  _filtroStatus: "all", // all | pendente | pago | confirmado

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">Orders</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Production & payments.</p>
      <button class="btn" id="btn-novo-pedido" style="width:100%;margin-bottom:18px">
        + New order</button>
      <div id="ord-prod" style="margin-bottom:20px">Loading...</div>
      <div id="ord-filtros" style="margin-bottom:14px"></div>
      <div id="ord-lista"></div>`;

    document.getElementById("btn-novo-pedido")
      .addEventListener("click", () => this._novoForm());

    await this._carregar();
  },

  async _novoForm() {
    const container = document.getElementById("app");
    container.innerHTML = `<p style="color:var(--texto-suave)">Loading...</p>`;

    const [cliRes, menusRes] = await Promise.all([
      sb.from("clientes").select("id, nome, telefone").eq("is_admin", false).order("nome"),
      sb.from("menus").select("*").order("semana_inicio", { ascending: false })
    ]);
    const clientes = cliRes.data || [];
    const menus    = menusRes.data || [];
    this._fClientes = clientes;
    this._fMenus    = menus;
    this._fQty      = 1;

    container.innerHTML = `
      <button class="btn-voltar"
              onclick="Pedidos.render(document.getElementById('app'))">← Back</button>
      <h2 style="margin-bottom:16px">New order</h2>

      <label>Customer</label>
      <select class="campo" id="f-cli">
        <option value="">Select customer...</option>
        ${clientes.map(c => `<option value="${c.id}">${this._esc(c.nome)} — ${this._fmtTel(c.telefone)}</option>`).join("")}
        <option value="__walkin__">— Walk-in (no account) —</option>
      </select>
      <div id="f-walkin-area" style="display:none;margin-top:8px">
        <input class="campo" id="f-walkin-nome" type="text"
               placeholder="Customer name (walk-in)">
      </div>

      <label style="margin-top:14px">Week</label>
      <select class="campo" id="f-semana">
        <option value="">Select week...</option>
        ${menus.map(m => `<option value="${m.id}">${this._fmtIntervalo(m.semana_inicio, m.semana_fim)}</option>`).join("")}
      </select>

      <label style="margin-top:14px">Day & meal</label>
      <select class="campo" id="f-dia">
        <option value="">Select week first...</option>
      </select>

      <label style="margin-top:14px">Quantity</label>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
        <button class="btn-secundario"
                style="width:40px;height:40px;font-size:20px;padding:0;flex-shrink:0"
                onclick="Pedidos._fQtyDelta(-1)">−</button>
        <span id="f-qty-val" style="font-weight:700;font-size:20px;min-width:24px;text-align:center">1</span>
        <button class="btn-secundario"
                style="width:40px;height:40px;font-size:20px;padding:0;flex-shrink:0"
                onclick="Pedidos._fQtyDelta(+1)">+</button>
      </div>

      <label style="margin-top:14px">Payment status</label>
      <select class="campo" id="f-status">
        <option value="pendente">Not paid yet</option>
        <option value="pago">Already paid</option>
      </select>
      <div id="f-metodo-area" style="display:none;margin-top:8px">
        <label>Payment method</label>
        <select class="campo" id="f-metodo">
          <option value="CashApp">CashApp</option>
          <option value="Venmo">Venmo</option>
          <option value="Zelle">Zelle</option>
          <option value="Apple Cash">Apple Cash</option>
        </select>
      </div>

      <div class="erro-msg" id="f-err" style="margin-top:10px"></div>
      <button class="btn" id="f-salvar" style="width:100%;margin-top:4px">Save order</button>`;

    document.getElementById("f-cli").addEventListener("change", e => {
      document.getElementById("f-walkin-area").style.display =
        e.target.value === "__walkin__" ? "block" : "none";
    });
    document.getElementById("f-semana").addEventListener("change", e =>
      this._fCarregarDias(e.target.value));
    document.getElementById("f-status").addEventListener("change", e => {
      document.getElementById("f-metodo-area").style.display =
        e.target.value === "pago" ? "block" : "none";
    });
    document.getElementById("f-salvar")
      .addEventListener("click", () => this._fSalvar());
  },

  _fQtyDelta(delta) {
    this._fQty = Math.max(1, Math.min(3, (this._fQty || 1) + delta));
    const el = document.getElementById("f-qty-val");
    if (el) el.textContent = this._fQty;
  },

  async _fCarregarDias(menuId) {
    const sel = document.getElementById("f-dia");
    if (!menuId) { sel.innerHTML = '<option value="">Select week first...</option>'; return; }
    sel.innerHTML = '<option value="">Loading...</option>';
    const { data } = await sb.from("menu_itens")
      .select("id, dia, nome, preco, especial, fechado")
      .eq("menu_id", menuId).eq("fechado", false)
      .order("dia", { ascending: true });
    const itens = data || [];
    if (!itens.length) {
      sel.innerHTML = '<option value="">No meals this week</option>';
      return;
    }
    const nomes = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    sel.innerHTML = '<option value="">Select day...</option>' +
      itens.map(it => {
        const d = new Date(it.dia + "T00:00:00");
        const label = `${nomes[d.getDay()]} ${d.getMonth()+1}/${d.getDate()} — ${this._esc(it.nome || "(no meal)")}${it.especial ? " ★" : ""}`;
        return `<option value="${it.id}" data-dia="${it.dia}" data-especial="${it.especial}">${label}</option>`;
      }).join("");
  },

  async _fSalvar() {
    const err  = document.getElementById("f-err");
    const btn  = document.getElementById("f-salvar");
    err.textContent = "";

    const cliVal     = document.getElementById("f-cli").value;
    const walkinNome = document.getElementById("f-walkin-nome")?.value.trim();
    const diaEl      = document.getElementById("f-dia");
    const opt        = diaEl.options[diaEl.selectedIndex];
    const itemId     = diaEl.value;
    const status     = document.getElementById("f-status").value;
    const metodo     = status === "pago" ? document.getElementById("f-metodo").value : null;
    const qty        = this._fQty || 1;

    if (!cliVal) { err.textContent = "Select a customer."; return; }
    if (cliVal === "__walkin__" && !walkinNome) { err.textContent = "Enter the walk-in name."; return; }
    if (!itemId) { err.textContent = "Select a day."; return; }

    const dia     = opt.dataset.dia;
    const especial = opt.dataset.especial === "true";
    const unit    = especial ? REGRAS.PRECO_ESPECIAL : REGRAS.PRECO_AVULSO;

    btn.disabled = true;
    const payload = {
      dia_consumo: dia, total: qty * unit, quantidade: qty,
      status_pagamento: status, metodo_pagamento: metodo,
      precisa_aprovacao: false, status_aprovacao: null
    };
    if (cliVal === "__walkin__") payload.nome_avulso = walkinNome;
    else payload.cliente_id = cliVal;

    const { data: ped, error } = await sb.from("pedidos").insert(payload).select().single();
    if (error) { btn.disabled = false; err.textContent = "Error: " + error.message; return; }

    await sb.from("pedido_itens").insert({ pedido_id: ped.id, menu_item_id: itemId, preco: unit });
    this.render(document.getElementById("app"));
  },

  async _carregar() {
    // traz pedidos + nome do cliente + nome da marmita
    const { data, error } = await sb.from("pedidos")
      .select("*, clientes(nome, telefone), pedido_itens(menu_itens(nome, especial))")
      .order("dia_consumo", { ascending: true });

    if (error) {
      document.getElementById("ord-prod").innerHTML = this._aviso("Error: " + error.message);
      return;
    }
    this._todos = data || [];

    // por padrao, o filtro de dia comeca em "amanha" se houver pedidos pra amanha
    if (!this._filtroDia) {
      const amanha = this._amanhaIso();
      if (this._todos.some(p => p.dia_consumo === amanha && !p.cancelado)) {
        this._filtroDia = amanha;
      }
    }

    this._desenharProducao();
    this._desenharFiltros();
    this._desenharLista();
  },

  /* ===== PRODUCAO: quantas de cada marmita no dia escolhido ===== */
  _desenharProducao() {
    const el = document.getElementById("ord-prod");
    const dia = this._filtroDia || this._amanhaIso();
    const doDia = this._todos.filter(p => p.dia_consumo === dia && !p.cancelado);

    if (!doDia.length) {
      el.innerHTML = `
        <div class="card" style="border:2px solid var(--primaria)">
          <div style="font-weight:700;margin-bottom:4px">🍳 Cooking for ${this._fmtData(dia)}</div>
          <div style="color:var(--texto-suave);font-size:14px">No orders for this day.</div>
        </div>`;
      return;
    }

    // conta por nome de marmita (total e quantos pagos), respeitando quantidade
    const cont = {};
    for (const p of doDia) {
      const nome = this._nomeMarmita(p);
      const qty = p.quantidade || 1;
      const pago = (p.status_pagamento === "pago" || p.status_pagamento === "confirmado");
      if (!cont[nome]) cont[nome] = { total: 0, pagos: 0 };
      cont[nome].total += qty;
      if (pago) cont[nome].pagos += qty;
    }
    const totalGeral = doDia.reduce((s, p) => s + (p.quantidade || 1), 0);

    el.innerHTML = `
      <div class="card" style="border:2px solid var(--primaria)">
        <div style="font-weight:700;margin-bottom:8px">🍳 Cooking for ${this._fmtData(dia)}</div>
        ${Object.keys(cont).map(nome => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;
                      border-bottom:1px solid var(--borda)">
            <span style="font-weight:600">${this._esc(nome)}</span>
            <span><strong>${cont[nome].total}</strong>
              <span style="font-size:12px;color:var(--texto-suave)">
                (${cont[nome].pagos} paid)</span></span>
          </div>`).join("")}
        <div style="margin-top:8px;font-weight:700;text-align:right">
          Total: ${totalGeral} meal(s)</div>
      </div>`;
  },

  /* ===== FILTROS ===== */
  _desenharFiltros() {
    const el = document.getElementById("ord-filtros");
    // dias disponiveis (unicos, nao cancelados)
    const dias = [...new Set(this._todos.filter(p => !p.cancelado).map(p => p.dia_consumo))].sort();

    el.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select class="campo" id="f-dia" style="flex:1;margin:0">
          <option value="">All days</option>
          ${dias.map(d => `<option value="${d}" ${d === this._filtroDia ? "selected" : ""}>
            ${this._fmtData(d)}</option>`).join("")}
        </select>
        <select class="campo" id="f-status" style="flex:1;margin:0">
          <option value="all" ${this._filtroStatus==="all"?"selected":""}>All status</option>
          <option value="pendente" ${this._filtroStatus==="pendente"?"selected":""}>Not paid</option>
          <option value="pago" ${this._filtroStatus==="pago"?"selected":""}>Paid (to confirm)</option>
          <option value="confirmado" ${this._filtroStatus==="confirmado"?"selected":""}>Confirmed</option>
        </select>
      </div>`;

    document.getElementById("f-dia").addEventListener("change", e => {
      this._filtroDia = e.target.value;
      this._desenharProducao();
      this._desenharLista();
    });
    document.getElementById("f-status").addEventListener("change", e => {
      this._filtroStatus = e.target.value;
      this._desenharLista();
    });
  },

  /* ===== LISTA POR CLIENTE/PEDIDO ===== */
  _desenharLista() {
    const el = document.getElementById("ord-lista");
    let lista = this._todos.filter(p => !p.cancelado);

    if (this._filtroDia) lista = lista.filter(p => p.dia_consumo === this._filtroDia);
    if (this._filtroStatus !== "all")
      lista = lista.filter(p => p.status_pagamento === this._filtroStatus);

    if (!lista.length) { el.innerHTML = this._aviso("No orders for this filter."); return; }

    el.innerHTML = lista.map(p => this._cardPedido(p)).join("");
  },

  _cardPedido(p) {
    const cliente = p.clientes ? p.clientes.nome : (p.nome_avulso ? p.nome_avulso + " (walk-in)" : "Walk-in");
    const tel = p.clientes ? p.clientes.telefone : "";
    const marmita = this._nomeMarmita(p);
    const metodo = p.metodo_pagamento ? `via ${p.metodo_pagamento}` : "";
    const atrasadoPendente = p.precisa_aprovacao && p.status_aprovacao === "pendente";

    return `
      <div class="card" style="margin-bottom:10px
           ${atrasadoPendente ? ";border:2px solid var(--erro)" : ""}">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
          <div style="flex:1">
            <div style="font-weight:700">${this._esc(cliente)}</div>
            <div style="font-size:13px;color:var(--texto-suave)">
              ${p.quantidade > 1 ? p.quantidade + "× " : ""}${this._esc(marmita)} · ${this._fmtData(p.dia_consumo)} · $${Number(p.total).toFixed(0)}</div>
            <div style="margin-top:4px">${this._statusLabel(p)} ${metodo ?
              `<span style="font-size:12px;color:var(--texto-suave)">${metodo}</span>` : ""}</div>
          </div>
        </div>
        ${atrasadoPendente ? `
          <div style="background:rgba(163,59,59,.08);padding:8px;border-radius:8px;margin-top:8px;
                      font-size:13px;color:var(--erro)">⚠️ Ordered past cutoff</div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn" style="flex:1;padding:10px"
              onclick="Pedidos._aprovar('${p.id}', true)">Accept</button>
            <button class="btn btn-perigo" style="flex:1;padding:10px"
              onclick="Pedidos._aprovar('${p.id}', false)">Too late</button>
          </div>` : ""}
        ${(p.status_pagamento === "pago") ? `
          <button class="btn" style="width:100%;margin-top:8px;padding:10px"
            onclick="Pedidos._confirmarPgto('${p.id}')">Confirm payment</button>` : ""}
        ${(p.status_pagamento === "pendente" && !atrasadoPendente) ? `
          <div style="font-size:12px;color:var(--texto-suave);margin-top:8px">
            Waiting for customer payment</div>` : ""}
      </div>`;
  },

  _statusLabel(p) {
    if (p.status_pagamento === "confirmado")
      return `<span style="font-size:12px;color:var(--sucesso);font-weight:600">✓ Confirmed</span>`;
    if (p.status_pagamento === "pago")
      return `<span style="font-size:12px;color:var(--alerta);font-weight:600">Paid — confirm?</span>`;
    return `<span style="font-size:12px;color:var(--erro);font-weight:600">Not paid</span>`;
  },

  /* ===== ACOES ===== */
  async _confirmarPgto(id) {
    const { error } = await sb.from("pedidos")
      .update({ status_pagamento: "confirmado" }).eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    this._carregar();
  },

  async _aprovar(id, aceitar) {
    const update = aceitar
      ? { status_aprovacao: "aceito" }
      : { status_aprovacao: "recusado", cancelado: true };
    const { error } = await sb.from("pedidos").update(update).eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    this._carregar();
  },

  /* ===== helpers ===== */
  _fmtIntervalo(ini, fim) {
    const a = new Date(ini + "T00:00:00"), b = new Date(fim + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (a.getMonth() === b.getMonth())
      return `${m[a.getMonth()]} ${a.getDate()}–${b.getDate()}`;
    return `${m[a.getMonth()]} ${a.getDate()} – ${m[b.getMonth()]} ${b.getDate()}`;
  },
  _fmtTel(t) {
    const s = String(t || "").replace(/\D/g, "");
    if (s.length === 10) return `(${s.slice(0,3)}) ${s.slice(3,6)}-${s.slice(6)}`;
    return t || "";
  },
  _nomeMarmita(p) {
    return (p.pedido_itens && p.pedido_itens[0] && p.pedido_itens[0].menu_itens)
      ? p.pedido_itens[0].menu_itens.nome : "Meal";
  },
  _amanhaIso() {
    const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const d = new Date(s); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  },
  _fmtData(iso) {
    const d = new Date(iso + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dias = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return `${dias[d.getDay()]}, ${m[d.getMonth()]} ${d.getDate()}`;
  },
  _aviso(txt) {
    return '<div class="card" style="text-align:center;color:var(--texto-suave)">' + txt + '</div>';
  },
  _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  }
};
