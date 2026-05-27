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
      <div id="alerta-pendentes"></div>
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
    const alerta = document.getElementById("alerta-pendentes");
    const cliente = Auth._cliente;
    if (!cliente) { el.innerHTML = this._aviso("Please log in again."); return; }

    const { data, error } = await sb.from("pedidos")
      .select("*, pedido_itens(menu_itens(nome))")
      .eq("cliente_id", cliente.id)
      .order("dia_consumo", { ascending: false });

    if (error) { el.innerHTML = this._aviso("Error: " + error.message); return; }
    if (!data || !data.length) {
      if (alerta) alerta.innerHTML = "";
      el.innerHTML = this._aviso("No orders yet. Tap Order to get started!");
      return;
    }

    // nao-pagos (pendente, nao cancelado): vamos separar em ATRASADOS x POR VIR
    const hojeIso = this._hojeCentralIso();
    const abertos = data.filter(p => p.status_pagamento === "pendente" && !p.cancelado);
    const resto   = data.filter(p => !(p.status_pagamento === "pendente" && !p.cancelado));

    // banner topo: resumo de TUDO que esta em aberto (somando atrasados + por vir)
    if (alerta) {
      if (abertos.length) {
        const totalAbertos = abertos.reduce((s, p) => s + Number(p.total), 0);
        const idsAbertos = abertos.map(p => p.id).join(",");
        alerta.innerHTML = `
          <div class="card" style="border:2px solid var(--erro);
               background:rgba(217,48,37,.06);margin-bottom:18px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:var(--erro);font-size:15px">
                  💸 ${abertos.reduce((s,p)=>s+(p.quantidade||1),0)} unpaid meal(s)</div>
                <div style="font-size:13px;color:var(--texto-suave);margin-top:2px">
                  $${totalAbertos.toFixed(0)} total — please pay so we can keep cooking!</div>
              </div>
              <button class="btn" style="padding:10px 16px;background:var(--erro)"
                onclick="Dashboard._pagarSemana('${idsAbertos}', ${totalAbertos})">Pay now</button>
            </div>
          </div>`;
      } else {
        alerta.innerHTML = "";
      }
    }

    // separa cada pedido em "atrasada" (dia ja passou) ou "por vir", agrupando por semana
    const semanasAtrasadas = {};
    const semanasFuturas = {};
    for (const p of abertos) {
      const chave = this._segundaDaSemana(p.dia_consumo);
      const bucket = (p.dia_consumo < hojeIso ? semanasAtrasadas : semanasFuturas);
      (bucket[chave] = bucket[chave] || []).push(p);
    }

    let html = "";

    const renderBloco = (titulo, cor, mapa, atrasada) => {
      const chaves = Object.keys(mapa).sort();
      if (!chaves.length) return "";
      let s = `<div style="font-size:12px;font-weight:700;text-transform:uppercase;
                letter-spacing:.5px;color:${cor};margin:4px 0 8px">${titulo}</div>`;
      for (const ch of chaves) s += this._cardSemana(ch, mapa[ch], atrasada);
      return s;
    };

    html += renderBloco("Overdue — please pay", "var(--erro)", semanasAtrasadas, true);
    html += renderBloco("Upcoming — to pay", "var(--primaria)", semanasFuturas, false);

    if (resto.length) {
      html += `<div style="font-size:12px;font-weight:700;text-transform:uppercase;
                 letter-spacing:.5px;color:var(--texto-suave);margin:16px 0 8px">History</div>`;

      const semHist = {};
      for (const p of resto) {
        const ch = this._segundaDaSemana(p.dia_consumo);
        (semHist[ch] = semHist[ch] || []).push(p);
      }
      const chaves = Object.keys(semHist).sort().reverse();
      chaves.forEach((ch, i) => {
        const ps = semHist[ch];
        const fim = this._sexta(ch);
        const label = this._intervalo(ch, fim);
        const totalSem = ps.filter(p => !p.cancelado).reduce((s, p) => s + Number(p.total), 0);
        const qtdSem   = ps.filter(p => !p.cancelado).reduce((s, p) => s + (p.quantidade || 1), 0);
        html += `
          <details${i === 0 ? " open" : ""} style="margin-bottom:8px">
            <summary style="list-style:none;cursor:pointer;display:flex;
                            align-items:center;justify-content:space-between;
                            padding:10px 14px;background:var(--card);
                            border:1px solid var(--borda);border-radius:var(--raio);
                            font-size:13px">
              <span style="font-weight:700">${label}</span>
              <span style="color:var(--texto-suave)">${qtdSem} meal(s) · $${totalSem.toFixed(0)} ›</span>
            </summary>
            <div style="padding:4px 0 0">
              ${ps.sort((a,b)=>b.dia_consumo.localeCompare(a.dia_consumo))
                  .map(p => this._cardPedido(p)).join("")}
            </div>
          </details>`;
      });
    }
    el.innerHTML = html;
  },

  /* Card de uma SEMANA com pedidos a pagar: total + 1 Pay now
     atrasada=true muda a cor pra vermelho e marca "OVERDUE" no header */
  _cardSemana(segundaIso, pedidos, atrasada) {
    const total = pedidos.reduce((s, p) => s + Number(p.total), 0);
    const qtd = pedidos.reduce((s, p) => s + (p.quantidade || 1), 0);
    const ids = pedidos.map(p => p.id).join(",");
    const cor = atrasada ? "var(--erro)" : "var(--primaria)";
    // lista os dias/marmitas dessa semana
    const linhas = pedidos
      .sort((a,b) => a.dia_consumo.localeCompare(b.dia_consumo))
      .map(p => {
        const qty  = p.quantidade || 1;
        const nome = (p.pedido_itens && p.pedido_itens[0] && p.pedido_itens[0].menu_itens)
          ? p.pedido_itens[0].menu_itens.nome : "Meal";
        return `<div style="font-size:13px;color:var(--texto-suave)">
                  ${this._diaCurto(p.dia_consumo)} · ${qty > 1 ? qty+"× " : ""}${this._esc(nome)} · $${Number(p.total).toFixed(0)}</div>`;
      }).join("");

    return `
      <div class="card" style="margin-bottom:10px;border:2px solid ${cor}">
        <div style="font-weight:700;margin-bottom:6px${atrasada ? ";color:var(--erro)" : ""}">
          Week of ${this._diaCurto(segundaIso)} · ${qtd} meal(s)${atrasada ? " · OVERDUE" : ""}</div>
        ${linhas}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
          <div style="font-weight:700;font-size:18px">$${total.toFixed(0)}</div>
          <button class="btn" style="padding:10px 18px${atrasada ? ";background:var(--erro)" : ""}"
            onclick="Dashboard._pagarSemana('${ids}', ${total})">Pay now</button>
        </div>
      </div>`;
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
            ${p.desconto_pct ? `<div style="font-size:12px;color:var(--sucesso)">🎟 ${p.desconto_pct}% off</div>` : ""}
            <div style="margin-top:4px">${status}</div>
          </div>
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

  /* Pay now da semana: paga TODOS os pedidos daquela semana de uma vez */
  _pagarSemana(idsStr, total) {
    const ids = idsStr.split(",");
    if (typeof Pedido !== "undefined" && Pedido._pagarVarios) {
      Pedido._pagarVarios(ids, total);
    } else {
      abrirSetor("pedido");
    }
  },

  /* segunda-feira (Monday) da semana de uma data ISO */
  _segundaDaSemana(iso) {
    const d = new Date(iso + "T00:00:00");
    const diaSemana = (d.getDay() + 6) % 7;  // 0 = Monday
    d.setDate(d.getDate() - diaSemana);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  },
  _diaCurto(iso) {
    const d = new Date(iso + "T00:00:00");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[d.getMonth()]} ${d.getDate()}`;
  },
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

  /* --- datas (fuso Central) --- */
  _amanhaCentralIso() {
    const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const d = new Date(s);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  },
  _hojeCentralIso() {
    const s = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
    const d = new Date(s);
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
