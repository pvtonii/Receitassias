/* ============================================
   APP CLIENTE - SETOR: Home (Dashboard)
   Mostra: marmita de amanha + lista de pedidos do cliente.
   Pedidos em aberto tem botao "Pay now" -> tela de pagamento.
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Dashboard = {

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:14px">Hi${Auth._cliente ? ", " + this._esc(Auth._cliente.nome.split(" ")[0]) : ""}!</h2>
      <div id="card-amanha" style="margin-bottom:22px">Loading...</div>
      <h3 style="margin-bottom:10px">My orders</h3>
      <div id="meus-pedidos">Loading...</div>`;

    await this._menuAmanha();
    await this._meusPedidos();
  },

  /* --- card da marmita de amanha --- */
  async _menuAmanha() {
    const el = document.getElementById("card-amanha");
    const amanhaIso = this._amanhaCentralIso();

    const { data, error } = await sb.from("menu_itens")
      .select("*").eq("dia", amanhaIso).limit(1);

    if (error || !data || !data.length) {
      el.innerHTML = `<div class="card" style="text-align:center;color:var(--texto-suave)">
        No meal scheduled for tomorrow yet.</div>`;
      return;
    }
    const m = data[0];
    el.innerHTML = `
      <div class="card" style="border:2px solid var(--primaria)">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;
                    letter-spacing:.5px;color:var(--primaria);margin-bottom:6px">
          Tomorrow's meal</div>
        <div style="font-weight:700;font-size:17px">${this._esc(m.nome)}
          ${m.especial ? '<span class="badge-especial" style="margin-left:6px">SPECIAL</span>' : ""}
        </div>
        <div style="color:var(--texto-suave);font-size:14px;margin-top:4px">
          $${Number(m.preco).toFixed(0)}</div>
      </div>`;
  },

  /* --- lista de pedidos do cliente --- */
  async _meusPedidos() {
    const el = document.getElementById("meus-pedidos");
    const cliente = Auth._cliente;
    if (!cliente) { el.innerHTML = this._aviso("Please log in again."); return; }

    const { data, error } = await sb.from("pedidos")
      .select("*, pedido_itens(menu_itens(nome))")
      .eq("cliente_id", cliente.id)
      .order("dia_consumo", { ascending: false });

    if (error) { el.innerHTML = this._aviso("Error: " + error.message); return; }
    if (!data || !data.length) {
      el.innerHTML = this._aviso("No orders yet. Tap Order to get started!");
      return;
    }

    // separa em aberto (pendente, nao cancelado) vs resto
    const abertos = data.filter(p => p.status_pagamento === "pendente" && !p.cancelado);
    const resto   = data.filter(p => !(p.status_pagamento === "pendente" && !p.cancelado));

    let html = "";
    if (abertos.length) {
      html += `<div style="font-size:12px;font-weight:700;text-transform:uppercase;
                 letter-spacing:.5px;color:var(--erro);margin:4px 0 8px">To pay</div>`;
      html += abertos.map(p => this._cardPedido(p, true)).join("");
    }
    if (resto.length) {
      html += `<div style="font-size:12px;font-weight:700;text-transform:uppercase;
                 letter-spacing:.5px;color:var(--texto-suave);margin:16px 0 8px">History</div>`;
      html += resto.map(p => this._cardPedido(p, false)).join("");
    }
    el.innerHTML = html;
  },

  _cardPedido(p, aberto) {
    const dia = this._fmtData(p.dia_consumo);
    const marmita = (p.pedido_itens && p.pedido_itens[0] && p.pedido_itens[0].menu_itens)
      ? p.pedido_itens[0].menu_itens.nome : "Meal";
    const status = this._statusLabel(p);
    return `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="flex:1">
            <div style="font-weight:600">${this._esc(marmita)}</div>
            <div style="font-size:13px;color:var(--texto-suave)">${dia} · $${Number(p.total).toFixed(0)}</div>
            <div style="margin-top:4px">${status}</div>
          </div>
          ${aberto ? `<button class="btn" style="padding:10px 16px"
            onclick="Dashboard._pagar('${p.id}')">Pay now</button>` : ""}
        </div>
      </div>`;
  },

  _statusLabel(p) {
    if (p.cancelado)
      return `<span style="font-size:12px;color:var(--texto-suave)">Cancelled</span>`;
    if (p.status_pagamento === "confirmado")
      return `<span style="font-size:12px;color:var(--sucesso);font-weight:600">✓ Paid (confirmed)</span>`;
    if (p.status_pagamento === "pago")
      return `<span style="font-size:12px;color:var(--alerta);font-weight:600">Paid — awaiting confirmation</span>`;
    return `<span style="font-size:12px;color:var(--erro);font-weight:600">Not paid yet</span>`;
  },

  /* botao Pay now: leva pra tela de pagamento de UM pedido ja existente */
  _pagar(pedidoId) {
    if (typeof Pedido !== "undefined" && Pedido._pagarExistente) {
      Pedido._pagarExistente(pedidoId);
    } else {
      abrirSetor("pedido");
    }
  },

  /* --- datas (fuso Central) --- */
  _amanhaCentralIso() {
    const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const d = new Date(s);
    d.setDate(d.getDate() + 1);
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
