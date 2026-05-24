/* ============================================
   ROTEADOR - APP ADMIN
   Para adicionar tela: inclua em SETORES e crie js/<id>.js
   com um objeto que tenha .render(container).
============================================ */

const SETORES = [
  { id: "dashboard",    rotulo: "Dashboard",    modulo: () => Dashboard },
  { id: "pedidos",      rotulo: "Pedidos",      modulo: () => Pedidos },
  { id: "ingredientes", rotulo: "Ingredientes", modulo: () => Ingredientes },
  { id: "clientes",     rotulo: "Clientes",     modulo: () => Clientes },
  { id: "menu",         rotulo: "Menu",         modulo: () => Menu },
];

function montarNav() {
  document.getElementById("topo").innerHTML = `
    <nav style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;
                padding:14px;background:var(--cor-verde-escuro)">
      <strong style="color:#fff;margin-right:auto">RECEITASSIAS · admin</strong>
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
