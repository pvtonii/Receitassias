/* ============================================
   APP CLIENTE - SETOR: My Orders
   Lista todos os pedidos do cliente agrupados por semana.
   Permite cancelar pedidos nao pagos ate as 19:00 do dia anterior.
============================================ */

const MeusPedidos = {

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">My Orders</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Your recent orders.</p>
      <div id="mp-lista">Loading...</div>`;
    await this._carregar();
  },

  async _carregar() {
    const el = document.getElementById("mp-lista");
    const cliente = Auth._cliente;
    if (!cliente) { el.innerHTML = this._aviso("Please log in again."); return; }

    const { data, error } = await sb.from("pedidos")
      .select("id, dia_consumo, total, quantidade, status_pagamento, pedido_itens(menu_itens(nome, especial))")
      .eq("cliente_id", cliente.id)
      .eq("cancelado", false)
      .order("dia_consumo", { ascending: false });

    if (error) { el.innerHTML = this._aviso("Error: " + error.message); return; }
    if (!data || !data.length) {
      el.innerHTML = this._aviso("No orders yet.");
      return;
    }

    // agrupa por semana (segunda-feira da semana de cada pedido)
    const grupos = {};
    for (const p of data) {
      const seg = this._segundaDaSemana(p.dia_consumo);
      if (!grupos[seg]) grupos[seg] = [];
      grupos[seg].push(p);
    }

    const hojeIso = new Date().toISOString().slice(0, 10);
    const cab = (titulo, primeiro) => `
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;
                  letter-spacing:.5px;color:var(--texto-suave);
                  margin:${primeiro ? "0" : "16px"} 0 8px">${titulo}</div>`;

    let html = "";
    const semanas = Object.keys(grupos).sort().reverse(); // mais recente primeiro
    semanas.forEach((seg, i) => {
      const fim = this._sexta(seg);
      const isThisWeek = seg <= hojeIso && hojeIso <= fim;
      const isFuture   = seg > hojeIso;
      const label = isThisWeek ? "This Week"
                  : isFuture   ? this._intervalo(seg, fim)
                  : this._intervalo(seg, fim);
      html += cab(label, i === 0);
      html += grupos[seg].map(p => this._card(p)).join("");
    });

    el.innerHTML = html;
  },

  _card(p) {
    const item    = p.pedido_itens && p.pedido_itens[0] && p.pedido_itens[0].menu_itens;
    const nome    = item ? item.nome    : "Meal";
    const especial = item ? item.especial : false;
    const qty  = p.quantidade || 1;
    const pode = this._podeCancelar(p);

    const statusLabel = {
      pendente:   '<span style="color:var(--erro);font-weight:600">Not paid</span>',
      pago:       '<span style="color:var(--alerta);font-weight:600">Paid — awaiting confirmation</span>',
      confirmado: '<span style="color:var(--sucesso);font-weight:600">✓ Confirmed</span>'
    }[p.status_pagamento] || "";

    return `
      <div class="card" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
          <div style="flex:1">
            <div style="font-weight:700">
              ${qty > 1 ? qty + "× " : ""}${this._esc(nome)}
              ${especial ? '<span class="badge-especial" style="margin-left:6px">SPECIAL</span>' : ""}
            </div>
            <div style="font-size:13px;color:var(--texto-suave);margin-top:2px">
              ${this._fmtData(p.dia_consumo)}</div>
            <div style="margin-top:6px">${statusLabel}</div>
          </div>
          <div style="font-weight:700;flex-shrink:0">$${Number(p.total).toFixed(0)}</div>
        </div>
        ${pode ? `
          <button class="btn btn-perigo" style="width:100%;margin-top:10px;padding:10px"
            onclick="MeusPedidos._cancelar('${p.id}')">Cancel order</button>` : ""}
      </div>`;
  },

  _podeCancelar(p) {
    if (p.status_pagamento !== "pendente") return false;
    const limite = new Date(p.dia_consumo + "T00:00:00");
    limite.setDate(limite.getDate() - 1);
    limite.setHours(19, 0, 0, 0);
    const agora = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
    return agora < limite;
  },

  async _cancelar(id) {
    if (!confirm("Cancel this order?")) return;
    const { error } = await sb.from("pedidos").update({ cancelado: true }).eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    this._carregar();
  },

  // retorna ISO da segunda-feira da semana de um dia
  _segundaDaSemana(iso) {
    const d = new Date(iso + "T00:00:00");
    const day = d.getDay(); // 0=dom, 1=seg...
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  },
  // retorna ISO da sexta da semana (seg + 4)
  _sexta(segIso) {
    const d = new Date(segIso + "T00:00:00");
    d.setDate(d.getDate() + 4);
    return d.toISOString().slice(0, 10);
  },
  _intervalo(ini, fim) {
    const a = new Date(ini + "T00:00:00"), b = new Date(fim + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (a.getMonth() === b.getMonth())
      return `${m[a.getMonth()]} ${a.getDate()}–${b.getDate()}`;
    return `${m[a.getMonth()]} ${a.getDate()} – ${m[b.getMonth()]} ${b.getDate()}`;
  },
  _fmtData(iso) {
    const d = new Date(iso + "T00:00:00");
    const dias = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
