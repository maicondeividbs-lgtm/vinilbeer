/* =========================================================
   Camada de dados.

   Conversa com o Supabase pela API REST, usando fetch puro —
   sem biblioteca externa. Menos um arquivo para carregar e uma
   dependência a menos para quebrar.

   Comportamento à prova de falha: se o Supabase não estiver
   configurado, estiver fora do ar ou devolver erro, o site cai
   automaticamente nos dados de js/data.js e continua funcionando.
   O visitante nunca vê uma página quebrada.
   ========================================================= */
window.VBApi = (function () {

  const cfg = () => window.VB_CONFIG;

  function configurado() {
    return Boolean(cfg().supabaseUrl && cfg().supabaseAnonKey);
  }

  function cabecalhos(extras = {}) {
    return {
      apikey: cfg().supabaseAnonKey,
      Authorization: `Bearer ${cfg().supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...extras
    };
  }

  /* Consulta genérica a uma tabela.
     `params` vira query string no formato do PostgREST.
     Ex.: buscar("programas", { select: "*", order: "ordem.asc" }) */
  async function buscar(tabela, params = {}) {
    const url = new URL(`${cfg().supabaseUrl}/rest/v1/${tabela}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const resposta = await fetch(url, { headers: cabecalhos() });
    if (!resposta.ok) {
      throw new Error(`${tabela}: ${resposta.status} ${resposta.statusText}`);
    }
    return resposta.json();
  }

  /* ---- conversão banco → formato que o site já usa ----
     Os componentes não sabem que o Supabase existe. Traduzimos aqui,
     e nada mais no site precisa mudar. */

  const paraPrograma = (linha) => ({
    slug: linha.slug,
    titulo: linha.titulo,
    dias: linha.dias,
    horario: linha.horario,
    apresentador: linha.apresentador,
    descricao: linha.descricao,
    capa: linha.capa_url || "assets/img/capa-programa.svg",
    grade: linha.grade_dias
      ? { dias: linha.grade_dias, inicio: linha.grade_inicio, fim: linha.grade_fim }
      : null
  });

  const paraFaixa = (linha) => ({
    artista: linha.artista,
    titulo: linha.titulo,
    capa: linha.capa_url,
    tocadaEm: linha.tocada_em
  });

  const paraResenha = (linha) => ({
    slug: linha.slug,
    titulo: linha.titulo,
    resumo: linha.resumo,
    texto: linha.texto || "",
    capa: linha.capa_url || "assets/img/capa-resenha.svg",
    publicadaEm: linha.publicada_em
  });

  /* ---- carga inicial ----
     Busca tudo em paralelo. Cada bloco falha sozinho: se as resenhas
     derem erro, os programas continuam vindo do banco. */
  async function carregar() {
    if (!configurado()) {
      console.info("Supabase não configurado — usando os dados locais de data.js");
      return { origem: "local" };
    }

    const tentar = async (nome, promessa, converter) => {
      try {
        const linhas = await promessa;
        return linhas.map(converter);
      } catch (erro) {
        console.warn(`Falha ao carregar ${nome}, mantendo dados locais:`, erro.message);
        return null;
      }
    };

    const [programas, playlist, resenhas, config] = await Promise.all([
      tentar("programas", buscar("programas", {
        select: "*", ativo: "eq.true", order: "ordem.asc"
      }), paraPrograma),

      tentar("playlist", buscar("playlist", {
        select: "*", order: "tocada_em.desc", limit: "50"
      }), paraFaixa),

      tentar("resenhas", buscar("resenhas", {
        select: "*", publicada_em: `lte.${new Date().toISOString()}`,
        order: "publicada_em.desc", limit: "20"
      }), paraResenha),

      tentar("configuracoes", buscar("configuracoes", {
        select: "*", id: "eq.1"
      }), (linha) => linha)
    ]);

    /* Só substitui o que veio com sucesso e não está vazio. */
    if (programas && programas.length) window.VB_DATA.programas = programas;
    if (resenhas && resenhas.length)   window.VB_DATA.resenhas = resenhas;

    if (playlist && playlist.length) {
      window.VB_DATA.playlist = playlist;
      /* A faixa mais recente do histórico é o que está tocando agora. */
      window.VB_DATA.tocandoAgora = {
        artista: playlist[0].artista,
        titulo: playlist[0].titulo,
        capa: playlist[0].capa || "assets/img/placeholder-album.svg"
      };
    }

    if (config && config[0]) {
      const c = config[0];
      if (c.stream_url)      cfg().streamUrl = c.stream_url;
      if (c.now_playing_url) cfg().nowPlayingUrl = c.now_playing_url;
      if (c.sobre)           window.VB_DATA.sobre = c.sobre;
      if (c.redes && Object.keys(c.redes).length) {
        cfg().social = { ...cfg().social, ...c.redes };
      }
    }

    return { origem: "supabase" };
  }

  /* ---- envio de recado ----
     Entra na tabela com status "pendente". A política de segurança
     do banco permite inserir, mas não ler — ninguém consegue puxar
     os recados dos outros pelo navegador. */
  async function enviarRecado(nome, texto) {
    if (!configurado()) {
      /* Sem banco: simula para o formulário continuar demonstrável. */
      await new Promise((r) => setTimeout(r, 600));
      return { simulado: true };
    }

    const resposta = await fetch(`${cfg().supabaseUrl}/rest/v1/recados`, {
      method: "POST",
      headers: cabecalhos({ Prefer: "return=minimal" }),
      body: JSON.stringify({ nome, texto })
    });

    if (!resposta.ok) {
      throw new Error(`Recado não enviado: ${resposta.status}`);
    }
    return { simulado: false };
  }

  /* ---- playlist ao vivo ----
     Escuta a tabela e atualiza a tela quando uma faixa nova entra,
     sem o visitante recarregar. Usa consulta periódica em vez de
     websocket: é mais simples, mais barato e, num intervalo de 20s,
     indistinguível para quem está ouvindo. */
  let timerPlaylist = null;

  function acompanharPlaylist() {
    if (!configurado()) return;

    async function verificar() {
      try {
        const linhas = await buscar("playlist", {
          select: "*", order: "tocada_em.desc", limit: "50"
        });
        if (!linhas.length) return;

        const novas = linhas.map(paraFaixa);
        const mudou = novas[0].tocadaEm !== window.VB_DATA.playlist[0]?.tocadaEm;
        if (!mudou) return;

        window.VB_DATA.playlist = novas;
        window.VBViews.atualizarTocandoAgora({
          artista: novas[0].artista,
          titulo: novas[0].titulo,
          capa: novas[0].capa || "assets/img/placeholder-album.svg"
        });
        window.VBViews.remontarPlaylists();
      } catch (erro) {
        console.warn("Playlist não atualizou:", erro.message);
      }
    }

    timerPlaylist = setInterval(verificar, 20000);
  }

  return { configurado, buscar, carregar, enviarRecado, acompanharPlaylist };
})();
