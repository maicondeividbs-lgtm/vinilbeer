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

  /* ---- metadados da faixa atual ---- */
  async function buscarFaixaAtual() {
    const url = window.VB_CONFIG.nowPlayingUrl;
    if (!url) return;

    try {
      const resposta = await fetch(url, { cache: "no-store" });
      if (!resposta.ok) return;
      const json = await resposta.json();

      /* Formato do Azuracast. Outro serviço = ajustar só estas duas linhas. */
      const atual = json.now_playing && json.now_playing.song;
      if (!atual) return;

      window.VBViews.atualizarTocandoAgora({
        artista: atual.artist || "—",
        titulo: atual.title || "—",
        capa: atual.art || "assets/img/placeholder-album.svg"
      });
    } catch (erro) {
      /* Falha de metadados nunca derruba o áudio. Segue tocando. */
      console.warn("Metadados indisponíveis:", erro);
    }
  }

  function iniciarMetadados() {
    if (!window.VB_CONFIG.nowPlayingUrl) return;
    buscarFaixaAtual();
    timerMetadados = setInterval(buscarFaixaAtual, window.VB_CONFIG.nowPlayingInterval);
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
