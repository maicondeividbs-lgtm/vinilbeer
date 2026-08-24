/* =========================================================
   Roteador.
   Troca a tela sem recarregar a página. É isso que mantém o
   <audio> vivo quando o ouvinte navega pelo menu.
   Depende do arquivo vercel.json, que manda toda URL para o
   index.html — sem ele, dar F5 em /playlist daria 404.
   ========================================================= */
window.VBRouter = (function () {

  const TITULOS = {
    "home":        "Vinil Beer — a rádio que toca clássicos e boas histórias",
    "programacao": "Programação | Vinil Beer",
    "playlist":    "Playlist | Vinil Beer",
    "noticias":    "Notícias e resenhas | Vinil Beer",
    "sobre":       "Sobre | Vinil Beer",
    "contato":     "Contato | Vinil Beer",
    "404":         "Página não encontrada | Vinil Beer"
  };

  function mostrar(nome) {
    document.querySelectorAll(".view").forEach((view) => {
      view.hidden = view.dataset.view !== nome;
    });
  }

  function marcarMenu(caminho) {
    document.querySelectorAll(".nav__link, .nav-mobile__link").forEach((link) => {
      const href = link.getAttribute("href");
      const ativo = href === "/" ? caminho === "/" : caminho.startsWith(href);
      link.classList.toggle("is-active", ativo);
      if (ativo) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function resolver(caminho) {
    const partes = caminho.replace(/^\/|\/$/g, "").split("/").filter(Boolean);

    if (partes.length === 0) return { view: "home" };

    const [primeira, segunda] = partes;

    if (primeira === "programacao") {
      if (!segunda) return { view: "programacao" };
      return window.VBViews.montarPrograma(segunda)
        ? { view: "programa", titulo: document.title }
        : { view: "404" };
    }

    if (primeira === "noticias") {
      if (!segunda) return { view: "noticias" };
      return window.VBViews.montarResenha(segunda)
        ? { view: "resenha", titulo: document.title }
        : { view: "404" };
    }

    if (["playlist", "sobre", "contato"].includes(primeira) && !segunda) {
      return { view: primeira };
    }

    return { view: "404" };
  }

  function navegar(caminho, comHistorico = true) {
    const { view, titulo } = resolver(caminho);

    mostrar(view);
    marcarMenu(caminho);
    document.title = titulo || TITULOS[view] || TITULOS["404"];

    if (comHistorico) history.pushState({}, "", caminho);
    window.scrollTo({ top: 0, behavior: "instant" });

    /* Leitores de tela precisam ser avisados de que a tela mudou —
       numa SPA o navegador não anuncia isso sozinho. */
    document.getElementById("conteudo").focus({ preventScroll: true });
  }

  function iniciar() {
    /* Intercepta cliques em qualquer link interno marcado com data-link */
    document.addEventListener("click", (evento) => {
      const link = evento.target.closest("a[data-link]");
      if (!link) return;
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;

      evento.preventDefault();
      const destino = link.getAttribute("href");
      if (destino !== location.pathname) navegar(destino);

      /* Fecha o menu mobile ao trocar de tela */
      const menu = document.getElementById("nav-mobile");
      if (!menu.hidden) {
        menu.hidden = true;
        document.getElementById("burger").setAttribute("aria-expanded", "false");
      }
    });

    /* Botões voltar / avançar do navegador */
    window.addEventListener("popstate", () => navegar(location.pathname, false));

    navegar(location.pathname, false);
  }

  return { iniciar, navegar };
})();
