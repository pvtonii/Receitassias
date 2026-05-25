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
      <input class="campo" id="p-tel" type="tel" value="${this._fmtTel(c.telefone)}">
      <div style="font-size:12px;color:var(--texto-suave);margin:-8px 0 14px">
        Changing your phone also updates your login.</div>

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
      </div>`;

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
    const telBruto = document.getElementById("p-tel").value.trim();
    const telefone = telBruto.replace(/\D/g, "");
    const c = Auth._cliente;

    if (!nome || !telefone) { erro.textContent = "Enter name and phone."; return; }

    const mudouTel = telefone !== c.telefone;
    if (mudouTel) {
      if (!confirm("Changing your phone will change your login. Continue?")) return;
    }

    btn.disabled = true;

    // 1) se mudou o telefone, atualiza o email de login no Auth
    if (mudouTel) {
      const { error: eAuth } = await sb.auth.updateUser({
        email: telefoneParaEmail(telefone)
      });
      if (eAuth) {
        btn.disabled = false;
        erro.textContent = eAuth.message.includes("already")
          ? "This phone is already in use."
          : "Error updating login: " + eAuth.message;
        return;
      }
    }

    // 2) atualiza o registro em clientes
    const { error } = await sb.from("clientes")
      .update({ nome, telefone }).eq("id", c.id);
    btn.disabled = false;
    if (error) { erro.textContent = "Error: " + error.message; return; }

    // atualiza o cache local
    Auth._cliente.nome = nome;
    Auth._cliente.telefone = telefone;
    ok.textContent = mudouTel
      ? "Saved! Use your new phone to log in next time."
      : "Saved!";
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
