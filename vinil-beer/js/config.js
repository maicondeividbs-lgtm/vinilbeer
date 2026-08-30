/* =========================================================
   Configuração central do site.
   Tudo que muda entre ambientes ou que o cliente pode querer
   trocar mora aqui — nenhum outro arquivo tem valor fixo.
   ========================================================= */
window.VB_CONFIG = {

  /* Endereço do áudio em si.
     Vazio = o botão de play fica desabilitado, sem quebrar nada.
     No Zeno.FM tem o formato https://stream.zeno.fm/SEU_MOUNT
     Também dá para preencher pelo painel, em /admin. */
  streamUrl: "",

  /* Endereço que informa a faixa tocando agora.
     Vazio = mostra o último registro conhecido, sem atualizar sozinho.

     Zeno.FM:    https://api.zeno.fm/mounts/metadata/subscribe/SEU_MOUNT
     AzuraCast:  https://SEU-SERVIDOR/api/nowplaying/vinilbeer

     O código detecta qual é pelo endereço e usa o método certo.
     Também dá para preencher pelo painel, em /admin. */
  nowPlayingUrl: "",

  /* De quanto em quanto tempo consultar a faixa atual (ms) */
  nowPlayingInterval: 20000,

  /* Banco de dados.
     A chave abaixo é a "anon" (pública) — pode ficar no código.
     Quem protege os dados são as políticas de segurança (RLS)
     definidas em supabase/schema.sql.
     A chave service_role NUNCA deve aparecer aqui. */
  supabaseUrl: "https://mqmwvoddagjdyglsbqxx.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbXd2b2RkYWdqZHlnbHNicXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNzQ3MTEsImV4cCI6MjEwMzY1MDcxMX0.rbinlq5x5uoN10pdzWz-Yqv1YKC3Vhabr6DCA12HG6Y",

  social: {
    instagram: "#",
    youtube: "https://youtube.com/@vinilbeer",
    facebook: "#",
    tiktok: "#",
    whatsapp: "#"
  }
};
