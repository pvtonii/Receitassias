/* ============================================
   APP CLIENTE - SETOR: Order (Pedido)
   Cliente ve a semana, escolhe dias, ve o total e paga.
   Regras:
   - Avulso $14 (ou $15 special). Semana cheia (5 dias) = $12/dia,
     MAS special continua $15 sempre.
   - Corte 15:30 do dia anterior (fuso Central/Alabama):
     nao trava, mas marca como "precisa aprovacao" do admin.
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Pedido = {

  _semana: null,      // menu (semana) atual
  _dias: [],          // itens (marmitas) da semana, com flags de prazo
  _sel: new Set(),    // ids de menu_itens selecionados

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">Order</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Pick the days you want.</p>
      <div id="ord-conteudo">Loading...</div>`;

    await this._carregar();
  },

  async _carregar() {
    const el = document.getElementById("ord-conteudo");
    this._sel = new Set();

    // pega a semana mais proxima (que ainda tem dias no futuro)
    const hojeIso = this._hojeCentralIso();
    const { data: menus, error } = await sb.from("menus")
      .select("*").gte("semana_fim", hojeIso)
      .order("semana_inicio", { ascending: true }).limit(1);

    if (error) { el.innerHTML = this._aviso("Error: " + error.message); return; }
    if (!menus || !menus.length) {
      el.innerHTML = this._aviso("No menu available yet. Check back soon!");
      return;
    }
    this._semana = menus[0];

    const { data: itens } = await sb.from("menu_itens")
      .select("*").eq("menu_id", this._semana.id).order("dia", { ascending: true });

    // anexa info de ingredientes e de prazo a cada dia
    this._dias = [];
    for (const it of (itens || [])) {
      const { data: links } = await sb.from("menu_item_ingredientes")
        .select("ingredientes(nome)").eq("menu_item_id", it.id);
      it._ings = (links || []).map(l => l.ingredientes && l.ingredientes.nome).filter(Boolean);
      it._atrasado = this._passouCorte(it.dia);
      this._dias.push(it);
    }

    this._desenhar();
  },

  _desenhar() {
    const el = document.getElementById("ord-conteudo");
    const m = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

    el.innerHTML = `
      <div style="font-weight:600;margin-bottom:12px">
        ${this._intervalo(this._semana.semana_inicio, this._semana.semana_fim)}</div>
      ${this._dias.map(d => this._cardDia(d, m)).join("")}
      <div id="ord-resumo" class="card" style="position:sticky;bottom:84px;
           border:2px solid var(--primaria)"></div>`;

    this._atualizarResumo();
  },

  _cardDia(d, m) {
    const dt = new Date(d.dia + "T00:00:00");
    const nomeDia = m[(dt.getDay() + 6) % 7]; // getDay: 0=Dom -> ajusta p/ Mon=0
    const sel = this._sel.has(d.id);
    return `
      <div class="card" style="margin-bottom:10px;
           ${sel ? "border:2px solid var(--primaria)" : ""}"
           onclick="Pedido._toggle('${d.id}')">
        <div style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" ${sel ? "checked" : ""} class="dia-chk"
                 style="width:22px;height:22px;pointer-events:none">
          <div style="flex:1">
            <div style="font-weight:600">${nomeDia} · ${this._diaMes(dt)}
              ${d.especial ? '<span class="badge-especial" style="margin-left:6px">SPECIAL</span>' : ""}
            </div>
            <div style="font-size:14px">${this._esc(d.nome)}</div>
            ${d._ings.length ? `<div style="color:var(--texto-suave);font-size:12px;margin-top:2px">
              ${d._ings.map(x => this._esc(x)).join(", ")}</div>` : ""}
            ${d._atrasado ? `<div style="color:var(--erro);font-size:12px;margin-top:4px">
              ⚠️ Past cutoff — needs confirmation</div>` : ""}
          </div>
          <div style="font-weight:700">$${Number(d.preco).toFixed(0)}</div>
        </div>
      </div>`;
  },

  _toggle(id) {
    if (this._sel.has(id)) this._sel.delete(id); else this._sel.add(id);
    this._desenhar();
  },

  /* Calcula o total aplicando a regra do desconto de semana */
  _calcular() {
    const escolhidos = this._dias.filter(d => this._sel.has(d.id));
    const semanaCheia = escolhidos.length === REGRAS.DIAS_SEMANA
      && this._dias.length === REGRAS.DIAS_SEMANA;

    let total = 0;
    for (const d of escolhidos) {
      if (d.especial) {
        total += REGRAS.PRECO_ESPECIAL;            // special sempre $15
      } else if (semanaCheia) {
        total += REGRAS.PRECO_SEMANA;              // $12 na semana cheia
      } else {
        total += REGRAS.PRECO_AVULSO;              // $14 avulso
      }
    }
    return { escolhidos, semanaCheia, total };
  },

  _atualizarResumo() {
    const box = document.getElementById("ord-resumo");
    const { escolhidos, semanaCheia, total } = this._calcular();
    if (!escolhidos.length) {
      box.innerHTML = `<div style="text-align:center;color:var(--texto-suave)">
        Select at least one day</div>`;
      return;
    }
    const temAtrasado = escolhidos.some(d => d._atrasado);
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;font-size:18px">$${total.toFixed(0)}</div>
          <div style="font-size:12px;color:var(--texto-suave)">
            ${escolhidos.length} day(s)${semanaCheia ? " · full week price 🎉" : ""}</div>
        </div>
        <button class="btn" onclick="Pedido._confirmar()">Continue</button>
      </div>
      ${temAtrasado ? `<div style="color:var(--erro);font-size:12px;margin-top:8px">
        Some days are past the cutoff and need confirmation.</div>` : ""}`;
  },

  async _confirmar() {
    const { escolhidos, total } = this._calcular();
    if (!escolhidos.length) return;
    const temAtrasado = escolhidos.some(d => d._atrasado);

    const container = document.getElementById("app");
    const pix = REGRAS.PAGAMENTO;
    container.innerHTML = `
      <button class="btn-secundario" style="margin-bottom:14px"
              onclick="Pedido.render(document.getElementById('app'))">← Back</button>
      <h2 style="margin-bottom:8px">Payment</h2>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px">
          <span>Total</span><span>$${total.toFixed(0)}</span></div>
        <div style="font-size:13px;color:var(--texto-suave);margin-top:4px">
          ${escolhidos.length} meal(s)</div>
      </div>

      <p style="font-size:14px;margin-bottom:8px">Pay with one of these, then tap "I paid":</p>
      <div class="card" style="margin-bottom:16px;line-height:2">
        <div><strong>CashApp:</strong> ${this._esc(pix.cashapp)}</div>
        <div><strong>Venmo:</strong> ${this._esc(pix.venmo)}</div>
        <div><strong>Zelle:</strong> ${this._esc(pix.zelle)}</div>
        <div><strong>Apple Cash:</strong> ${this._esc(pix.applecash)}</div>
      </div>

      ${temAtrasado ? `<div class="card" style="border-color:var(--erro);color:var(--erro);
        font-size:13px;margin-bottom:16px">⚠️ Your order includes days past the usual cutoff.
        We'll confirm if we can still make them.</div>` : ""}

      <div class="erro-msg" id="pay-erro"></div>
      <button class="btn" id="btn-paguei" style="width:100%">I paid — place order</button>`;

    document.getElementById("btn-paguei")
      .addEventListener("click", () => this._salvarPedido(escolhidos, total, temAtrasado));
  },

  async _salvarPedido(escolhidos, total, temAtrasado) {
    const erro = document.getElementById("pay-erro");
    const btn = document.getElementById("btn-paguei");
    btn.disabled = true; erro.textContent = "";

    const cliente = Auth._cliente;
    if (!cliente) { erro.textContent = "Session error. Please log in again."; btn.disabled = false; return; }

    // cria um pedido por dia de consumo (facilita a producao por dia)
    let falhou = false;
    for (const d of escolhidos) {
      const { data: ped, error } = await sb.from("pedidos").insert({
        cliente_id: cliente.id,
        dia_consumo: d.dia,
        total: Number(d.especial ? REGRAS.PRECO_ESPECIAL
              : (escolhidos.length === REGRAS.DIAS_SEMANA && this._dias.length === REGRAS.DIAS_SEMANA
                 ? REGRAS.PRECO_SEMANA : REGRAS.PRECO_AVULSO)),
        status_pagamento: "pago",          // cliente marcou que pagou (admin confirma)
        precisa_aprovacao: d._atrasado,
        status_aprovacao: d._atrasado ? "pendente" : null
      }).select().single();

      if (error) { falhou = true; break; }
      await sb.from("pedido_itens").insert({
        pedido_id: ped.id, menu_item_id: d.id, preco: ped.total
      });
    }

    btn.disabled = false;
    if (falhou) { erro.textContent = "Error placing order. Please try again."; return; }

    document.getElementById("app").innerHTML = `
      <div class="card" style="text-align:center;margin-top:40px">
        <div style="font-size:40px">✅</div>
        <h2 style="margin:10px 0">Order placed!</h2>
        <p style="color:var(--texto-suave)">
          ${temAtrasado ? "Some days need our confirmation — we'll let you know."
                        : "Thank you! We'll prepare your meals."}</p>
        <button class="btn" style="margin-top:16px"
                onclick="abrirSetor('dashboard')">Back to home</button>
      </div>`;
  },

  /* --- prazo / fuso Central --- */

  // "agora" no fuso Central (Alabama), como objeto Date comparavel
  _agoraCentral() {
    const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    return new Date(s);
  },
  _hojeCentralIso() {
    const a = this._agoraCentral();
    return `${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,"0")}-${String(a.getDate()).padStart(2,"0")}`;
  },
  // passou do corte (15:30 do dia anterior ao consumo)?
  _passouCorte(diaIso) {
    const limite = new Date(diaIso + "T00:00:00");
    limite.setDate(limite.getDate() - 1);
    limite.setHours(REGRAS.HORA_CORTE, REGRAS.MIN_CORTE, 0, 0);
    return this._agoraCentral() > limite;
  },

  /* --- formato --- */
  _intervalo(ini, fim) {
    const a = new Date(ini+"T00:00:00"), b = new Date(fim+"T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (a.getMonth()===b.getMonth()) return `${m[a.getMonth()]} ${a.getDate()}-${b.getDate()}`;
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
