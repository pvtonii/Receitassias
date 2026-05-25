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
      <div id="dash-tops" style="margin-top:20px"></div>`;

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
    // agrupa por cliente
    const porCliente = {};
    for (const p of naoPagos) {
      const nome = p.clientes ? p.clientes.nome : "Customer";
      porCliente[nome] = (porCliente[nome] || 0) + Number(p.total);
    }
    el.innerHTML = `
      <div class="card">
        <div style="font-weight:700;margin-bottom:8px;color:var(--erro)">Pending payment</div>
        ${Object.keys(porCliente).map(n => `
          <div style="display:flex;justify-content:space-between;padding:5px 0;
                      border-bottom:1px solid var(--borda)">
            <span>${this._esc(n)}</span><strong>$${porCliente[n].toFixed(0)}</strong>
          </div>`).join("")}
      </div>`;
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
