/* ============================================
   APP CLIENTE - SETOR: Profile
   Editar nome, telefone (sincroniza o login) e senha.
   Telefone afeta o login (email interno), entao muda nos 2 lugares.
   Edite SO este arquivo para mexer nesta tela.
============================================ */

const Profile = {

  async render(container) {
    const c = Auth._cliente;
    if (!c) { container.innerHTML = this._aviso("Please log in again."); return; }

    container.innerHTML = `
      <h2 style="margin-bottom:16px">My profile</h2>

      <label>Name</label>
      <input class="campo" id="p-nome" type="text" value="${this._esc(c.nome || "")}">

      <label>Phone</label>
      <div class="campo" style="background:var(--bg);color:var(--texto-suave);cursor:default">
        ${this._fmtTel(c.telefone)}</div>
      <div style="font-size:12px;color:var(--texto-suave);margin:-8px 0 14px">
        To change your phone, contact us.</div>

      <div class="erro-msg" id="p-erro"></div>
      <div id="p-ok" style="color:var(--sucesso);font-size:14px;min-height:18px"></div>
      <button class="btn" id="p-salvar" style="width:100%;margin-bottom:22px">Save changes</button>

      <h3 style="margin-bottom:10px">
        <button id="p-toggle-senha" class="btn-secundario" style="width:100%;text-align:left">
          Change password ▾</button>
      </h3>
      <div id="p-senha-area" style="display:none">
        <label>New password (min. 6 characters)</label>
        <input class="campo" id="p-senha" type="password" placeholder="new password">
        <div class="erro-msg" id="p-senha-erro"></div>
        <div id="p-senha-ok" style="color:var(--sucesso);font-size:14px;min-height:18px"></div>
        <button class="btn-secundario" id="p-trocar-senha" style="width:100%">Update password</button>
      </div>

      <details style="margin-top:16px">
        <summary style="list-style:none;cursor:pointer;display:flex;align-items:center;
                        justify-content:space-between;padding:12px 14px;
                        background:var(--card);border:1px solid var(--borda);
                        border-radius:var(--raio);font-size:14px">
          <span style="font-weight:700">📱 Add to Home Screen</span>
          <span style="color:var(--texto-suave);font-size:13px">tap for steps ›</span>
        </summary>
        <div class="card" style="margin-top:8px">
          <p style="font-size:14px;color:var(--texto-suave);margin-bottom:14px">
            Install ReceiTassia's as an app on your phone for quick access — no App Store needed. Works on any browser!</p>
          <div style="display:flex;flex-direction:column;gap:14px;font-size:14px">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div style="font-size:24px;line-height:1;width:20px;text-align:center;flex-shrink:0">1</div>
              <div>
                <div style="font-weight:700">Open the menu</div>
                <div style="font-size:13px;color:var(--texto-suave)">
                  On Safari: tap the Share button <strong>⎙</strong> at the bottom. On Chrome or other browsers: tap the <strong>⋮</strong> menu (top right).</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div style="font-size:24px;line-height:1;width:20px;text-align:center;flex-shrink:0">2</div>
              <div>
                <div style="font-weight:700">Tap "Add to Home Screen"</div>
                <div style="font-size:13px;color:var(--texto-suave)">
                  Scroll through the menu options until you find it — it has a plus icon.</div>
              </div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div style="font-size:24px;line-height:1;width:20px;text-align:center;flex-shrink:0">3</div>
              <div>
                <div style="font-weight:700">Tap "Add"</div>
                <div style="font-size:13px;color:var(--texto-suave)">
                  The app icon will appear on your Home Screen. Done!</div>
              </div>
            </div>
          </div>
        </div>
      </details>`;

    document.getElementById("p-salvar")
      .addEventListener("click", () => this._salvar());

    // expandir/recolher a area de senha
    document.getElementById("p-toggle-senha").addEventListener("click", () => {
      const area = document.getElementById("p-senha-area");
      const aberto = area.style.display !== "none";
      area.style.display = aberto ? "none" : "block";
      document.getElementById("p-toggle-senha").innerHTML =
        aberto ? "Change password ▾" : "Change password ▴";
    });

    document.getElementById("p-trocar-senha")
      .addEventListener("click", () => this._trocarSenha());
  },

  async _salvar() {
    const erro = document.getElementById("p-erro");
    const ok = document.getElementById("p-ok");
    const btn = document.getElementById("p-salvar");
    erro.textContent = ""; ok.textContent = "";

    const nome = document.getElementById("p-nome").value.trim();
    if (!nome) { erro.textContent = "Enter your name."; return; }

    btn.disabled = true;
    const { error } = await sb.from("clientes")
      .update({ nome }).eq("id", Auth._cliente.id);
    btn.disabled = false;
    if (error) { erro.textContent = "Error: " + error.message; return; }

    Auth._cliente.nome = nome;
    ok.textContent = "Saved!";
  },

  async _trocarSenha() {
    const erro = document.getElementById("p-senha-erro");
    const ok = document.getElementById("p-senha-ok");
    const btn = document.getElementById("p-trocar-senha");
    erro.textContent = ""; ok.textContent = "";

    const senha = document.getElementById("p-senha").value;
    if (senha.length < 6) { erro.textContent = "Password must be at least 6 characters."; return; }

    btn.disabled = true;
    const { error } = await sb.auth.updateUser({ password: senha });
    btn.disabled = false;
    if (error) { erro.textContent = "Error: " + error.message; return; }

    document.getElementById("p-senha").value = "";
    ok.textContent = "Password updated!";
  },

  _fmtTel(t) {
    const s = String(t || "").replace(/\D/g, "");
    if (s.length === 10) return `(${s.slice(0,3)}) ${s.slice(3,6)}-${s.slice(6)}`;
    return t || "";
  },
  _aviso(txt) {
    return '<div class="card" style="text-align:center;color:var(--texto-suave)">' + txt + '</div>';
  },
  _esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  }
};
