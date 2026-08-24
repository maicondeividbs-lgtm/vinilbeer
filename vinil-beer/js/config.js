/* =========================================================
   Configuração central do site.
   Tudo que muda entre ambientes ou que o cliente pode querer
   trocar mora aqui — nenhum outro arquivo tem valor fixo.
   ========================================================= */
window.VB_CONFIG = {

  /* URL do stream de áudio.
     Vazio = o botão de play aparece desabilitado, sem quebrar nada.
     Preencha quando o serviço de streaming for definido. */
  streamUrl: "",

  /* Endpoint que devolve a faixa atual (JSON).
     Vazio = usa o último registro conhecido em data.js.
     No Azuracast é algo como:
     https://SEU-SERVIDOR/api/nowplaying/vinilbeer */
  nowPlayingUrl: "",

  /* De quanto em quanto tempo consultar a faixa atual (ms) */
  nowPlayingInterval: 20000,

  /* Preenchido na Fase 3 (Supabase) */
  supabaseUrl: "",
  supabaseAnonKey: "",

  social: {
    instagram: "#",
    youtube: "https://youtube.com/@vinilbeer",
    facebook: "#",
    tiktok: "#",
    whatsapp: "#"
  }
};
