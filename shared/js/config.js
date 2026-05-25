/* ============================================
   RECEITASSIAS - CONFIG (compartilhado)
   ============================================
   >>> A VERSAO E UNICA E VALE PARA OS DOIS APPS <<<
   Toda vez que editar QUALQUER coisa (admin ou cliente),
   suba o numero abaixo. Os dois footers leem daqui.
============================================ */

const APP_VERSION = "1.14.1";
const APP_DATA    = "2026-05-24";

/* ============================================
   CONEXAO SUPABASE
   Supabase > Settings > API:
     - Project URL  -> SUPABASE_URL
     - anon public  -> SUPABASE_ANON_KEY
   A anon key PODE ficar aqui (protegida por RLS).
   NUNCA use a service_role key no codigo.
============================================ */
const SUPABASE_URL      = "https://ayvlknotctxvcczophjr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dmxrbm90Y3R4dmNjem9waGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzM5NTMsImV4cCI6MjA5NTE0OTk1M30.s5vj5yfavscPnMNzzQQHTAe1_DpYLX3pTlYUqaOxjVw";

/* A lib do CDN cria a global "supabase". Para nao conflitar,
   criamos NOSSO cliente com o nome "sb" (usado em todo o app). */
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================
   REGRAS DE NEGOCIO
============================================ */
const REGRAS = {
  HORA_CORTE: 15,            // corte: 15:30 do dia anterior
  MIN_CORTE: 30,             // (avisa, nao trava; admin aprova atrasados)
  PRECO_AVULSO: 14,
  PRECO_SEMANA: 12,          // por marmita, se levar os 5 dias
  PRECO_ESPECIAL: 15,
  DIAS_SEMANA: 5,
  PAGAMENTO: {
    cashapp:        "$TassiaOliveira1",      // exibido pro cliente
    cashapp_tag:    "TassiaOliveira1",        // usado no link cash.app/$tag/valor
    venmo:          "@SeuVenmo",              // troque quando ativar
    zelle:          "(803) 457-6473",
    zelle_nome:     "Tassia Colombo de Oliveira S",
    applecash:      "(803) 457-6473"          // mesmo telefone do Zelle
  }
};

/* ============================================
   HELPER: telefone <-> email interno
   O Supabase Auth usa email. Convertemos o telefone
   num "email" interno para usar telefone+senha sem custo de SMS.
   Ex: (205) 555-1234  ->  2055551234@receitassias.app
============================================ */
function telefoneParaEmail(telefone) {
  const so_numeros = (telefone || "").replace(/\D/g, "");
  return so_numeros + "@receitassias.app";
}

/* Atualiza o footer (id app-version / app-data) */
function aplicarVersaoNoFooter() {
  const v = document.getElementById("app-version");
  const d = document.getElementById("app-data");
  if (v) v.textContent = APP_VERSION;
  if (d) d.textContent = APP_DATA;
}

/* Forca recarregar o app ignorando o cache (botao de refresh no header).
   O truque do ?v=timestamp faz o navegador buscar tudo de novo. */
async function forcarAtualizacao(botao) {
  // faz o icone girar (feedback visual antes de recarregar)
  const ico = botao || document.querySelector(".topbar-icone");
  if (ico) ico.classList.add("girando");

  try {
    if (window.caches && caches.keys) {
      const chaves = await caches.keys();
      await Promise.all(chaves.map(k => caches.delete(k)));
    }
  } catch (e) { /* ignora; segue pro reload */ }

  // pequena pausa pra o giro ser visivel, depois recarrega ignorando cache
  setTimeout(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("v", Date.now());
    window.location.replace(u.toString());
  }, 600);
}
