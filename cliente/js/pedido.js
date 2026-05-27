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

  _semana: null,
  _dias: [],
  _qtd: new Map(),      // dia-iso → quantidade (0 = não selecionado)
  _semanaCheia: false,

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">Order</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Pick the days you want.</p>
      <div id="ord-conteudo">Loading...</div>`;

    await this._carregar();
  },

  /* Pagar VARIOS pedidos de uma vez (a semana toda, vindo da Home) */
  async _pagarVarios(ids, total) {
    const container = document.getElementById("app");
    const pix = REGRAS.PAGAMENTO;
    total = Number(total);

    container.innerHTML = `
      <button class="btn-voltar" onclick="abrirSetor('dashboard')">← Back</button>
      <h2 style="margin-bottom:8px">Payment</h2>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px">
          <span>Total</span><span>$${total.toFixed(0)}</span></div>
        <div style="font-size:13px;color:var(--texto-suave);margin-top:4px">
          ${ids.length} meal(s)</div>
      </div>

      <button class="btn" id="cash-link" style="width:100%;margin-bottom:16px;
              background:var(--sucesso)">Pay $${total.toFixed(0)} with CashApp</button>

      <p style="font-size:14px;margin-bottom:8px">Or pay with:</p>
      <div class="card" style="margin-bottom:16px;padding-top:0">
        ${this._linhaPag("Zelle", pix.zelle, pix.zelle_nome)}
        ${this._linhaPag("Apple Cash", pix.applecash, null, true)}
      </div>

      <p style="font-size:14px;margin-bottom:8px">Which one did you use?</p>
      <div id="metodos" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${["CashApp","Zelle","Apple Cash"].map(mt => `
          <button class="metodo-chip" data-mt="${mt}"
            style="flex:1;min-width:calc(50% - 4px);padding:12px;border-radius:var(--raio-sm);
                   border:2px solid var(--borda);background:#fff;font-weight:600;
                   color:var(--texto);cursor:pointer">${mt}</button>`).join("")}
      </div>

      <div class="erro-msg" id="pay-erro"></div>
      <button class="btn" id="btn-paguei" style="width:100%">I paid</button>`;

    document.getElementById("cash-link").addEventListener("click", () => {
      window.open(`https://cash.app/$${REGRAS.PAGAMENTO.cashapp_tag}/${total.toFixed(0)}`, "_blank");
      this._metodoSel = "CashApp"; this._marcarChip();
    });
    this._metodoSel = null;
    document.querySelectorAll(".metodo-chip").forEach(chip => {
      chip.addEventListener("click", () => { this._metodoSel = chip.dataset.mt; this._marcarChip(); });
    });
    document.getElementById("btn-paguei").addEventListener("click", async () => {
      if (!this._metodoSel) {
        document.getElementById("pay-erro").textContent = "Please select which method you used.";
        return;
      }
      const btn = document.getElementById("btn-paguei");
      btn.disabled = true;
      // marca TODOS os pedidos da semana como pagos
      const { error: e } = await sb.from("pedidos")
        .update({ status_pagamento: "pago", metodo_pagamento: this._metodoSel })
        .in("id", ids);
      btn.disabled = false;
      if (e) { document.getElementById("pay-erro").textContent = "Error: " + e.message; return; }
      this._pushover("Payment received 💰",
        `${Auth._cliente ? Auth._cliente.nome : "Client"} · $${total.toFixed(0)} · via ${this._metodoSel}`);
      abrirSetor("dashboard");
    });
  },

  /* Pagar um pedido JA EXISTENTE (chamado pelo "Pay now" da Home) */
  async _pagarExistente(pedidoId) {
    const container = document.getElementById("app");
    container.innerHTML = `<p style="color:var(--texto-suave)">Loading...</p>`;

    const { data: ped, error } = await sb.from("pedidos")
      .select("*, pedido_itens(menu_itens(nome))").eq("id", pedidoId).single();
    if (error || !ped) { container.innerHTML = this._aviso("Order not found."); return; }

    const nome = (ped.pedido_itens && ped.pedido_itens[0] && ped.pedido_itens[0].menu_itens)
      ? ped.pedido_itens[0].menu_itens.nome : "Meal";
    const pix = REGRAS.PAGAMENTO;
    const total = Number(ped.total);

    container.innerHTML = `
      <button class="btn-voltar" onclick="abrirSetor('dashboard')">← Back</button>
      <h2 style="margin-bottom:8px">Payment</h2>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px">
          <span>Total</span><span>$${total.toFixed(0)}</span></div>
        <div style="font-size:13px;color:var(--texto-suave);margin-top:4px">
          ${this._esc(nome)} · ${this._fmtDataSimples(ped.dia_consumo)}</div>
      </div>

      <button class="btn" id="cash-link" style="width:100%;margin-bottom:16px;
              background:var(--sucesso)">Pay $${total.toFixed(0)} with CashApp</button>

      <p style="font-size:14px;margin-bottom:8px">Or pay with:</p>
      <div class="card" style="margin-bottom:16px;padding-top:0">
        ${this._linhaPag("Zelle", pix.zelle, pix.zelle_nome)}
        ${this._linhaPag("Apple Cash", pix.applecash, null, true)}
      </div>

      <p style="font-size:14px;margin-bottom:8px">Which one did you use?</p>
      <div id="metodos" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${["CashApp","Zelle","Apple Cash"].map(mt => `
          <button class="metodo-chip" data-mt="${mt}"
            style="flex:1;min-width:calc(50% - 4px);padding:12px;border-radius:var(--raio-sm);
                   border:2px solid var(--borda);background:#fff;font-weight:600;
                   color:var(--texto);cursor:pointer">${mt}</button>`).join("")}
      </div>

      <div class="erro-msg" id="pay-erro"></div>
      <button class="btn" id="btn-paguei" style="width:100%">I paid</button>`;

    document.getElementById("cash-link").addEventListener("click", () => {
      window.open(`https://cash.app/$${REGRAS.PAGAMENTO.cashapp_tag}/${total.toFixed(0)}`, "_blank");
      this._metodoSel = "CashApp"; this._marcarChip();
    });
    this._metodoSel = null;
    document.querySelectorAll(".metodo-chip").forEach(chip => {
      chip.addEventListener("click", () => { this._metodoSel = chip.dataset.mt; this._marcarChip(); });
    });
    document.getElementById("btn-paguei").addEventListener("click", async () => {
      if (!this._metodoSel) {
        document.getElementById("pay-erro").textContent = "Please select which method you used.";
        return;
      }
      const btn = document.getElementById("btn-paguei");
      btn.disabled = true;
      const { error: e } = await sb.from("pedidos")
        .update({ status_pagamento: "pago", metodo_pagamento: this._metodoSel })
        .eq("id", pedidoId);
      btn.disabled = false;
      if (e) { document.getElementById("pay-erro").textContent = "Error: " + e.message; return; }
      this._pushover("Payment received 💰",
        `${Auth._cliente ? Auth._cliente.nome : "Client"} · $${total.toFixed(0)} · via ${this._metodoSel}`);
      abrirSetor("dashboard");
    });
  },

  _fmtDataSimples(iso) {
    const d = new Date(iso + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[d.getMonth()]} ${d.getDate()}`;
  },

  async _carregar() {
    const el = document.getElementById("ord-conteudo");
    this._qtd   = new Map();
    this._cupom = null;

    const hojeIso = this._hojeCentralIso();

    // 1) menu header — query leve, sempre fresca
    const { data: menus, error } = await sb.from("menus")
      .select("*").gte("semana_fim", hojeIso)
      .order("semana_inicio", { ascending: true }).limit(1);

    if (error) { el.innerHTML = this._aviso("Error: " + error.message); return; }
    if (!menus || !menus.length) {
      el.innerHTML = this._aviso("No menu available yet. Check back soon!");
      return;
    }
    this._semana = menus[0];

    // 2) dias + ingredientes: tenta cache (6h), senao busca tudo num join so
    const CACHE_KEY = "rt_menu_" + this._semana.id;
    const CACHE_TTL = 6 * 60 * 60 * 1000;
    let diasCache = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (Date.now() - c.ts < CACHE_TTL) diasCache = c.dias;
      }
    } catch (e) {}

    if (diasCache) {
      this._dias = diasCache;
      for (const d of this._dias) {
        d._passado  = this._passouBloqueio(d.dia);
        d._atrasado = !d._passado && this._passouCorte(d.dia);
      }
    } else {
      const { data: itens } = await sb.from("menu_itens")
        .select("*, menu_item_ingredientes(ingredientes(nome))")
        .eq("menu_id", this._semana.id)
        .order("dia", { ascending: true });

      this._dias = [];
      for (const it of (itens || [])) {
        if (it.fechado) continue;
        it._ings = (it.menu_item_ingredientes || [])
          .map(l => l.ingredientes && l.ingredientes.nome).filter(Boolean);
        it._passado  = this._passouBloqueio(it.dia);
        it._atrasado = !it._passado && this._passouCorte(it.dia);
        this._dias.push(it);
      }

      // salva no cache sem os campos calculados de runtime
      try {
        const paraCache = this._dias.map(({ _passado, _atrasado, ...rest }) => rest);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), dias: paraCache }));
        // limpa caches de semanas anteriores
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith("rt_menu_") && k !== CACHE_KEY) localStorage.removeItem(k);
        }
      } catch (e) {}
    }

    // 3) pendentes — sempre fresco (muda com frequencia)
    this._pendentes = [];
    const cliente = Auth._cliente;
    if (cliente) {
      const { data: pendentes } = await sb.from("pedidos")
        .select("id,total,dia_consumo,quantidade")
        .eq("cliente_id", cliente.id)
        .eq("status_pagamento", "pendente")
        .eq("cancelado", false);
      this._pendentes = pendentes || [];
    }

    this._desenhar();
  },

  _desenhar() {
    const el = document.getElementById("ord-conteudo");
    const m = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const { semanaCheia } = this._calcular();
    this._semanaCheia = semanaCheia;

    el.innerHTML = `
      ${this._bannerPendentes()}
      <div style="font-weight:600;margin-bottom:12px">
        ${this._intervalo(this._semana.semana_inicio, this._semana.semana_fim)}</div>
      ${this._dias.map(d => this._cardDia(d, m, semanaCheia)).join("")}
      <div id="ord-resumo" class="card" style="margin-top:8px;margin-bottom:16px;
           border:2px solid var(--primaria)"></div>`;

    this._atualizarResumo();
  },

  /* Aviso (nao bloqueia) de marmitas que o cliente ainda nao marcou como pago */
  _bannerPendentes() {
    const pend = this._pendentes || [];
    if (!pend.length) return "";
    const total = pend.reduce((s, p) => s + Number(p.total), 0);
    const totalMeals = pend.reduce((s, p) => s + (p.quantidade || 1), 0);
    const ids = pend.map(p => p.id).join(",");
    return `
      <div class="card" style="border:2px solid var(--erro);
           background:rgba(217,48,37,.06);margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;color:var(--erro);font-size:14px">
              ⚠️ ${totalMeals} unpaid meal(s) — $${total.toFixed(0)}</div>
            <div style="font-size:12px;color:var(--texto-suave);margin-top:2px">
              Please settle before they pile up.</div>
          </div>
          <button class="btn" style="padding:9px 14px;background:var(--erro);font-size:13px"
            onclick="Pedido._pagarVarios('${ids}'.split(','), ${total})">Pay now</button>
        </div>
      </div>`;
  },

  _cardDia(d, m, semanaCheia) {
    const dt = new Date(d.dia + "T00:00:00");
    const nomeDia = m[(dt.getDay() + 6) % 7];
    const qty = this._qtd.get(d.dia) || 0;

    if (d._passado) {
      return `
        <div class="card" style="margin-bottom:10px;opacity:0.38;cursor:not-allowed;
             pointer-events:none">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1">
              <div style="font-weight:600">${nomeDia} · ${this._diaMes(dt)}
                ${d.especial ? '<span class="badge-especial" style="margin-left:6px">SPECIAL</span>' : ""}
              </div>
              <div style="font-size:14px">${this._esc(d.nome)}</div>
              ${d._ings.length ? `<div style="color:var(--texto-suave);font-size:12px;margin-top:2px">
                ${d._ings.map(x => this._esc(x)).join(", ")}</div>` : ""}
              <div style="font-size:12px;margin-top:4px;color:var(--texto-suave)">
                Not available</div>
            </div>
          </div>
        </div>`;
    }

    return `
      <div class="card" id="card-${d.dia}" style="margin-bottom:10px;
           transition:border .15s;
           ${qty > 0 ? "border:2px solid var(--primaria)" : ""}">
        <div style="display:flex;align-items:center;gap:8px">
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
          <div id="stepper-${d.dia}" style="flex-shrink:0">
            ${this._stepperHTML(d, semanaCheia)}
          </div>
        </div>
      </div>`;
  },

  _stepperHTML(d, semanaCheia) {
    const qty = this._qtd.get(d.dia) || 0;
    const unit = d.especial ? REGRAS.PRECO_ESPECIAL
                 : semanaCheia ? REGRAS.PRECO_SEMANA
                 : REGRAS.PRECO_AVULSO;

    let precoHTML;
    if (qty === 0) {
      precoHTML = `<div style="font-size:12px;color:var(--texto-suave);text-align:center;margin-top:4px">
        $${d.especial ? REGRAS.PRECO_ESPECIAL : REGRAS.PRECO_AVULSO}/meal</div>`;
    } else if (!d.especial && semanaCheia) {
      precoHTML = `<div style="text-align:center;margin-top:4px;line-height:1.4">
        <span style="text-decoration:line-through;color:var(--texto-suave);font-size:12px">
          $${qty * REGRAS.PRECO_AVULSO}</span>
        <span style="color:var(--sucesso);font-weight:700;font-size:14px;display:block">
          $${qty * REGRAS.PRECO_SEMANA}</span>
      </div>`;
    } else {
      precoHTML = `<div style="text-align:center;font-weight:700;font-size:14px;margin-top:4px">
        $${qty * unit}</div>`;
    }

    const btnBase = "width:32px;height:32px;border-radius:50%;font-size:16px;font-weight:700;" +
                    "cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center";
    const btnMenos = qty === 0
      ? `${btnBase};border:2px solid var(--borda);background:#fff;color:var(--texto-suave);opacity:0.5`
      : `${btnBase};border:2px solid var(--primaria);background:#fff;color:var(--primaria)`;
    const btnMais = qty >= 3
      ? `${btnBase};border:2px solid var(--borda);background:#f5f5f5;color:var(--texto-suave);opacity:0.5`
      : `${btnBase};border:2px solid var(--primaria);background:var(--primaria);color:#fff`;

    return `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="display:flex;align-items:center;gap:6px">
          <button onclick="event.stopPropagation();Pedido._setQtd('${d.dia}',-1)"
                  ${qty === 0 ? "disabled" : ""}
                  style="${btnMenos}">−</button>
          <span style="min-width:20px;text-align:center;font-weight:700;font-size:18px">${qty}</span>
          <button onclick="event.stopPropagation();Pedido._setQtd('${d.dia}',+1)"
                  ${qty >= 3 ? "disabled" : ""}
                  style="${btnMais}">+</button>
        </div>
        ${precoHTML}
      </div>`;
  },

  _setQtd(iso, delta) {
    const atual = this._qtd.get(iso) || 0;
    const novo = Math.max(0, Math.min(3, atual + delta));
    if (novo === atual) return;
    this._qtd.set(iso, novo);

    const prevSemanaCheia = this._semanaCheia;
    const { semanaCheia } = this._calcular();
    this._semanaCheia = semanaCheia;

    if (semanaCheia !== prevSemanaCheia) {
      // semana cheia mudou: atualiza todos os steppers
      for (const d of this._dias) {
        const el = document.getElementById("stepper-" + d.dia);
        if (el) el.innerHTML = this._stepperHTML(d, semanaCheia);
        const card = document.getElementById("card-" + d.dia);
        if (card) {
          const q = this._qtd.get(d.dia) || 0;
          card.style.border = q > 0 ? "2px solid var(--primaria)" : "";
        }
      }
    } else {
      // atualiza apenas o card alterado
      const d = this._dias.find(x => x.dia === iso);
      if (d) {
        const el = document.getElementById("stepper-" + iso);
        if (el) el.innerHTML = this._stepperHTML(d, semanaCheia);
        const card = document.getElementById("card-" + iso);
        if (card) {
          card.style.border = novo > 0 ? "2px solid var(--primaria)" : "";
        }
      }
    }

    this._atualizarResumo();
  },

  _calcular() {
    const escolhidos = this._dias.filter(d => (this._qtd.get(d.dia) || 0) > 0);
    const semanaCheia = this._dias.length > 0
      && this._dias.every(d => (this._qtd.get(d.dia) || 0) > 0);

    let totalOriginal = 0;
    for (const d of escolhidos) {
      const qty = this._qtd.get(d.dia) || 1;
      if (d.especial)       totalOriginal += qty * REGRAS.PRECO_ESPECIAL;
      else if (semanaCheia) totalOriginal += qty * REGRAS.PRECO_SEMANA;
      else                  totalOriginal += qty * REGRAS.PRECO_AVULSO;
    }
    const desconto = this._cupom
      ? Math.round(totalOriginal * this._cupom.desconto_pct / 100) : 0;
    const total = totalOriginal - desconto;
    return { escolhidos, semanaCheia, total, totalOriginal, desconto };
  },

  _atualizarResumo() {
    const box = document.getElementById("ord-resumo");
    const { escolhidos, semanaCheia, total, totalOriginal, desconto } = this._calcular();
    if (!escolhidos.length) {
      box.innerHTML = `<div style="text-align:center;color:var(--texto-suave)">
        Select at least one day</div>`;
      return;
    }
    const totalMeals = escolhidos.reduce((s, d) => s + (this._qtd.get(d.dia) || 1), 0);
    const temAtrasado = escolhidos.some(d => d._atrasado);
    let economiaFull = 0;
    if (semanaCheia) {
      const avulso = escolhidos.reduce((s, d) => {
        const qty = this._qtd.get(d.dia) || 1;
        return s + qty * (d.especial ? REGRAS.PRECO_ESPECIAL : REGRAS.PRECO_AVULSO);
      }, 0);
      economiaFull = avulso - totalOriginal;
    }
    const totalEconomia = economiaFull + desconto;

    const precoHtml = desconto > 0
      ? `<span style="text-decoration:line-through;color:var(--texto-suave);
                      font-size:14px;margin-right:6px">$${totalOriginal.toFixed(0)}</span>
         <span style="font-weight:700;font-size:18px;color:var(--sucesso)">$${total.toFixed(0)}</span>`
      : `<span style="font-weight:700;font-size:18px">$${total.toFixed(0)}</span>`;

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div>${precoHtml}</div>
          <div style="font-size:12px;color:var(--texto-suave)">
            ${totalMeals} meal${totalMeals !== 1 ? "s" : ""} · ${escolhidos.length} day${escolhidos.length !== 1 ? "s" : ""}${semanaCheia ? " · full week 🎉" : ""}</div>
          ${totalEconomia > 0 ? `<div style="font-size:12px;color:var(--sucesso);font-weight:600">
            You save $${totalEconomia}!</div>` : ""}
          ${desconto > 0 ? `<div style="font-size:12px;color:var(--sucesso)">
            🎟 ${this._cupom.desconto_pct}% off · ${this._esc(this._cupom.codigo)}</div>` : ""}
        </div>
        <button class="btn" onclick="Pedido._confirmar()">Continue</button>
      </div>
      ${temAtrasado ? `<div style="color:var(--erro);font-size:12px;margin-top:8px">
        Some days are past the cutoff and need confirmation.</div>` : ""}
      <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
        <input class="campo" id="cupom-input" placeholder="Coupon code"
               style="margin:0;flex:1;text-transform:uppercase"
               value="${this._cupom ? this._esc(this._cupom.codigo) : ''}">
        <button class="btn-secundario" style="padding:10px 14px;flex-shrink:0"
                onclick="Pedido._aplicarCupom()">Apply</button>
      </div>
      <div id="cupom-msg" style="font-size:12px;margin-top:4px;min-height:16px"></div>`;
  },

  async _aplicarCupom() {
    const input = document.getElementById("cupom-input");
    const msg   = document.getElementById("cupom-msg");
    const codigo = (input ? input.value.trim().toUpperCase() : "");

    if (!codigo) {
      this._cupom = null;
      this._atualizarResumo();
      return;
    }

    if (msg) msg.innerHTML = '<span style="color:var(--texto-suave)">Checking...</span>';

    const { data } = await sb.from("cupons")
      .select("codigo, desconto_pct").eq("codigo", codigo).eq("ativo", true).maybeSingle();

    if (!data) {
      this._cupom = null;
      if (msg) msg.innerHTML = '<span style="color:var(--erro)">Invalid or expired coupon.</span>';
      return;
    }

    this._cupom = data;
    this._atualizarResumo();
  },

  async _confirmar() {
    const { escolhidos, total, totalOriginal, desconto } = this._calcular();
    if (!escolhidos.length) return;
    const temAtrasado = escolhidos.some(d => d._atrasado);

    const container = document.getElementById("app");
    const pix = REGRAS.PAGAMENTO;
    container.innerHTML = `
      <button class="btn-voltar"
              onclick="Pedido.render(document.getElementById('app'))">← Back</button>
      <h2 style="margin-bottom:8px">Payment</h2>
      <div class="card" style="margin-bottom:16px">
        ${desconto > 0 ? `
          <div style="display:flex;justify-content:space-between;font-size:14px;
                      color:var(--texto-suave);margin-bottom:4px">
            <span>Subtotal</span>
            <span style="text-decoration:line-through">$${totalOriginal.toFixed(0)}</span></div>
          <div style="font-size:13px;color:var(--sucesso);margin-bottom:6px">
            🎟 ${this._cupom.desconto_pct}% off · ${this._esc(this._cupom.codigo)}</div>` : ""}
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px">
          <span>Total</span><span>$${total.toFixed(0)}</span></div>
        <div style="font-size:13px;color:var(--texto-suave);margin-top:4px">
          ${escolhidos.reduce((s,d) => s + (this._qtd.get(d.dia)||1), 0)} meal(s)</div>
      </div>

      <button class="btn" id="cash-link" style="width:100%;margin-bottom:16px;
              background:var(--sucesso)">
        Pay $${total.toFixed(0)} with CashApp</button>

      <p style="font-size:14px;margin-bottom:8px">Or pay with:</p>
      <div class="card" style="margin-bottom:16px;padding-top:0">
        ${this._linhaPag("Zelle", pix.zelle, pix.zelle_nome)}
        ${this._linhaPag("Apple Cash", pix.applecash, null, true)}
      </div>

      ${temAtrasado ? `<div class="card" style="border-color:var(--erro);color:var(--erro);
        font-size:13px;margin-bottom:16px">⚠️ Your order includes days past the usual cutoff.
        We'll confirm if we can still make them.</div>` : ""}

      <p style="font-size:14px;margin-bottom:8px">Which one did you use?</p>
      <div id="metodos" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${["CashApp","Zelle","Apple Cash"].map(mt => `
          <button class="metodo-chip" data-mt="${mt}"
            style="flex:1;min-width:calc(50% - 4px);padding:12px;border-radius:var(--raio-sm);
                   border:2px solid var(--borda);background:#fff;font-weight:600;
                   color:var(--texto);cursor:pointer">${mt}</button>`).join("")}
      </div>

      <div class="erro-msg" id="pay-erro"></div>
      <button class="btn" id="btn-paguei" style="width:100%;margin-bottom:10px">
        I paid — place order</button>
      <button class="btn-secundario" id="btn-depois" style="width:100%">
        I'll pay later — place order</button>`;

    // botao CashApp com link e valor (cash.app/$tag/valor)
    document.getElementById("cash-link").addEventListener("click", () => {
      const tag = REGRAS.PAGAMENTO.cashapp_tag;
      window.open(`https://cash.app/$${tag}/${total.toFixed(0)}`, "_blank");
      this._metodoSel = "CashApp";
      this._marcarChip();
    });

    // chips de metodo (selecao unica)
    this._metodoSel = null;
    document.querySelectorAll(".metodo-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        this._metodoSel = chip.dataset.mt;
        this._marcarChip();
      });
    });

    document.getElementById("btn-paguei")
      .addEventListener("click", () => {
        if (!this._metodoSel) {
          document.getElementById("pay-erro").textContent =
            "Please select which method you used.";
          return;
        }
        this._salvarPedido(escolhidos, total, temAtrasado, "pago", this._metodoSel);
      });
    document.getElementById("btn-depois")
      .addEventListener("click", () =>
        this._salvarPedido(escolhidos, total, temAtrasado, "pendente", null));
  },

  _pushover(title, message) {
    try {
      fetch("https://api.pushover.net/1/messages.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: REGRAS.PUSHOVER_TOKEN, user: REGRAS.PUSHOVER_USER,
          title, message, priority: 1
        })
      });
    } catch(e) {}
  },

  _linhaPag(nome, valor, subtexto, ultimo = false) {
    const valLimpo = this._esc(valor).replace(/'/g, "");
    return `
      <div style="padding:8px 0${ultimo ? " 0" : ";border-bottom:1px solid var(--borda)"}">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1"><strong>${nome}:</strong> ${this._esc(valor)}</div>
          <button class="btn-icone copy-btn" title="Copy"
            onclick="Pedido._copiar('${valLimpo}', this)">&#128203;</button>
        </div>
        ${subtexto ? `<div style="font-size:13px;color:var(--texto-suave);margin-top:2px">
          ${this._esc(subtexto)}</div>` : ""}
      </div>`;
  },

  _copiar(txt, botao) {
    if (navigator.clipboard) navigator.clipboard.writeText(txt);
    // confirmacao visual: troca o icone por um "check" por 1.2s
    if (botao) {
      const original = botao.innerHTML;
      botao.innerHTML = "&#10003;";          // check
      botao.style.color = "var(--sucesso)";
      setTimeout(() => {
        botao.innerHTML = original;
        botao.style.color = "";
      }, 1200);
    }
  },

  _marcarChip() {
    document.querySelectorAll(".metodo-chip").forEach(c => {
      const ativo = c.dataset.mt === this._metodoSel;
      c.style.borderColor = ativo ? "var(--primaria)" : "var(--borda)";
      c.style.background = ativo ? "rgba(172,120,56,.10)" : "#fff";
      c.style.color = ativo ? "var(--primaria)" : "var(--texto)";
    });
  },

  async _salvarPedido(escolhidos, total, temAtrasado, statusPag, metodo) {
    const erro = document.getElementById("pay-erro");
    const btn = document.getElementById("btn-paguei");
    const btn2 = document.getElementById("btn-depois");
    btn.disabled = true; if (btn2) btn2.disabled = true; erro.textContent = "";

    const cliente = Auth._cliente;
    if (!cliente) { erro.textContent = "Session error. Please log in again."; btn.disabled = false; if (btn2) btn2.disabled = false; return; }

    const { semanaCheia } = this._calcular();
    const cupom_codigo = this._cupom ? this._cupom.codigo : null;
    const desconto_pct = this._cupom ? this._cupom.desconto_pct : null;
    let falhou = false;
    for (const d of escolhidos) {
      const qty = this._qtd.get(d.dia) || 1;
      const unit = d.especial ? REGRAS.PRECO_ESPECIAL
                   : semanaCheia ? REGRAS.PRECO_SEMANA
                   : REGRAS.PRECO_AVULSO;
      const totalOriginalDia = qty * unit;
      const totalDia = desconto_pct
        ? Math.round(totalOriginalDia * (1 - desconto_pct / 100)) : totalOriginalDia;
      const { data: ped, error } = await sb.from("pedidos").insert({
        cliente_id: cliente.id,
        dia_consumo: d.dia,
        total: totalDia,
        quantidade: qty,
        status_pagamento: statusPag,
        metodo_pagamento: metodo,
        precisa_aprovacao: d._atrasado,
        status_aprovacao: d._atrasado ? "pendente" : null,
        cupom_codigo,
        desconto_pct
      }).select().single();

      if (error) { falhou = true; break; }
      await sb.from("pedido_itens").insert({
        pedido_id: ped.id, menu_item_id: d.id, preco: unit
      });
    }

    btn.disabled = false; if (btn2) btn2.disabled = false;
    if (falhou) { erro.textContent = "Error placing order. Please try again."; return; }

    const totalMeals = escolhidos.reduce((s, d) => s + (this._qtd.get(d.dia) || 1), 0);
    const dias = escolhidos.map(d => {
      const dt = new Date(d.dia + "T00:00:00");
      return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()];
    }).join(", ");
    const isPago = statusPag === "pago";
    this._pushover(
      isPago ? "Payment received 💰" : "New Order 🍱",
      isPago
        ? `${cliente.nome} · $${total} · via ${metodo}`
        : `${cliente.nome} · ${totalMeals} meal(s) · $${total} · ${dias}`
    );

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
  // passou do corte suave (17:00 do dia anterior) → mostra aviso
  _passouCorte(diaIso) {
    const limite = new Date(diaIso + "T00:00:00");
    limite.setDate(limite.getDate() - 1);
    limite.setHours(REGRAS.HORA_CORTE, REGRAS.MIN_CORTE, 0, 0);
    return this._agoraCentral() > limite;
  },
  // passou do corte duro (17:30 do dia anterior) → bloqueia selecao
  _passouBloqueio(diaIso) {
    const limite = new Date(diaIso + "T00:00:00");
    limite.setDate(limite.getDate() - 1);
    limite.setHours(REGRAS.HORA_BLOQUEIO, REGRAS.MIN_BLOQUEIO, 0, 0);
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
