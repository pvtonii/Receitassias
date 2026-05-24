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
      <div class="card" style="margin-bottom:16px">
        ${this._linhaPag("Venmo", pix.venmo)}
        ${this._linhaPag("Zelle", pix.zelle + (pix.zelle_nome ? " · " + pix.zelle_nome : ""))}
        ${this._linhaPag("Apple Cash", pix.applecash)}
      </div>

      <p style="font-size:14px;margin-bottom:8px">Which one did you use?</p>
      <div id="metodos" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${["CashApp","Venmo","Zelle","Apple Cash"].map(mt => `
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
      <div class="card" style="margin-bottom:16px">
        ${this._linhaPag("Venmo", pix.venmo)}
        ${this._linhaPag("Zelle", pix.zelle + (pix.zelle_nome ? " · " + pix.zelle_nome : ""))}
        ${this._linhaPag("Apple Cash", pix.applecash)}
      </div>

      <p style="font-size:14px;margin-bottom:8px">Which one did you use?</p>
      <div id="metodos" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${["CashApp","Venmo","Zelle","Apple Cash"].map(mt => `
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
    const { semanaCheia } = this._calcular();

    el.innerHTML = `
      <div style="font-weight:600;margin-bottom:12px">
        ${this._intervalo(this._semana.semana_inicio, this._semana.semana_fim)}</div>
      ${this._dias.map(d => this._cardDia(d, m, semanaCheia)).join("")}
      <div id="ord-resumo" class="card" style="position:sticky;bottom:84px;
           border:2px solid var(--primaria)"></div>`;

    this._atualizarResumo();
  },

  _cardDia(d, m, semanaCheia) {
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
          <div style="font-weight:700;text-align:right">
            ${(semanaCheia && !d.especial) ? `
              <span style="text-decoration:line-through;color:var(--texto-suave);
                    font-weight:400;font-size:13px">$${REGRAS.PRECO_AVULSO}</span>
              <span style="color:var(--sucesso)">$${REGRAS.PRECO_SEMANA}</span>`
            : `$${Number(d.preco).toFixed(0)}`}
          </div>
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
    // economia = quanto pagaria tudo avulso - quanto paga agora
    let economia = 0;
    if (semanaCheia) {
      const avulso = escolhidos.reduce((s,d) =>
        s + (d.especial ? REGRAS.PRECO_ESPECIAL : REGRAS.PRECO_AVULSO), 0);
      economia = avulso - total;
    }
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;font-size:18px">$${total.toFixed(0)}</div>
          <div style="font-size:12px;color:var(--texto-suave)">
            ${escolhidos.length} day(s)${semanaCheia ? " · full week 🎉" : ""}</div>
          ${economia > 0 ? `<div style="font-size:12px;color:var(--sucesso);font-weight:600">
            You save $${economia}!</div>` : ""}
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
      <button class="btn-voltar"
              onclick="Pedido.render(document.getElementById('app'))">← Back</button>
      <h2 style="margin-bottom:8px">Payment</h2>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px">
          <span>Total</span><span>$${total.toFixed(0)}</span></div>
        <div style="font-size:13px;color:var(--texto-suave);margin-top:4px">
          ${escolhidos.length} meal(s)</div>
      </div>

      <button class="btn" id="cash-link" style="width:100%;margin-bottom:16px;
              background:var(--sucesso)">
        Pay $${total.toFixed(0)} with CashApp</button>

      <p style="font-size:14px;margin-bottom:8px">Or pay with:</p>
      <div class="card" style="margin-bottom:16px">
        ${this._linhaPag("Venmo", pix.venmo)}
        ${this._linhaPag("Zelle", pix.zelle + (pix.zelle_nome ? " · " + pix.zelle_nome : ""))}
        ${this._linhaPag("Apple Cash", pix.applecash)}
      </div>

      ${temAtrasado ? `<div class="card" style="border-color:var(--erro);color:var(--erro);
        font-size:13px;margin-bottom:16px">⚠️ Your order includes days past the usual cutoff.
        We'll confirm if we can still make them.</div>` : ""}

      <p style="font-size:14px;margin-bottom:8px">Which one did you use?</p>
      <div id="metodos" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${["CashApp","Venmo","Zelle","Apple Cash"].map(mt => `
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

  _linhaPag(nome, valor) {
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 0;
                  border-bottom:1px solid var(--borda)">
        <div style="flex:1"><strong>${nome}:</strong> ${this._esc(valor)}</div>
        <button class="btn-icone" title="Copy"
          onclick="Pedido._copiar('${this._esc(valor).replace(/'/g,"")}')">&#128203;</button>
      </div>`;
  },

  _copiar(txt) {
    navigator.clipboard && navigator.clipboard.writeText(txt);
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

    // cria um pedido por dia de consumo (facilita a producao por dia)
    let falhou = false;
    for (const d of escolhidos) {
      const { data: ped, error } = await sb.from("pedidos").insert({
        cliente_id: cliente.id,
        dia_consumo: d.dia,
        total: Number(d.especial ? REGRAS.PRECO_ESPECIAL
              : (escolhidos.length === REGRAS.DIAS_SEMANA && this._dias.length === REGRAS.DIAS_SEMANA
                 ? REGRAS.PRECO_SEMANA : REGRAS.PRECO_AVULSO)),
        status_pagamento: statusPag,       // "pago" (cliente marcou) ou "pendente"
        metodo_pagamento: metodo,          // CashApp / Venmo / Zelle / Apple Cash / null
        precisa_aprovacao: d._atrasado,
        status_aprovacao: d._atrasado ? "pendente" : null
      }).select().single();

      if (error) { falhou = true; break; }
      await sb.from("pedido_itens").insert({
        pedido_id: ped.id, menu_item_id: d.id, preco: ped.total
      });
    }

    btn.disabled = false; if (btn2) btn2.disabled = false;
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
