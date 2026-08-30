/* =========================================================
   Painel de administração.

   Autenticação e escrita usam o token da sessão. Quem decide o
   que cada um pode fazer é o banco, pelas políticas de segurança
   (RLS) — este arquivo não tem poder nenhum por si só. Esconder
   um botão aqui não protege nada; a proteção está no servidor.
   ========================================================= */
(function () {

  const cfg = window.VB_CONFIG;
  const CHAVE_SESSAO = "vb:sessao";

  let sessao = null;
  let dados = { programas: [], resenhas: [], playlist: [], recados: [], config: null };
  let filtroRecados = "pendente";

  /* ---------- utilidades ---------- */

  const $ = (sel) => document.querySelector(sel);

  function esc(t) {
    return String(t ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function dataBR(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  let timerAviso;
  function avisar(texto, tipo = "ok") {
    const el = $("#aviso");
    el.textContent = texto;
    el.className = `aviso visivel aviso--${tipo}`;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => el.classList.remove("visivel"), 3200);
  }

  /* ---------- comunicação com o banco ---------- */

  function cabecalhos(extras = {}) {
    return {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${sessao ? sessao.access_token : cfg.supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...extras
    };
  }

  async function api(caminho, opcoes = {}) {
    const resposta = await fetch(`${cfg.supabaseUrl}/rest/v1/${caminho}`, {
      ...opcoes,
      headers: cabecalhos(opcoes.headers)
    });

    if (resposta.status === 401 || resposta.status === 403) {
      throw new Error("Sem permissão. Confira se seu perfil está marcado como admin.");
    }
    if (!resposta.ok) {
      const detalhe = await resposta.text();
      throw new Error(detalhe.slice(0, 160) || `Erro ${resposta.status}`);
    }
    return resposta.status === 204 ? null : resposta.json();
  }

  const listar   = (tabela, params = {}) =>
    api(`${tabela}?${new URLSearchParams({ select: "*", ...params })}`);

  const inserir  = (tabela, corpo) =>
    api(tabela, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(corpo) });

  const atualizar = (tabela, id, corpo) =>
    api(`${tabela}?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(corpo) });

  const remover  = (tabela, id) =>
    api(`${tabela}?id=eq.${id}`, { method: "DELETE" });

  /* ---------- autenticação ---------- */

  async function entrar(email, senha) {
    const resposta = await fetch(`${cfg.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: cfg.supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha })
    });

    const json = await resposta.json();
    if (!resposta.ok) {
      throw new Error(json.error_description || json.msg || "E-mail ou senha incorretos.");
    }
    return json;
  }

  /* Confirma no banco que a conta tem permissão de admin. Se não
     tiver, não adianta mostrar o painel: toda escrita seria recusada. */
  async function conferirPermissao() {
    const perfis = await api(`perfis?select=admin&id=eq.${sessao.user.id}`);
    return Boolean(perfis[0] && perfis[0].admin);
  }

  function guardarSessao(s) {
    sessao = s;
    try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); } catch { /* modo privado */ }
  }

  function limparSessao() {
    sessao = null;
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch { /* nada */ }
  }

  function recuperarSessao() {
    try {
      const bruto = sessionStorage.getItem(CHAVE_SESSAO);
      if (!bruto) return null;
      const s = JSON.parse(bruto);
      /* Token expirado não serve para nada — melhor pedir login de novo
         do que deixar o usuário clicar em botões que vão todos falhar. */
      if (s.expires_at && s.expires_at * 1000 < Date.now()) return null;
      return s;
    } catch {
      return null;
    }
  }

  /* ---------- desenho das listas ---------- */

  function desenharProgramas() {
    const alvo = $("#lista-programas");
    if (!dados.programas.length) {
      alvo.innerHTML = '<p class="vazio">Nenhum programa cadastrado ainda.</p>';
      return;
    }

    alvo.innerHTML = dados.programas.map((p) => `
      <article class="item">
        <div class="item__principal">
          <h3 class="item__titulo">${esc(p.titulo)}
            ${p.ativo ? "" : '<span class="marca marca--off">inativo</span>'}
          </h3>
          <p class="item__meta">${esc(p.dias || "—")} · ${esc(p.horario || "—")} · ${esc(p.apresentador || "—")}</p>
          <p class="item__texto">${esc((p.descricao || "").slice(0, 130))}${(p.descricao || "").length > 130 ? "…" : ""}</p>
        </div>
        <div class="item__acoes">
          <button class="acao" type="button" data-editar="programa" data-id="${p.id}">Editar</button>
          <button class="acao acao--perigo" type="button" data-apagar="programas" data-id="${p.id}" data-nome="${esc(p.titulo)}">Apagar</button>
        </div>
      </article>`).join("");
  }

  function desenharResenhas() {
    const alvo = $("#lista-resenhas");
    if (!dados.resenhas.length) {
      alvo.innerHTML = '<p class="vazio">Nenhuma resenha ainda.</p>';
      return;
    }

    alvo.innerHTML = dados.resenhas.map((r) => {
      const publicada = r.publicada_em && new Date(r.publicada_em) <= new Date();
      return `
      <article class="item">
        <div class="item__principal">
          <h3 class="item__titulo">${esc(r.titulo)}
            <span class="marca ${publicada ? "marca--on" : "marca--off"}">${publicada ? "publicada" : "rascunho"}</span>
          </h3>
          <p class="item__meta">${publicada ? dataBR(r.publicada_em) : "não publicada"}</p>
          <p class="item__texto">${esc((r.resumo || "").slice(0, 130))}</p>
        </div>
        <div class="item__acoes">
          <button class="acao" type="button" data-editar="resenha" data-id="${r.id}">Editar</button>
          <button class="acao" type="button" data-publicar="${r.id}">${publicada ? "Despublicar" : "Publicar"}</button>
          <button class="acao acao--perigo" type="button" data-apagar="resenhas" data-id="${r.id}" data-nome="${esc(r.titulo)}">Apagar</button>
        </div>
      </article>`;
    }).join("");
  }

  function desenharPlaylist() {
    const alvo = $("#lista-playlist");
    if (!dados.playlist.length) {
      alvo.innerHTML = '<p class="vazio">Nenhuma faixa registrada.</p>';
      return;
    }

    alvo.innerHTML = dados.playlist.map((f, i) => `
      <article class="item item--compacto">
        <div class="item__principal">
          <h3 class="item__titulo">${esc(f.artista)} — ${esc(f.titulo)}
            ${i === 0 ? '<span class="marca marca--live">no ar</span>' : ""}
          </h3>
          <p class="item__meta">${dataBR(f.tocada_em)}</p>
        </div>
        <div class="item__acoes">
          <button class="acao acao--perigo" type="button" data-apagar="playlist" data-id="${f.id}" data-nome="${esc(f.titulo)}">Apagar</button>
        </div>
      </article>`).join("");
  }

  function desenharRecados() {
    const alvo = $("#lista-recados");
    const lista = dados.recados.filter((r) => r.status === filtroRecados);

    const pendentes = dados.recados.filter((r) => r.status === "pendente").length;
    const contador = $("#contador-recados");
    contador.textContent = pendentes;
    contador.hidden = pendentes === 0;

    if (!lista.length) {
      alvo.innerHTML = `<p class="vazio">Nenhum recado ${esc(filtroRecados)}.</p>`;
      return;
    }

    alvo.innerHTML = lista.map((r) => `
      <article class="item">
        <div class="item__principal">
          <h3 class="item__titulo">${esc(r.nome)}</h3>
          <p class="item__meta">${dataBR(r.criado_em)}</p>
          <p class="item__texto item__texto--recado">${esc(r.texto)}</p>
        </div>
        <div class="item__acoes">
          ${r.status !== "aprovado" ? `<button class="acao acao--ok" type="button" data-moderar="aprovado" data-id="${r.id}">Aprovar</button>` : ""}
          ${r.status !== "recusado" ? `<button class="acao acao--perigo" type="button" data-moderar="recusado" data-id="${r.id}">Recusar</button>` : ""}
        </div>
      </article>`).join("");
  }

  function preencherConfig() {
    const c = dados.config || {};
    $("#cfg-stream").value = c.stream_url || "";
    $("#cfg-nowplaying").value = c.now_playing_url || "";
    $("#cfg-sobre").value = c.sobre || "";

    const redes = c.redes || {};
    ["instagram", "youtube", "facebook", "tiktok", "whatsapp"].forEach((r) => {
      $(`#rede-${r}`).value = redes[r] || "";
    });
  }

  /* ---------- carga ---------- */

  async function carregarTudo() {
    const [programas, resenhas, playlist, recados, config] = await Promise.all([
      listar("programas", { order: "ordem.asc" }),
      listar("resenhas", { order: "criado_em.desc" }),
      listar("playlist", { order: "tocada_em.desc", limit: "60" }),
      listar("recados", { order: "criado_em.desc" }),
      listar("configuracoes", { id: "eq.1" })
    ]);

    dados = { programas, resenhas, playlist, recados, config: config[0] || null };

    desenharProgramas();
    desenharResenhas();
    desenharPlaylist();
    desenharRecados();
    preencherConfig();
  }

  /* ---------- janela de edição ---------- */

  /* Cada campo vira uma linha do formulário. `tipo` decide o controle. */
  const CAMPOS = {
    programa: [
      { nome: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true },
      { nome: "slug", rotulo: "Endereço (slug)", tipo: "text", obrigatorio: true, ajuda: "Só letras minúsculas e hífens. Ex.: resenha-de-quinta" },
      { nome: "dias", rotulo: "Dias (texto exibido)", tipo: "text", ajuda: "Ex.: Seg a Sex" },
      { nome: "horario", rotulo: "Horário (texto exibido)", tipo: "text", ajuda: "Ex.: 18h" },
      { nome: "apresentador", rotulo: "Apresentador", tipo: "text" },
      { nome: "descricao", rotulo: "Descrição", tipo: "textarea" },
      { nome: "capa_url", rotulo: "URL da capa", tipo: "url" },
      { nome: "ordem", rotulo: "Ordem de exibição", tipo: "number" },
      { nome: "grade_dias", rotulo: "Dias da grade real", tipo: "dias", ajuda: "Marque os dias para o selo NO AR funcionar" },
      { nome: "grade_inicio", rotulo: "Começa às", tipo: "time" },
      { nome: "grade_fim", rotulo: "Termina às", tipo: "time" },
      { nome: "ativo", rotulo: "Visível no site", tipo: "checkbox" }
    ],
    resenha: [
      { nome: "titulo", rotulo: "Título", tipo: "text", obrigatorio: true },
      { nome: "slug", rotulo: "Endereço (slug)", tipo: "text", obrigatorio: true },
      { nome: "resumo", rotulo: "Resumo", tipo: "textarea", ajuda: "Aparece no cartão da home" },
      { nome: "texto", rotulo: "Texto completo", tipo: "textarea", linhas: 8, ajuda: "Deixe uma linha em branco entre parágrafos" },
      { nome: "capa_url", rotulo: "URL da capa", tipo: "url" },
      { nome: "youtube_id", rotulo: "ID do vídeo no YouTube", tipo: "text" }
    ],
    faixa: [
      { nome: "artista", rotulo: "Artista", tipo: "text", obrigatorio: true },
      { nome: "titulo", rotulo: "Música", tipo: "text", obrigatorio: true },
      { nome: "capa_url", rotulo: "URL da capa", tipo: "url" }
    ]
  };

  const TABELA = { programa: "programas", resenha: "resenhas", faixa: "playlist" };
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  let edicao = { tipo: null, id: null };

  function abrirModal(tipo, registro = null) {
    edicao = { tipo, id: registro ? registro.id : null };

    $("#modal-titulo").textContent =
      (registro ? "Editar " : "Novo ") + { programa: "programa", resenha: "resenha", faixa: "faixa" }[tipo];

    const campos = CAMPOS[tipo].map((c) => {
      const valor = registro ? registro[c.nome] : "";
      const ajuda = c.ajuda ? `<p class="ajuda">${esc(c.ajuda)}</p>` : "";

      if (c.tipo === "textarea") {
        return `<div class="field">
          <label class="rotulo" for="c-${c.nome}">${esc(c.rotulo)}</label>
          <textarea class="input" id="c-${c.nome}" name="${c.nome}" rows="${c.linhas || 3}">${esc(valor)}</textarea>${ajuda}
        </div>`;
      }

      if (c.tipo === "checkbox") {
        const marcado = registro ? (valor ? "checked" : "") : "checked";
        return `<div class="field field--linha">
          <input type="checkbox" id="c-${c.nome}" name="${c.nome}" ${marcado}>
          <label class="rotulo" for="c-${c.nome}">${esc(c.rotulo)}</label>${ajuda}
        </div>`;
      }

      if (c.tipo === "dias") {
        const marcados = Array.isArray(valor) ? valor : [];
        const caixas = DIAS.map((d, i) => `
          <label class="dia">
            <input type="checkbox" name="grade_dias" value="${i}" ${marcados.includes(i) ? "checked" : ""}>
            <span>${d}</span>
          </label>`).join("");
        return `<div class="field">
          <span class="rotulo">${esc(c.rotulo)}</span>
          <div class="dias">${caixas}</div>${ajuda}
        </div>`;
      }

      return `<div class="field">
        <label class="rotulo" for="c-${c.nome}">${esc(c.rotulo)}</label>
        <input class="input" id="c-${c.nome}" name="${c.nome}" type="${c.tipo}" value="${esc(valor)}"
               ${c.obrigatorio ? "required" : ""}>${ajuda}
      </div>`;
    }).join("");

    $("#modal-form").innerHTML = `
      ${campos}
      <p class="form__error" id="modal-erro" role="alert" hidden></p>
      <div class="modal__acoes">
        <button class="btn btn--fantasma" type="button" data-fechar-modal>Cancelar</button>
        <button class="btn" type="submit">Salvar</button>
      </div>`;

    $("#modal").hidden = false;
    document.body.classList.add("com-modal");
    $("#modal-form").querySelector("input, textarea")?.focus();
  }

  function fecharModal() {
    $("#modal").hidden = true;
    document.body.classList.remove("com-modal");
    edicao = { tipo: null, id: null };
  }

  function lerFormulario(tipo) {
    const form = $("#modal-form");
    const corpo = {};

    CAMPOS[tipo].forEach((c) => {
      if (c.tipo === "dias") {
        const marcados = [...form.querySelectorAll('input[name="grade_dias"]:checked')]
          .map((el) => Number(el.value));
        corpo.grade_dias = marcados.length ? marcados : null;
        return;
      }

      const el = form.querySelector(`[name="${c.nome}"]`);
      if (!el) return;

      if (c.tipo === "checkbox")      corpo[c.nome] = el.checked;
      else if (c.tipo === "number")   corpo[c.nome] = el.value === "" ? 0 : Number(el.value);
      /* Campo de texto vazio vira null, não string vazia: o banco
         distingue "sem valor" de "valor em branco", e o site também. */
      else                            corpo[c.nome] = el.value.trim() || null;
    });

    return corpo;
  }

  /* ---------- eventos ---------- */

  function ligarLogin() {
    $("#form-login").addEventListener("submit", async (e) => {
      e.preventDefault();

      const erro = $("#login-erro");
      const botao = $("#login-enviar");
      erro.hidden = true;
      botao.disabled = true;
      botao.textContent = "Entrando...";

      try {
        guardarSessao(await entrar($("#email").value.trim(), $("#senha").value));

        if (!await conferirPermissao()) {
          limparSessao();
          throw new Error("Esta conta não tem permissão de administrador.");
        }

        await mostrarPainel();
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
      } finally {
        botao.disabled = false;
        botao.textContent = "Entrar";
      }
    });

    $("#sair").addEventListener("click", () => {
      limparSessao();
      location.reload();
    });
  }

  function ligarAbas() {
    $("#abas").addEventListener("click", (e) => {
      const aba = e.target.closest("[data-aba]");
      if (!aba) return;

      document.querySelectorAll(".aba").forEach((a) => a.classList.toggle("is-ativa", a === aba));
      document.querySelectorAll(".secao").forEach((s) => {
        s.hidden = s.dataset.secao !== aba.dataset.aba;
      });
    });

    $("#filtros-recados").addEventListener("click", (e) => {
      const botao = e.target.closest("[data-status]");
      if (!botao) return;
      filtroRecados = botao.dataset.status;
      document.querySelectorAll(".filtro").forEach((f) => f.classList.toggle("is-ativo", f === botao));
      desenharRecados();
    });
  }

  function ligarAcoes() {
    document.addEventListener("click", async (e) => {
      const alvo = e.target;

      if (alvo.closest("[data-fechar-modal]")) { fecharModal(); return; }

      /* novo registro */
      const novo = alvo.closest("[data-novo]");
      if (novo) { abrirModal(novo.dataset.novo); return; }

      /* editar */
      const editar = alvo.closest("[data-editar]");
      if (editar) {
        const tipo = editar.dataset.editar;
        const lista = dados[TABELA[tipo]];
        abrirModal(tipo, lista.find((x) => x.id === editar.dataset.id));
        return;
      }

      /* publicar / despublicar */
      const publicar = alvo.closest("[data-publicar]");
      if (publicar) {
        const r = dados.resenhas.find((x) => x.id === publicar.dataset.publicar);
        const jaPublicada = r.publicada_em && new Date(r.publicada_em) <= new Date();
        try {
          await atualizar("resenhas", r.id, { publicada_em: jaPublicada ? null : new Date().toISOString() });
          avisar(jaPublicada ? "Resenha despublicada" : "Resenha publicada");
          await carregarTudo();
        } catch (falha) { avisar(falha.message, "erro"); }
        return;
      }

      /* moderar recado */
      const moderar = alvo.closest("[data-moderar]");
      if (moderar) {
        try {
          await atualizar("recados", moderar.dataset.id, { status: moderar.dataset.moderar });
          avisar(moderar.dataset.moderar === "aprovado" ? "Recado aprovado" : "Recado recusado");
          await carregarTudo();
        } catch (falha) { avisar(falha.message, "erro"); }
        return;
      }

      /* apagar */
      const apagar = alvo.closest("[data-apagar]");
      if (apagar) {
        if (!confirm(`Apagar "${apagar.dataset.nome}"? Isto não pode ser desfeito.`)) return;
        try {
          await remover(apagar.dataset.apagar, apagar.dataset.id);
          avisar("Registro apagado");
          await carregarTudo();
        } catch (falha) { avisar(falha.message, "erro"); }
      }
    });

    /* salvar do formulário em janela */
    $("#modal-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const erro = $("#modal-erro");
      erro.hidden = true;

      const corpo = lerFormulario(edicao.tipo);
      const tabela = TABELA[edicao.tipo];

      try {
        if (edicao.id) await atualizar(tabela, edicao.id, corpo);
        else           await inserir(tabela, corpo);

        fecharModal();
        avisar("Salvo com sucesso");
        await carregarTudo();
      } catch (falha) {
        erro.textContent = falha.message;
        erro.hidden = false;
      }
    });

    /* configurações */
    $("#form-config").addEventListener("submit", async (e) => {
      e.preventDefault();

      const redes = {};
      ["instagram", "youtube", "facebook", "tiktok", "whatsapp"].forEach((r) => {
        const v = $(`#rede-${r}`).value.trim();
        if (v) redes[r] = v;
      });

      try {
        await atualizar("configuracoes", 1, {
          stream_url: $("#cfg-stream").value.trim() || null,
          now_playing_url: $("#cfg-nowplaying").value.trim() || null,
          sobre: $("#cfg-sobre").value.trim() || null,
          redes,
          atualizado_em: new Date().toISOString()
        });
        avisar("Configurações salvas");
        await carregarTudo();
      } catch (falha) {
        avisar(falha.message, "erro");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#modal").hidden) fecharModal();
    });
  }

  /* ---------- partida ---------- */

  async function mostrarPainel() {
    $("#tela-login").hidden = true;
    $("#tela-painel").hidden = false;
    $("#usuario-email").textContent = sessao.user.email;
    await carregarTudo();
  }

  async function iniciar() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      document.body.innerHTML =
        '<p style="padding:40px;font-family:sans-serif;color:#f4efe4">' +
        'O painel precisa do Supabase configurado em js/config.js.</p>';
      return;
    }

    ligarLogin();
    ligarAbas();
    ligarAcoes();

    const salva = recuperarSessao();
    if (!salva) return;

    sessao = salva;
    try {
      if (await conferirPermissao()) await mostrarPainel();
      else limparSessao();
    } catch {
      limparSessao();   /* token inválido: volta para o login */
    }
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
