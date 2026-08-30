/* =========================================================
   Player de áudio.
   Existe UM único <audio> na página inteira. Todos os botões
   de play do site (hero, card "tocando agora", barra fixa)
   chamam este mesmo objeto — nunca criam um segundo player.
   ========================================================= */
window.VBPlayer = (function () {

  const audio     = document.getElementById("audio");
  const btnPlay   = document.getElementById("btn-play");
  const btnMute   = document.getElementById("btn-mute");
  const volume    = document.getElementById("volume");
  const faixaTexto = document.getElementById("player-track");

  let estado = "parado";   // parado | carregando | tocando | erro
  let mudo   = false;
  let timerMetadados = null;

  /* ---- estado visual global ----
     Tudo que reage ao player (disco girando, onda colorida,
     ícone play/pause, bolinha do "ao vivo") lê estas classes
     no <body>. Um lugar só, sem duplicar lógica. */
  function pintarEstado() {
    document.body.classList.toggle("is-live", estado === "tocando");
    document.body.classList.toggle("is-loading", estado === "carregando");
    document.body.classList.toggle("is-muted", mudo || audio.volume === 0);

    const tocando = estado === "tocando" || estado === "carregando";
    document.querySelectorAll("[data-play-trigger], #btn-play").forEach((btn) => {
      const rotulo = tocando ? "Pausar transmissão" : "Ouvir ao vivo";
      const sr = btn.querySelector(".sr-only");
      if (sr) sr.textContent = rotulo;
      else btn.setAttribute("aria-label", rotulo);
    });
  }

  function escreverFaixa(texto) {
    faixaTexto.textContent = texto;
  }

  /* ---- controle ---- */
  function tocar() {
    const url = window.VB_CONFIG.streamUrl;
    if (!url) return;

    estado = "carregando";
    pintarEstado();

    audio.src = url;
    audio.volume = mudo ? 0 : Number(volume.value);

    audio.play()
      .then(() => { estado = "tocando"; pintarEstado(); })
      .catch(() => {
        estado = "erro";
        pintarEstado();
        escreverFaixa("Não foi possível conectar. Tente de novo.");
      });
  }

  function parar() {
    audio.pause();
    /* Em transmissão ao vivo não existe "pausar": se apenas pausássemos,
       o buffer continuaria acumulando e o ouvinte voltaria atrasado em
       relação ao que está no ar. Por isso descarregamos a fonte. */
    audio.removeAttribute("src");
    audio.load();
    estado = "parado";
    pintarEstado();
  }

  function alternar() {
    if (estado === "tocando" || estado === "carregando") parar();
    else tocar();
  }

  function alternarMudo() {
    mudo = !mudo;
    audio.volume = mudo ? 0 : Number(volume.value);
    pintarEstado();
  }

  /* ---- metadados da faixa atual ----
     Dois formatos, porque os serviços não combinaram entre si:

     · Zeno.FM  → Server-Sent Events. Uma conexão fica aberta e o
                  servidor empurra a faixa nova assim que ela troca.
     · AzuraCast e afins → JSON por consulta periódica.

     Detectamos pelo endereço e usamos o caminho certo. Trocar de
     serviço depois não exige mexer aqui. */

  function aplicarFaixa(artista, titulo, capa) {
    window.VBViews.atualizarTocandoAgora({
      artista: artista || "Vinil Beer",
      titulo: titulo || "Ao vivo",
      capa: capa || "assets/img/placeholder-album.svg"
    });
  }

  /* O Zeno manda tudo numa string só: "Artista - Música".
     Nem sempre tem o hífen — quando não tem, o texto inteiro
     vira o título e evitamos inventar um artista. */
  function separarArtistaMusica(texto) {
    const partes = String(texto).split(" - ");
    if (partes.length < 2) return { artista: "", titulo: texto.trim() };
    return {
      artista: partes[0].trim(),
      titulo: partes.slice(1).join(" - ").trim()
    };
  }

  function escutarSSE(url) {
    let fonte;
    try {
      fonte = new EventSource(url);
    } catch (erro) {
      console.warn("Metadados ao vivo indisponíveis:", erro);
      return;
    }

    fonte.onmessage = (evento) => {
      try {
        const dados = JSON.parse(evento.data);
        const bruto = dados.streamTitle || dados.title;
        if (!bruto) return;
        const { artista, titulo } = separarArtistaMusica(bruto);
        aplicarFaixa(artista, titulo, null);
      } catch {
        /* Batimento de conexão ou linha vazia: ignorar sem alarde. */
      }
    };

    /* O EventSource reconecta sozinho. Só registramos, para não
       poluir o console a cada oscilação de rede. */
    fonte.onerror = () => console.debug("Metadados: reconectando…");
  }

  /* Monta a lista de recentes a partir do histórico do serviço.
     Se o formato vier diferente do esperado, saímos sem mexer em nada —
     é melhor mostrar a lista antiga do que uma lista quebrada. */
  function aplicarHistorico(historico, tocandoAgora) {
    if (!Array.isArray(historico) || !historico.length) return;

    const paraFaixa = (item) => ({
      artista: item.song.artist || "—",
      titulo: item.song.title || item.song.text || "—",
      capa: item.song.art || null,
      tocadaEm: new Date((item.played_at || 0) * 1000).toISOString()
    });

    try {
      const lista = [];
      if (tocandoAgora && tocandoAgora.song) lista.push(paraFaixa(tocandoAgora));
      historico.forEach((item) => { if (item && item.song) lista.push(paraFaixa(item)); });

      if (!lista.length) return;
      window.VB_DATA.playlist = lista;
      window.VBViews.remontarPlaylists();
    } catch (erro) {
      console.warn("Histórico em formato inesperado:", erro.message);
    }
  }

  async function consultarJSON(url) {
    try {
      const resposta = await fetch(url, { cache: "no-store" });
      if (!resposta.ok) return;
      const json = await resposta.json();

      /* Formato AzuraCast */
      const atual = json.now_playing && json.now_playing.song;
      if (!atual) return;
      aplicarFaixa(atual.artist, atual.title, atual.art);

      /* O AzuraCast também manda as últimas faixas tocadas. Aproveitamos
         para manter a "Playlist recente" viva sem depender de ninguém
         cadastrar nada à mão. */
      aplicarHistorico(json.song_history, json.now_playing);
    } catch (erro) {
      /* Falha de metadados nunca derruba o áudio. Segue tocando. */
      console.warn("Metadados indisponíveis:", erro.message);
    }
  }

  function iniciarMetadados() {
    const url = window.VB_CONFIG.nowPlayingUrl;
    if (!url) return;

    /* Detecta pelo formato do endereço, não pelo domínio: assim
       funciona também atrás de proxy ou domínio próprio. */
    const ehFluxoContinuo =
      url.includes("/mounts/metadata/subscribe") || url.includes("api.zeno.fm");

    if (ehFluxoContinuo) {
      escutarSSE(url);
      return;
    }

    consultarJSON(url);
    timerMetadados = setInterval(
      () => consultarJSON(url),
      window.VB_CONFIG.nowPlayingInterval
    );
  }

  /* ---- ligações ---- */
  function iniciar() {
    const temStream = Boolean(window.VB_CONFIG.streamUrl);

    if (!temStream) {
      btnPlay.disabled = true;
      escreverFaixa("Stream ainda não configurado");
      document.querySelectorAll("[data-play-trigger]").forEach((b) => (b.disabled = true));
    } else {
      escreverFaixa("Toque para ouvir");
    }

    /* Um só handler para todos os botões de play da página. */
    document.addEventListener("click", (evento) => {
      const gatilho = evento.target.closest("[data-play-trigger], #btn-play");
      if (gatilho && !gatilho.disabled) alternar();
    });

    btnMute.addEventListener("click", alternarMudo);

    volume.addEventListener("input", () => {
      mudo = Number(volume.value) === 0;
      audio.volume = Number(volume.value);
      pintarEstado();
    });

    audio.addEventListener("playing", () => { estado = "tocando"; pintarEstado(); });
    audio.addEventListener("waiting", () => { estado = "carregando"; pintarEstado(); });
    audio.addEventListener("error", () => {
      if (!audio.getAttribute("src")) return;   // ignora o load() do parar()
      estado = "erro";
      pintarEstado();
      escreverFaixa("O stream saiu do ar.");
    });

    audio.volume = Number(volume.value);
    pintarEstado();
    iniciarMetadados();
  }

  return { iniciar, escreverFaixa, alternar };
})();
