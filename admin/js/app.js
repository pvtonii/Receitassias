/* ============================================
   ROTEADOR - APP ADMIN
   Para adicionar tela: inclua em SETORES e crie js/<id>.js
   com um objeto que tenha .render(container).
============================================ */

const SETORES = [
  { id: "dashboard",    rotulo: "Dashboard",  ico: "📊", modulo: () => Dashboard },
  { id: "pedidos",      rotulo: "Orders", ico: "🧾", modulo: () => Pedidos },
  { id: "menu",         rotulo: "Menu",    ico: "🍱", modulo: () => Menu },
  { id: "ingredientes", rotulo: "Items",   ico: "🥕", modulo: () => Ingredientes },
  { id: "clientes",     rotulo: "Customers",ico: "👥", modulo: () => Clientes },
];

let SETOR_ATUAL = "dashboard";

function montarNav() {
  // Topo: titulo + sair
  document.getElementById("topo").innerHTML = `
    <div class="topbar">
      <strong>Admin ReceiTassia's</strong>
      <button class="topbar-icone" onclick="forcarAtualizacao()" title="Refresh">&#8635;</button>
      <button class="sair" onclick="Auth.sair()">Log out</button>
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
  if (!setor) { container.innerHTML = "Screen not found."; return; }
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
