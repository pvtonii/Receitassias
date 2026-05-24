/* ============================================
   ROTEADOR - APP CLIENTE
   Telas: dashboard, menu, pedido, profile
============================================ */

const SETORES = [
  { id: "dashboard", rotulo: "Inicio",  modulo: () => Dashboard },
  { id: "menu",      rotulo: "Menu",    modulo: () => Menu },
  { id: "pedido",    rotulo: "Pedir",   modulo: () => Pedido },
  { id: "profile",   rotulo: "Perfil",  modulo: () => Profile },
];

function montarNav() {
  document.getElementById("topo").innerHTML = `
    <nav style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;
                padding:14px;background:var(--cor-verde-escuro)">
      <strong style="color:#fff;margin-right:auto">RECEITASSIAS</strong>
      ${SETORES.map(s => `
        <button class="btn-secundario" style="color:#fff;border-color:rgba(255,255,255,.3)"
                onclick="abrirSetor('${s.id}')">${s.rotulo}</button>`).join("")}
      <button class="btn-secundario" style="color:#fff;border-color:rgba(255,255,255,.3)"
              onclick="Auth.sair()">Sair</button>
    </nav>`;
}

function abrirSetor(id) {
  const setor = SETORES.find(s => s.id === id);
  const container = document.getElementById("app");
  if (!setor) { container.innerHTML = "Tela nao encontrada."; return; }
  setor.modulo().render(container);
}

(async function iniciar() {
  const cliente = await Auth.checarSessao();
  if (!cliente) {
    Auth.mostrarLogin({
      permitirCadastro: true,
      aoEntrar: () => { montarNav(); abrirSetor("dashboard"); }
    });
    return;
  }
  montarNav();
  abrirSetor("dashboard");
})();
