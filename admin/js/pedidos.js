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
      <div id="ord-prod" style="margin-bottom:20px">Loading...</div>
      <div id="ord-filtros" style="margin-bottom:14px"></div>
      <div id="ord-lista"></div>`;

    await this._carregar();
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
    const cliente = p.clientes ? p.clientes.nome : "Customer";
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
