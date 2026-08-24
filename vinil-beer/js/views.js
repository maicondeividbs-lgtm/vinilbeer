/* =========================================================
   Renderização.
   Toda montagem de HTML a partir de dados acontece aqui.
   ========================================================= */
window.VBViews = (function () {

  const D = () => window.VB_DATA;

  /* ---- helpers ---- */

  /* Escapa texto antes de injetar no HTML. Vira obrigatório quando o
     conteúdo passar a vir do banco, porque aí é digitado por pessoas. */
  function esc(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function tempoAtras(iso) {
    const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seg < 60)      return "agora";
    if (seg < 3600)    { const n = Math.floor(seg / 60);     return `${n} min atrás`; }
    if (seg < 86400)   { const n = Math.floor(seg / 3600);   return `${n} ${n === 1 ? "hora" : "horas"} atrás`; }
    if (seg < 604800)  { const n = Math.floor(seg / 86400);  return `${n} ${n === 1 ? "dia" : "dias"} atrás`; }
    if (seg < 2592000) { const n = Math.floor(seg / 604800); return `${n} ${n === 1 ? "semana" : "semanas"} atrás`; }
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  const ICONES = {
    lupa:       '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    microfone:  '<rect x="9" y="2" width="6" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 11a7 7 0 0014 0M12 18v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    aviao:      '<path d="M21 3L3 10l7 3 3 7 8-17z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    coracao:    '<path d="M12 20s-7-4.5-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.5-7 9-7 9z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
    play:       '<path d="M8 5v14l11-7z" fill="currentColor"/>',
    instagram:  '<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/>',
    youtube:    '<rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 9.2l5 2.8-5 2.8z" fill="currentColor"/>',
    facebook:   '<path d="M14 8h2.5V4.5H14A4 4 0 0010 8.5V11H7.5v3.5H10V21h3.5v-6.5H16L16.5 11H13.5V8.8c0-.5.3-.8.5-.8z" fill="currentColor"/>',
    tiktok:     '<path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 3c.6 2.6 2.3 4.2 5 4.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    whatsapp:   '<path d="M3.5 20.5l1.3-4.3A8 8 0 1112 20a8 8 0 01-4.1-1.1l-4.4 1.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
  };

  const svg = (nome, classe = "") =>
    `<svg class="${classe}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ""}</svg>`;

  /* ---- blocos ---- */

  function cartaoPrograma(p, comDescricao = false) {
    return `
      <a class="card-program" href="/programacao/${esc(p.slug)}" data-link>
        <div class="card-program__cover" style="background-image:url('${esc(p.capa)}')"
             role="img" aria-label="Capa do programa ${esc(p.titulo)}"></div>
        <div class="card-program__body">
          <h3 class="card-program__title">${esc(p.titulo)}</h3>
          <p class="card-program__time">${esc(p.dias)} &middot; ${esc(p.horario)}</p>
          <p class="card-program__host">${esc(p.apresentador)}</p>
          ${comDescricao ? `<p class="card-program__desc">${esc(p.descricao)}</p>` : ""}
        </div>
      </a>`;
  }

  function cartaoResenha(r) {
    return `
      <li>
        <a class="card-post" href="/noticias/${esc(r.slug)}" data-link>
          <div class="card-post__cover" style="background-image:url('${esc(r.capa)}')"
               role="img" aria-label="Capa da resenha ${esc(r.titulo)}"></div>
          <div class="card-post__body">
            <h3 class="card-post__title">${esc(r.titulo)}</h3>
            <p class="card-post__date">${tempoAtras(r.publicadaEm)}</p>
          </div>
        </a>
      </li>`;
  }

  function itemPlaylist(faixa, indice) {
    return `
      <li class="playlist__item">
        <span class="playlist__badge">${svg("play")}</span>
        <p class="playlist__text">
          <span class="playlist__artist">${esc(faixa.artista)}</span>
          <span class="playlist__sep">&middot;</span>
          <span class="playlist__title">${esc(faixa.titulo)}</span>
        </p>
        <span class="playlist__time">${tempoAtras(faixa.tocadaEm)}</span>
        <button class="playlist__like" type="button" data-like="${indice}" aria-pressed="false">
          <span class="sr-only">Favoritar ${esc(faixa.titulo)}</span>
          ${svg("coracao")}
        </button>
      </li>`;
  }

  /* ---- montagem inicial (roda uma vez) ---- */

  function montarHome() {
    document.getElementById("programas-home").innerHTML =
      D().programas.map((p) => `<li class="carousel__item">${cartaoPrograma(p)}</li>`).join("");

    document.getElementById("playlist-home").innerHTML =
      D().playlist.slice(0, 5).map(itemPlaylist).join("");

    document.getElementById("resenhas-home").innerHTML =
      D().resenhas.map(cartaoResenha).join("");

    document.getElementById("features").innerHTML = D().destaques.map((d) => `
      <li class="feature">
        ${svg(d.icone, "feature__icon")}
        <div>
          <p class="feature__title">${esc(d.titulo)}</p>
          <p class="feature__caption">${esc(d.legenda)}</p>
        </div>
      </li>`).join("");

    atualizarTocandoAgora(D().tocandoAgora);
  }

  function montarPaginasFixas() {
    document.getElementById("programas-todos").innerHTML =
      D().programas.map((p) => `<li>${cartaoPrograma(p, true)}</li>`).join("");

    document.getElementById("playlist-completa").innerHTML =
      D().playlist.map(itemPlaylist).join("");

    document.getElementById("resenhas-todas").innerHTML =
      D().resenhas.map(cartaoResenha).join("");

    document.querySelectorAll("[data-about-text]").forEach((el) => {
      el.textContent = D().sobre;
    });

    const social = window.VB_CONFIG.social;
    const nomes = { instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", tiktok: "TikTok", whatsapp: "WhatsApp" };
    document.getElementById("social").innerHTML = Object.keys(nomes)
      .filter((chave) => social[chave])
      .map((chave) => `
        <li><a href="${esc(social[chave])}" target="_blank" rel="noreferrer">
          <span class="sr-only">${nomes[chave]}</span>${svg(chave)}
        </a></li>`).join("");

    document.querySelector("[data-ano]").textContent = new Date().getFullYear();
  }

  /* ---- telas de detalhe (montadas sob demanda) ---- */

  function montarPrograma(slug) {
    const p = D().programas.find((x) => x.slug === slug);
    const alvo = document.getElementById("programa-detalhe");
    if (!p) return false;

    alvo.innerHTML = `
      <p class="eyebrow eyebrow--gold">${esc(p.dias)} &middot; ${esc(p.horario)}</p>
      <h1 class="page-title" style="margin-top:10px">${esc(p.titulo)}</h1>
      <div class="prose">
        <p>${esc(p.descricao)}</p>
        <p style="color:var(--ash-dim);font-size:13px">Apresentação: ${esc(p.apresentador)}</p>
      </div>
      <p style="margin-top:28px"><a class="link-more" href="/programacao" data-link>&larr; toda a programação</a></p>`;
    document.title = `${p.titulo} | Vinil Beer`;
    return true;
  }

  function montarResenha(slug) {
    const r = D().resenhas.find((x) => x.slug === slug);
    const alvo = document.getElementById("resenha-detalhe");
    if (!r) return false;

    const paragrafos = r.texto.split("\n\n").map((t) => `<p>${esc(t)}</p>`).join("");
    alvo.innerHTML = `
      <p class="eyebrow eyebrow--gold">${tempoAtras(r.publicadaEm)}</p>
      <h1 class="page-title" style="margin-top:10px;max-width:700px">${esc(r.titulo)}</h1>
      <div class="prose">${paragrafos}</div>
      <p style="margin-top:28px"><a class="link-more" href="/noticias" data-link>&larr; todas as resenhas</a></p>`;
    document.title = `${r.titulo} | Vinil Beer`;
    return true;
  }

  /* ---- tocando agora ---- */

  function atualizarTocandoAgora(faixa) {
    const arte   = document.querySelector("[data-np-art]");
    const artista = document.querySelector("[data-np-artist]");
    const titulo  = document.querySelector("[data-np-title]");

    if (arte)    arte.src = faixa.capa || "assets/img/placeholder-album.svg";
    if (artista) artista.textContent = faixa.artista;
    if (titulo)  titulo.textContent = faixa.titulo;

    if (document.body.classList.contains("is-live")) {
      window.VBPlayer.escreverFaixa(`${faixa.artista} — ${faixa.titulo}`);
    }
  }

  /* ---- onda sonora ----
     Alturas fixas, não reativas. Ler o áudio de verdade exige
     AnalyserNode, que precisa de CORS liberado no servidor de
     streaming — só dá para configurar quando o stream existir. */
  function montarOndas() {
    const ALTURAS = [8,16,26,14,32,20,38,24,12,30,18,34,22,40,16,28,10,36,20,14,
                     26,32,18,24,12,30,16,38,22,10,34,20,28,14,24,18,32,12,26,16];
    document.querySelectorAll("[data-wave]").forEach((onda) => {
      const grande = onda.classList.contains("wave--lg");
      const alturas = grande ? ALTURAS : ALTURAS.slice(0, 24);
      const max = grande ? 40 : 26;
      onda.innerHTML = alturas
        .map((h) => `<span class="wave__bar" style="height:${Math.min(h, max)}px"></span>`)
        .join("");
    });
  }

  return {
    montarHome,
    montarPaginasFixas,
    montarPrograma,
    montarResenha,
    montarOndas,
    atualizarTocandoAgora,
    esc
  };
})();
