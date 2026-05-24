/* ============================================
   ROTEADOR - APP CLIENTE
   Telas: dashboard, menu, pedido, profile
============================================ */

const SETORES = [
  { id: "dashboard", rotulo: "Inicio", ico: "🏠", modulo: () => Dashboard },
  { id: "menu",      rotulo: "Menu",   ico: "🍱", modulo: () => Menu },
  { id: "pedido",    rotulo: "Pedir",  ico: "🛒", modulo: () => Pedido },
  { id: "profile",   rotulo: "Perfil", ico: "👤", modulo: () => Profile },
];

let SETOR_ATUAL = "dashboard";

function montarNav() {
  document.getElementById("topo").innerHTML = `
    <div class="topbar">
      <strong>ReceiTassia's</strong>
      <button class="sair" onclick="Auth.sair()">Sair</button>
    </div>`;

  if (!document.getElementById("tabbar")) {
    const tab = document.createElement("nav");
    tab.id = "tabbar"; tab.className = "tabbar";
    document.body.appendChild(tab);
  }
  document.getElementById("tabbar").innerHTML = SETORES.map(s => `
    <button class="nav-item ${s.id === SETOR_ATUAL ? "ativo" : ""}"
            onclick="abrirSetor('${s.id}')">
      <span class="ico">${s.ico}</span>${s.rotulo}
    </button>`).join("");
}

function abrirSetor(id) {
  const setor = SETORES.find(s => s.id === id);
  const container = document.getElementById("app");
  if (!setor) { container.innerHTML = "Tela nao encontrada."; return; }
  SETOR_ATUAL = id;
  montarNav();
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
