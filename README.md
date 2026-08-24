# Vinil Beer — Rádio Web

Site e rádio online da Vinil Beer. HTML, CSS e JavaScript puros — sem build, sem dependências, sem instalação.

## Como abrir

Dê duplo clique no `index.html`. Abre no navegador e funciona.

Uma ressalva: abrindo assim (via `file://`), a navegação pelo menu não funciona, porque o roteador usa endereços de verdade (`/playlist`, `/noticias`). Isso é normal e resolve sozinho quando o site estiver na Vercel. Para ver a home e o visual geral, o duplo clique basta.

## Estrutura

```
index.html          Todas as telas do site
vercel.json         Manda toda URL para o index.html (essencial para a navegação)
robots.txt
css/
  style.css         Folha única, dividida em 19 blocos comentados
js/
  config.js         ⭐ Stream, redes sociais, chaves — o que você vai editar
  data.js           ⭐ Programas, playlist, resenhas — o conteúdo
  player.js         Player de áudio
  views.js          Monta as listas na tela
  router.js         Troca de tela sem recarregar
  main.js           Liga tudo
assets/img/         Capas e ícones
supabase/schema.sql Banco de dados (fase futura)
```

Os dois arquivos com ⭐ são os que você mexe no dia a dia. O resto é motor.

## Decisões que valem saber

**Por que uma página só, e não seis arquivos HTML.** Se cada seção fosse um `.html` separado, o áudio cortaria toda vez que alguém clicasse no menu — o navegador destrói a página anterior. Numa rádio isso é inaceitável. Aqui existe um único `<audio>`, fora das telas, que nunca é destruído.

**Por que "pausar" desliga a fonte em vez de pausar.** Numa transmissão ao vivo, pausar de verdade faria o buffer continuar acumulando; ao voltar, o ouvinte estaria atrasado em relação ao que está no ar. Por isso o botão descarrega e reconecta.

**Por que a onda sonora não reage ao áudio.** Ler o áudio de verdade exige `AnalyserNode`, que precisa de CORS liberado no servidor de streaming. Só dá para configurar depois que o stream existir. Por ora ela só muda de cor quando está tocando.

## O que falta

1. **Stream de áudio.** Sem ele o botão de play aparece desabilitado com o aviso "Stream ainda não configurado" — nada quebra. Quando o serviço for escolhido, preencha `streamUrl` em `js/config.js`.
2. **Logo oficial.** Hoje é um placeholder tipográfico. Está em três lugares no `index.html` (cabeçalho, rodapé, favicon).
3. **Imagens reais.** As capas de programas e resenhas são desenhos temporários em `assets/img/`.
4. **Redes sociais.** Só o YouTube está com link real; o resto está como `#` em `js/config.js`.

## Próximos passos

- [x] **1. Código** — HTML, CSS e JS prontos
- [ ] **2. GitHub** — subir o repositório
- [ ] **3. Vercel** — conectar ao repositório (deploy automático a cada alteração)
- [ ] **4. Supabase** — banco de dados e painel de administração
- [ ] **5. GoDaddy** — apontar o domínio para a Vercel

## Testado

Navegação entre todas as telas, botões voltar/avançar do navegador, formulário de recados (validação, envio e sucesso), favoritar faixa, menu mobile, e o comportamento sem stream configurado. Layout conferido em 1280px e 390px. Nenhum erro de JavaScript.
