/* ============================================
   APP ADMIN - SETOR: Dashboard
   - Periodo navegavel: Semana (dom-sab) | Mes | Ano, com setas pra passado
   - $ confirmado (recebido) + $ a receber
   - Qtde de marmitas no periodo
   - Quem falta pagar
   - Top 5 marmitas (ever) + Top 5 clientes (ever)
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Dashboard = {

  _modo: "semana",     // semana | mes | ano
  _ref: null,          // data de referencia (navega no tempo)
  _pedidos: [],

  async render(container) {
    if (!this._ref) this._ref = this._hojeCentral();
    container.innerHTML = `
      <h2 style="margin-bottom:12px">Dashboard</h2>
      <div id="dash-periodo" style="margin-bottom:16px"></div>
      <div id="dash-numeros">Loading...</div>
      <div id="dash-falta" style="margin-top:8px"></div>
      <div id="dash-tops" style="margin-top:20px"></div>
      <div id="dash-cupons" style="margin-top:20px"></div>`;

    await this._carregar();
  },

  async _carregar() {
    const { data, error } = await sb.from("pedidos")
      .select("*, clientes(nome), pedido_itens(menu_itens(nome))");
    if (error) {
      document.getElementById("dash-numeros").innerHTML = this._aviso("Error: " + error.message);
      return;
    }
    this._pedidos = (data || []).filter(p => !p.cancelado);

    this._desenharPeriodo();
    this._desenharNumeros();
    this._desenharFaltaPagar();
    this._desenharTops();
    this._desenharCupons();
  },

  /* ===== seletor de periodo + navegacao ===== */
  _desenharPeriodo() {
    const el = document.getElementById("dash-periodo");
    const { ini, fim } = this._intervalo();
    el.innerHTML = `
      <div style="display:flex;gap:6px;margin-bottom:10px">
        ${["semana","mes","ano"].map(m => `
          <button class="${this._modo===m?'btn':'btn-secundario'}" style="flex:1;padding:10px"
            onclick="Dashboard._setModo('${m}')">
            ${m==="semana"?"Week":m==="mes"?"Month":"Year"}</button>`).join("")}
      </div>
      <div style="display:flex;align-items:center;gap:10px;justify-content:center">
        <button class="btn-icone" onclick="Dashboard._nav(-1)" title="Previous">&#8249;</button>
        <strong style="text-align:center;flex:1">${this._rotuloPeriodo(ini, fim)}</strong>
        <button class="btn-icone" onclick="Dashboard._nav(1)" title="Next">&#8250;</button>
      </div>`;
  },

  _setModo(m) { this._modo = m; this._ref = this._hojeCentral(); this._carregar(); },
  _nav(dir) {
    const r = new Date(this._ref);
    if (this._modo === "semana") r.setDate(r.getDate() + dir*7);
    else if (this._modo === "mes") r.setMonth(r.getMonth() + dir);
    else r.setFullYear(r.getFullYear() + dir);
    this._ref = r;
    this._carregar();
  },

  /* ===== numeros do periodo ($ e marmitas) ===== */
  _desenharNumeros() {
    const el = document.getElementById("dash-numeros");
    const { iniIso, fimIso } = this._intervaloIso();
    const noPeriodo = this._pedidos.filter(p => p.dia_consumo >= iniIso && p.dia_consumo <= fimIso);

    let confirmado = 0, aReceber = 0, qtde = 0;
    for (const p of noPeriodo) {
      const v = Number(p.total);
      qtde += (p.pedido_itens ? p.pedido_itens.length : 1);
      if (p.status_pagamento === "confirmado") confirmado += v;
      else aReceber += v;  // pago (nao confirmado) ou pendente
    }

    el.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:10px">
        <div class="card" style="flex:1;text-align:center">
          <div style="font-size:12px;color:var(--texto-suave);text-transform:uppercase">Received</div>
          <div style="font-size:24px;font-weight:700;color:var(--sucesso)">$${confirmado.toFixed(0)}</div>
        </div>
        <div class="card" style="flex:1;text-align:center">
          <div style="font-size:12px;color:var(--texto-suave);text-transform:uppercase">To receive</div>
          <div style="font-size:24px;font-weight:700;color:var(--alerta)">$${aReceber.toFixed(0)}</div>
        </div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:12px;color:var(--texto-suave);text-transform:uppercase">Meals ordered</div>
        <div style="font-size:24px;font-weight:700">${qtde}</div>
      </div>`;
  },

  /* ===== quem falta pagar (no periodo) ===== */
  _desenharFaltaPagar() {
    const el = document.getElementById("dash-falta");
    const { iniIso, fimIso } = this._intervaloIso();
    const naoPagos = this._pedidos.filter(p =>
      p.dia_consumo >= iniIso && p.dia_consumo <= fimIso &&
      p.status_pagamento !== "confirmado");

    if (!naoPagos.length) {
      el.innerHTML = `<div class="card" style="text-align:center;color:var(--sucesso)">
        ✓ Everyone paid for this period</div>`;
      return;
    }
    // agrupa por cliente mantendo ids e status
    const porCliente = {};
    for (const p of naoPagos) {
      const nome = p.clientes ? p.clientes.nome : (p.nome_avulso || "Walk-in");
      if (!porCliente[nome]) porCliente[nome] = { total: 0, idsPago: [], idsPendente: [] };
      porCliente[nome].total += Number(p.total);
      if (p.status_pagamento === "pago") porCliente[nome].idsPago.push(p.id);
      else porCliente[nome].idsPendente.push(p.id);
    }
    el.innerHTML = `
      <div class="card">
        <div style="font-weight:700;margin-bottom:8px;color:var(--erro)">Pending payment</div>
        ${Object.entries(porCliente).map(([n, v]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;
                      padding:8px 0;border-bottom:1px solid var(--borda);gap:8px">
            <span style="flex:1">${this._esc(n)}</span>
            <strong>$${v.total.toFixed(0)}</strong>
            <button class="btn" style="padding:6px 12px;font-size:13px"
              onclick="Dashboard._confirmarPgto([${[...v.idsPago, ...v.idsPendente].map(id => `'${id}'`).join(",")}])">
              Confirm</button>
          </div>`).join("")}
      </div>`;
  },

  async _confirmarPgto(ids) {
    const { error } = await sb.from("pedidos")
      .update({ status_pagamento: "confirmado" }).in("id", ids);
    if (error) { alert("Error: " + error.message); return; }
    this._carregar();
  },

  /* ===== Top 5 marmitas + Top 5 clientes (EVER) ===== */
  _desenharTops() {
    const el = document.getElementById("dash-tops");

    // Top marmitas: conta aparicoes em pedido_itens (todos os pedidos nao cancelados)
    const marm = {};
    for (const p of this._pedidos) {
      for (const it of (p.pedido_itens || [])) {
        const nome = it.menu_itens ? it.menu_itens.nome : null;
        if (nome) marm[nome] = (marm[nome] || 0) + 1;
      }
    }
    const topMarm = Object.entries(marm).sort((a,b) => b[1]-a[1]).slice(0,5);

    // Top clientes: conta marmitas por cliente
    const cli = {};
    for (const p of this._pedidos) {
      const nome = p.clientes ? p.clientes.nome : null;
      if (nome) cli[nome] = (cli[nome] || 0) + (p.pedido_itens ? p.pedido_itens.length : 1);
    }
    const topCli = Object.entries(cli).sort((a,b) => b[1]-a[1]).slice(0,5);

    el.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div style="font-weight:700;margin-bottom:8px">🏆 Top 5 meals (all time)</div>
        ${topMarm.length ? topMarm.map((m,i) => `
          <div style="display:flex;justify-content:space-between;padding:5px 0;
                      border-bottom:1px solid var(--borda)">
            <span>${i+1}. ${this._esc(m[0])}</span><strong>${m[1]}×</strong></div>`).join("")
          : '<div style="color:var(--texto-suave)">No data yet</div>'}
      </div>
      <div class="card">
        <div style="font-weight:700;margin-bottom:8px">⭐ Top 5 customers (all time)</div>
        ${topCli.length ? topCli.map((c,i) => `
          <div style="display:flex;justify-content:space-between;padding:5px 0;
                      border-bottom:1px solid var(--borda)">
            <span>${i+1}. ${this._esc(c[0])}</span><strong>${c[1]} meals</strong></div>`).join("")
          : '<div style="color:var(--texto-suave)">No data yet</div>'}
      </div>`;
  },

  /* ===== Coupons ===== */
  async _desenharCupons() {
    const el = document.getElementById("dash-cupons");
    const { data } = await sb.from("cupons").select("*").order("criado_em", { ascending: false });
    const lista = data || [];
    el.innerHTML = `
      <div class="card">
        <div style="font-weight:700;margin-bottom:12px">🎟 Coupons</div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input class="campo" id="dc-codigo" placeholder="Code"
                 style="margin:0;flex:1;text-transform:uppercase"
                 oninput="this.value=this.value.toUpperCase()">
          <input class="campo" id="dc-pct" type="number" min="1" max="100"
                 placeholder="%" style="margin:0;width:64px">
          <button class="btn" style="padding:10px 14px;flex-shrink:0"
                  onclick="Dashboard._cupomCriar()">Add</button>
        </div>
        <div class="erro-msg" id="dc-erro" style="margin-bottom:4px"></div>
        ${lista.length ? lista.map(c => `
          <div style="display:flex;align-items:center;justify-content:space-between;
                      padding:8px 0;border-bottom:1px solid var(--borda)">
            <div>
              <span style="font-weight:700">${this._esc(c.codigo)}</span>
              <span style="font-size:13px;color:var(--texto-suave);margin-left:8px">${c.desconto_pct}% off</span>
            </div>
            <button class="btn btn-perigo" style="padding:6px 12px;font-size:13px"
              onclick="Dashboard._cupomDeletar('${c.id}','${this._esc(c.codigo)}')">Delete</button>
          </div>`).join("")
        : `<div style="font-size:13px;color:var(--texto-suave)">No active coupons.</div>`}
      </div>`;
  },

  async _cupomCriar() {
    const codigoEl = document.getElementById("dc-codigo");
    const pctEl    = document.getElementById("dc-pct");
    const erro     = document.getElementById("dc-erro");
    const codigo   = codigoEl.value.trim().toUpperCase();
    const pct      = parseInt(pctEl.value);
    erro.textContent = "";
    if (!codigo) { erro.textContent = "Enter a code."; return; }
    if (!pct || pct < 1 || pct > 100) { erro.textContent = "Enter % between 1–100."; return; }
    const { error } = await sb.from("cupons").insert({ codigo, desconto_pct: pct });
    if (error) { erro.textContent = error.message.includes("unique") ? "Code already exists." : error.message; return; }
    codigoEl.value = ""; pctEl.value = "";
    this._desenharCupons();
  },

  async _cupomDeletar(id, codigo) {
    if (!confirm(`Delete coupon "${codigo}"?`)) return;
    const { error } = await sb.from("cupons").delete().eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    this._desenharCupons();
  },

  /* ===== periodo (datas) ===== */
  _intervalo() {
    const r = new Date(this._ref);
    if (this._modo === "semana") {
      const ini = new Date(r); ini.setDate(ini.getDate() - ini.getDay()); ini.setHours(0,0,0,0);
      const fim = new Date(ini); fim.setDate(fim.getDate() + 6);
      return { ini, fim };
    }
    if (this._modo === "mes") {
      return { ini: new Date(r.getFullYear(), r.getMonth(), 1),
               fim: new Date(r.getFullYear(), r.getMonth()+1, 0) };
    }
    return { ini: new Date(r.getFullYear(), 0, 1),
             fim: new Date(r.getFullYear(), 11, 31) };
  },
  _intervaloIso() {
    const { ini, fim } = this._intervalo();
    return { iniIso: this._iso(ini), fimIso: this._iso(fim) };
  },
  _rotuloPeriodo(ini, fim) {
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (this._modo === "semana") {
      if (ini.getMonth() === fim.getMonth())
        return `${m[ini.getMonth()]} ${ini.getDate()}-${fim.getDate()}`;
      return `${m[ini.getMonth()]} ${ini.getDate()} - ${m[fim.getMonth()]} ${fim.getDate()}`;
    }
    if (this._modo === "mes") return `${m[ini.getMonth()]} ${ini.getFullYear()}`;
    return `${ini.getFullYear()}`;
  },
  _hojeCentral() {
    const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    return new Date(s);
  },
  _iso(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  },
  _aviso(txt) {
    return '<div class="card" style="text-align:center;color:var(--texto-suave)">' + txt + '</div>';
  },
  _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  }
};
