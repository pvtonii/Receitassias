/* ============================================
   ROTEADOR - APP ADMIN
   Para adicionar tela: inclua em SETORES e crie js/<id>.js
   com um objeto que tenha .render(container).
============================================ */

const SETORES = [
  { id: "dashboard",    rotulo: "Painel",  ico: "📊", modulo: () => Dashboard },
  { id: "pedidos",      rotulo: "Pedidos", ico: "🧾", modulo: () => Pedidos },
  { id: "menu",         rotulo: "Menu",    ico: "🍱", modulo: () => Menu },
  { id: "ingredientes", rotulo: "Itens",   ico: "🥕", modulo: () => Ingredientes },
  { id: "clientes",     rotulo: "Clientes",ico: "👥", modulo: () => Clientes },
];

let SETOR_ATUAL = "dashboard";

function montarNav() {
  // Topo: titulo + sair
  document.getElementById("topo").innerHTML = `
    <div class="topbar">
      <strong>Admin ReceiTassia's</strong>
      <button class="sair" onclick="Auth.sair()">Sair</button>
    </div>`;

  // Barra inferior fixa (criada uma vez)
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
  montarNav();              // atualiza o item ativo na barra
  setor.modulo().render(container);
}

(async function iniciar() {
  const cliente = await Auth.checarSessao();
  if (!cliente || !Auth.ehAdmin()) {
    // exige admin; bloqueia cliente comum
    Auth.mostrarLogin({
      exigirAdmin: true,
      permitirCadastro: false,
      aoEntrar: () => { montarNav(); abrirSetor("dashboard"); }
    });
    return;
  }
  montarNav();
  abrirSetor("dashboard");
})();
