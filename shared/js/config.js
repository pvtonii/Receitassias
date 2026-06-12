/* ============================================
   RECEITASSIAS - CONFIG (compartilhado)
   ============================================
   >>> A VERSAO E UNICA E VALE PARA OS DOIS APPS <<<
   Toda vez que editar QUALQUER coisa (admin ou cliente),
   suba o numero abaixo. Os dois footers leem daqui.
============================================ */

const APP_VERSION = "1.26.1";
const APP_DATA    = "2026-06-09";

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
  HORA_CORTE: 17,            // aviso "past cutoff": a partir das 17:00 do dia anterior
  MIN_CORTE: 0,              //
  HORA_BLOQUEIO: 17,         // bloqueio total: a partir das 17:30 do dia anterior
  MIN_BLOQUEIO: 30,          //
  PRECO_AVULSO: 14,
  PRECO_SEMANA: 12,          // por marmita, se levar os 5 dias
  PRECO_ESPECIAL: 15,
  DIAS_SEMANA: 5,
  PUSHOVER_TOKEN: "ajs5g4qq3qccrm1kj8mfd77ziavk6u",
  PUSHOVER_USER:  "g8f2gvhka7zzxzp3ui6kib238e32zv",
  PAGAMENTO: {
    cashapp:        "$TassiaOliveira1",      // exibido pro cliente
    cashapp_tag:    "TassiaOliveira1",        // usado no link cash.app/$tag/valor
    zelle:          "(803) 457-6473",
    zelle_nome:     "Tassia Colombo de Oliveira S",
    applecash:      "(803) 457-6473",          // mesmo telefone do Zelle
    applecash_phone: "18034576473"            // usado no link sms:+phone
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

/* Carrega uma lista de scripts EM ORDEM, cada um com ?v=APP_VERSION.
   Isso forca o navegador a baixar a versao nova quando APP_VERSION muda
   (cache-busting automatico). Chamado pelo index.html. */
function carregarScripts(lista, aoTerminar) {
  let i = 0;
  function proximo() {
    if (i >= lista.length) { if (aoTerminar) aoTerminar(); return; }
    const s = document.createElement("script");
    s.src = lista[i] + "?v=" + APP_VERSION;
    s.onload = () => { i++; proximo(); };
    s.onerror = () => { console.error("Falha ao carregar:", s.src); i++; proximo(); };
    document.body.appendChild(s);
  }
  proximo();
}

/* Traduz o texto de um campo PT->EN via MyMemory (sem chave de API).
   inputId: id do <input> | statusId: id do elemento de feedback */
async function traduzirCampo(inputId, statusId, btnId) {
  const input  = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const btn    = btnId ? document.getElementById(btnId) : null;
  const texto  = input ? input.value.trim() : "";
  if (!texto) { if (status) status.textContent = "Digite o nome primeiro."; return; }
  if (btn) btn.disabled = true;
  if (status) status.textContent = "Traduzindo...";
  try {
    const res  = await fetch("https://api.mymemory.translated.net/get?q="
      + encodeURIComponent(texto) + "&langpair=pt|en");
    const json = await res.json();
    const trad = json?.responseData?.translatedText;
    if (!trad) throw new Error();
    input.value = trad;
    if (status) { status.textContent = "✓ PT → EN"; setTimeout(() => { status.textContent = ""; }, 3000); }
  } catch {
    if (status) status.textContent = "Erro ao traduzir. Verifique a conexão.";
  }
  if (btn) btn.disabled = false;
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
