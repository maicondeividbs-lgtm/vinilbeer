/* =========================================================
   Interações e movimento.
   Princípio: nenhuma animação decorativa. Cada movimento aqui
   comunica um estado (algo tocando, algo salvo, há mais conteúdo
   à direita) ou orienta o olho. Tudo respeita prefers-reduced-motion.
   ========================================================= */
window.VBUI = (function () {

  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. Revelar ao rolar ----
     Seções sobem levemente ao entrar na tela. Serve para dar ritmo
     à página longa da home e sinalizar "tem mais coisa aqui embaixo". */
  function revelarAoRolar() {
    const alvos = document.querySelectorAll("[data-revelar]");

    if (semMovimento || !("IntersectionObserver" in window)) {
      alvos.forEach((el) => el.classList.add("revelado"));
      return;
    }

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("revelado");
        observador.unobserve(entrada.target);   // anima uma vez só
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    alvos.forEach((el) => observador.observe(el));
  }

  /* Telas novas (SPA) precisam ser reveladas na hora: o observador
     não dispara para o que já está na viewport quando a tela troca. */
  function revelarTelaAtual() {
    document.querySelectorAll(".view:not([hidden]) [data-revelar]").forEach((el) => {
      const caixa = el.getBoundingClientRect();
      if (caixa.top < window.innerHeight) el.classList.add("revelado");
    });
  }

  /* ---- 2. Carrossel ----
     Três melhorias de uso: arrastar com o mouse, setas que se apagam
     quando não há mais para onde ir, e sombra na borda indicando
     que o conteúdo continua. */
  function ligarCarrossel() {
    document.querySelectorAll(".carousel").forEach((carrossel) => {
      const trilho = carrossel.querySelector("[data-scroller]");
      if (!trilho) return;

      const anterior = carrossel.querySelector('[data-scroll="-1"]');
      const proximo  = carrossel.querySelector('[data-scroll="1"]');

      function atualizarBordas() {
        const noInicio = trilho.scrollLeft <= 4;
        const noFim = trilho.scrollLeft >= trilho.scrollWidth - trilho.clientWidth - 4;

        carrossel.classList.toggle("tem-antes", !noInicio);
        carrossel.classList.toggle("tem-depois", !noFim);
        if (anterior) anterior.disabled = noInicio;
        if (proximo)  proximo.disabled  = noFim;
      }

      trilho.addEventListener("scroll", atualizarBordas, { passive: true });
      window.addEventListener("resize", atualizarBordas);
      atualizarBordas();

      /* Arrastar com o mouse. No celular o toque já faz isso nativamente. */
      let arrastando = false, xInicial = 0, scrollInicial = 0, moveu = false;

      trilho.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "touch") return;
        arrastando = true;
        moveu = false;
        xInicial = e.clientX;
        scrollInicial = trilho.scrollLeft;
        trilho.classList.add("arrastando");
      });

      trilho.addEventListener("pointermove", (e) => {
        if (!arrastando) return;
        const delta = e.clientX - xInicial;
        if (Math.abs(delta) > 4) moveu = true;
        trilho.scrollLeft = scrollInicial - delta;
      });

      function soltar() {
        if (!arrastando) return;
        arrastando = false;
        trilho.classList.remove("arrastando");
      }
      trilho.addEventListener("pointerup", soltar);
      trilho.addEventListener("pointerleave", soltar);

      /* Impede que o arrasto vire clique no card e navegue sem querer. */
      trilho.addEventListener("click", (e) => {
        if (moveu) { e.preventDefault(); e.stopPropagation(); }
      }, true);
    });
  }

  /* ---- 3. Voltar ao topo ----
     A home é longa. Aparece depois de uma tela e meia de rolagem. */
  function ligarVoltarAoTopo() {
    const botao = document.getElementById("ao-topo");
    if (!botao) return;

    let pendente = false;
    window.addEventListener("scroll", () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        botao.classList.toggle("visivel", window.scrollY > window.innerHeight * 0.9);
        pendente = false;
      });
    }, { passive: true });

    botao.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: semMovimento ? "instant" : "smooth" });
    });
  }

  /* ---- 4. Avisos ----
     Confirmação curta de ação (favoritou, copiou, enviou). Vive no
     canto e some sozinho. Anunciado a leitores de tela via aria-live. */
  let timerAviso = null;
  function avisar(mensagem) {
    const caixa = document.getElementById("aviso");
    if (!caixa) return;

    caixa.textContent = mensagem;
    caixa.classList.add("visivel");

    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => caixa.classList.remove("visivel"), 2600);
  }

  /* ---- 5. Filtro da playlist ----
     Busca por artista ou música. Numa lista que vai crescer muito
     quando vier do banco, isso deixa de ser luxo. */
  function ligarFiltroPlaylist() {
    const campo = document.getElementById("filtro-playlist");
    const lista = document.getElementById("playlist-completa");
    const vazio = document.getElementById("playlist-vazia");
    if (!campo || !lista) return;

    campo.addEventListener("input", () => {
      const termo = campo.value.trim().toLowerCase();
      let visiveis = 0;

      lista.querySelectorAll(".playlist__item").forEach((item) => {
        const texto = item.dataset.busca || "";
        const combina = !termo || texto.includes(termo);
        item.hidden = !combina;
        if (combina) visiveis++;
      });

      if (vazio) vazio.hidden = visiveis > 0;
    });
  }

  /* ---- 6. Cabeçalho ao rolar ----
     Ganha sombra e fundo mais sólido, para não competir com o
     conteúdo que passa por baixo. */
  function ligarCabecalho() {
    const cabecalho = document.querySelector(".header");
    let pendente = false;

    window.addEventListener("scroll", () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        cabecalho.classList.toggle("rolado", window.scrollY > 20);
        pendente = false;
      });
    }, { passive: true });
  }

  /* ---- 7. Teclado ----
     Barra de espaço dá play/pause, como em qualquer player.
     Ignora quando o foco está num campo de texto. */
  function ligarAtalhos() {
    document.addEventListener("keydown", (e) => {
      const digitando = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (digitando) return;

      if (e.code === "Space") {
        e.preventDefault();
        window.VBPlayer.alternar();
      }
    });
  }

  function iniciar() {
    revelarAoRolar();
    ligarCarrossel();
    ligarVoltarAoTopo();
    ligarFiltroPlaylist();
    ligarCabecalho();
    ligarAtalhos();
  }

  return { iniciar, avisar, revelarTelaAtual, semMovimento };
})();
