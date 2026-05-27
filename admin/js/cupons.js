/* ============================================
   APP ADMIN - SETOR: Coupons
   Criar e deletar cupons de desconto.
============================================ */

const Cupons = {

  async render(container) {
    container.innerHTML = `
      <h2 style="margin-bottom:4px">Coupons</h2>
      <p style="color:var(--texto-suave);font-size:14px;margin-bottom:16px">
        Create discount codes for customers.</p>

      <div class="card" style="margin-bottom:16px">
        <div style="font-weight:700;margin-bottom:12px">New coupon</div>
        <label>Code</label>
        <input class="campo" id="cup-codigo" placeholder="SUMMER20"
               oninput="this.value=this.value.toUpperCase()">
        <label>Discount</label>
        <div style="display:flex;align-items:center;gap:8px">
          <input class="campo" id="cup-pct" type="number" min="1" max="100"
                 placeholder="20" style="flex:1;margin:0">
          <span style="font-size:18px;font-weight:700;color:var(--texto-suave)">%</span>
        </div>
        <div class="erro-msg" id="cup-erro"></div>
        <button class="btn" style="width:100%;margin-top:12px"
                onclick="Cupons._criar()">Create coupon</button>
      </div>

      <div id="cup-lista">Loading...</div>`;

    await this._carregar();
  },

  async _carregar() {
    const el = document.getElementById("cup-lista");
    const { data, error } = await sb.from("cupons")
      .select("*").order("criado_em", { ascending: false });

    if (error) { el.innerHTML = this._aviso("Error: " + error.message); return; }
    if (!data || !data.length) {
      el.innerHTML = this._aviso("No coupons yet.");
      return;
    }

    el.innerHTML = `
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;
                  letter-spacing:.5px;color:var(--texto-suave);margin-bottom:8px">
        Active coupons</div>
      ${data.map(c => `
        <div class="card" style="margin-bottom:10px;display:flex;align-items:center;
                                  justify-content:space-between;gap:12px">
          <div>
            <div style="font-weight:700;font-size:17px;letter-spacing:.5px">
              ${this._esc(c.codigo)}</div>
            <div style="font-size:13px;color:var(--texto-suave)">${c.desconto_pct}% off</div>
          </div>
          <button class="btn btn-perigo" style="padding:8px 14px;flex-shrink:0"
            onclick="Cupons._deletar('${c.id}', '${this._esc(c.codigo)}')">Delete</button>
        </div>`).join("")}`;
  },

  async _criar() {
    const codigoEl = document.getElementById("cup-codigo");
    const pctEl    = document.getElementById("cup-pct");
    const erro     = document.getElementById("cup-erro");
    const codigo   = codigoEl.value.trim().toUpperCase();
    const pct      = parseInt(pctEl.value);

    erro.textContent = "";
    if (!codigo) { erro.textContent = "Enter a code."; return; }
    if (!pct || pct < 1 || pct > 100) { erro.textContent = "Enter a percentage between 1 and 100."; return; }

    const { error } = await sb.from("cupons").insert({ codigo, desconto_pct: pct });
    if (error) {
      erro.textContent = error.message.includes("unique")
        ? "This code already exists." : error.message;
      return;
    }

    codigoEl.value = "";
    pctEl.value = "";
    await this._carregar();
  },

  async _deletar(id, codigo) {
    if (!confirm(`Delete coupon "${codigo}"?\nIt will stop working immediately.`)) return;
    const { error } = await sb.from("cupons").delete().eq("id", id);
    if (error) { alert("Error: " + error.message); return; }
    await this._carregar();
  },

  _aviso(txt) {
    return `<div class="card" style="text-align:center;color:var(--texto-suave)">${txt}</div>`;
  },
  _esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
};
