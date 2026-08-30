/* =========================================================
   Inicialização e interações soltas.
   Este é o último script a rodar: tudo já existe quando ele age.
   ========================================================= */
(function () {

  /* ---- menu mobile ---- */
  function ligarMenu() {
    const botao = document.getElementById("burger");
    const menu  = document.getElementById("nav-mobile");

    botao.addEventListener("click", () => {
      const aberto = menu.hidden;
      menu.hidden = !aberto;
      botao.setAttribute("aria-expanded", String(aberto));
      botao.querySelector(".sr-only").textContent = aberto ? "Fechar menu" : "Abrir menu";
    });
  }

  /* ---- setas do carrossel ---- */
  function ligarSetas() {
    document.querySelectorAll("[data-scroll]").forEach((botao) => {
      botao.addEventListener("click", () => {
        const trilho = botao.closest(".carousel").querySelector("[data-scroller]");
        trilho.scrollBy({
          left: Number(botao.dataset.scroll) * trilho.clientWidth * 0.8,
          behavior: window.VBUI.semMovimento ? "auto" : "smooth"
        });
      });
    });
  }

  /* ---- favoritar faixa ----
     Guardado só no navegador por enquanto. Quando houver login,
     vira um registro na tabela `favoritos`. */
  function ligarFavoritos() {
    const CHAVE = "vb:favoritos";
    let salvos = [];
    try { salvos = JSON.parse(localStorage.getItem(CHAVE)) || []; } catch { salvos = []; }

    function pintar() {
      document.querySelectorAll("[data-like]").forEach((botao) => {
        const id = botao.dataset.like;
        const ativo = salvos.includes(id);
        botao.classList.toggle("is-liked", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
      });
    }

    document.addEventListener("click", (evento) => {
      const botao = evento.target.closest("[data-like]");
      if (!botao) return;

      const id = botao.dataset.like;
      salvos = salvos.includes(id) ? salvos.filter((x) => x !== id) : [...salvos, id];

      try { localStorage.setItem(CHAVE, JSON.stringify(salvos)); } catch { /* modo privado */ }
      pintar();

      const titulo = botao.closest(".playlist__item").querySelector(".playlist__title").textContent;
      window.VBUI.avisar(salvos.includes(id) ? `${titulo} salva nos favoritos` : `${titulo} removida dos favoritos`);
    });

    pintar();
  }

  /* ---- formulário de recados ---- */
  function ligarFormulario() {
    const form   = document.getElementById("form-recado");
    const erro   = document.getElementById("form-erro");
    const enviar = document.getElementById("form-submit");
    const cartao = document.getElementById("form-card");

    form.addEventListener("submit", async (evento) => {
      evento.preventDefault();

      const nome   = form.nome.value.trim();
      const recado = form.recado.value.trim();

      if (!nome || !recado) {
        erro.textContent = "Preencha o nome e o recado para enviar.";
        erro.hidden = false;
        (nome ? form.recado : form.nome).focus();
        return;
      }

      erro.hidden = true;
      enviar.disabled = true;
      enviar.textContent = "Enviando...";

      try {
        await window.VBApi.enviarRecado(nome, recado);

        cartao.innerHTML = `
          <div class="form-ok">
            <p class="form-ok__title">Recado enviado</p>
            <p class="form-ok__text">A equipe lê todos antes de colocar no ar.</p>
            <button class="form-ok__again" type="button" id="novo-recado">Mandar outro</button>
          </div>`;

        window.VBUI.avisar("Recado enviado com sucesso");

        document.getElementById("novo-recado").addEventListener("click", () => {
          location.reload();
        });
      } catch {
        erro.textContent = "Não foi possível enviar agora. Tente de novo em instantes.";
        erro.hidden = false;
        enviar.disabled = false;
        enviar.textContent = "Enviar recado";
      }
    });
  }

  /* ---- partida ----
     Ordem importa: buscamos os dados primeiro, montamos a tela depois.
     Se o banco não responder, VBApi devolve os dados locais e a
     sequência segue igual — o visitante não percebe diferença. */
  document.addEventListener("DOMContentLoaded", async () => {
    document.body.classList.add("carregando");

    try {
      const { origem } = await window.VBApi.carregar();
      console.info("Dados carregados de:", origem);
    } catch (erro) {
      console.warn("Carga de dados falhou por completo:", erro);
    }

    document.body.classList.remove("carregando");

    window.VBViews.montarOndas();
    window.VBViews.montarHome();
    window.VBViews.montarPaginasFixas();

    window.VBPlayer.iniciar();
    window.VBRouter.iniciar();

    window.VBUI.iniciar();

    ligarMenu();
    ligarSetas();
    ligarFavoritos();
    ligarFormulario();

    window.VBApi.acompanharPlaylist();
  });
})();
