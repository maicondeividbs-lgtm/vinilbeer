# Vinil Beer — Rádio Web

Site e rádio online da Vinil Beer. HTML, CSS e JavaScript puros — sem build, sem dependências, sem instalação.

## Como abrir

Dê duplo clique no `index.html`. Abre no navegador e funciona.

Uma ressalva: abrindo assim (via `file://`), a navegação pelo menu não funciona, porque o roteador usa endereços de verdade (`/playlist`, `/noticias`). Isso é normal e resolve sozinho quando o site estiver na Vercel. Para ver a home e o visual geral, o duplo clique basta.

## Estrutura

```
index.html          Todas as telas do site
admin.html          Painel de administração (/admin)
vercel.json         Manda toda URL para o index.html (essencial para a navegação)
robots.txt
css/
  style.css         Folha única, dividida em blocos comentados
  admin.css         Estilos do painel
js/
  config.js         ⭐ Stream, redes sociais, chaves — o que você vai editar
  data.js           ⭐ Programas, playlist, resenhas — o conteúdo
  player.js         Player de áudio
  views.js          Monta as listas na tela
  api.js            ⭐ Conversa com o Supabase
  admin.js          Lógica do painel
  ui.js             Animações, carrossel, busca, avisos
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

## Movimento e interação

Regra adotada: **nenhuma animação decorativa**. Cada movimento comunica um estado ou orienta o olho.

| Movimento | O que comunica |
|---|---|
| Braço do toca-discos desce | A rádio está no ar |
| Barras da onda respiram | Áudio tocando (para quando pausa) |
| Bolinha vermelha pulsa | Transmissão ao vivo |
| Seções sobem ao rolar | Dá ritmo à página e sinaliza que há mais abaixo |
| Sombra na borda do carrossel | Existe conteúdo fora da tela |
| Coração dá um pulo | Sua ação foi registrada |
| Traço dourado no menu | Onde você está |

Tudo isso desliga sozinho para quem ativou "reduzir movimento" no sistema operacional. O conteúdo continua inteiro — nada depende da animação para ser lido.

## Banco de dados (Supabase)

O site funciona **com ou sem** banco. Enquanto `supabaseUrl` e `supabaseAnonKey` estiverem vazios em `js/config.js`, ele usa o conteúdo de `js/data.js`. Preenchidos, passa a ler do Supabase automaticamente.

Se o banco cair ou uma consulta falhar, o site volta sozinho para os dados locais e continua no ar. O visitante nunca vê página quebrada.

### Já está ligado

As credenciais do projeto `mqmwvoddagjdyglsbqxx` estão em `js/config.js`.

Para verificar se o banco está respondendo, cole no navegador (troque CHAVE pela `anon` do `config.js`):

```
https://mqmwvoddagjdyglsbqxx.supabase.co/rest/v1/programas?select=*&apikey=CHAVE
```

Uma lista de programas em JSON = funcionando. `{"message":"relation ... does not exist"}` = o `schema.sql` ainda não foi rodado.

### Como ligar (para outro projeto)

1. Crie um projeto em supabase.com
2. SQL Editor → cole o conteúdo de `supabase/schema.sql` → Run
3. Settings → API → copie **Project URL** e a chave **anon public**
4. Cole os dois em `js/config.js`

A chave `anon` é pública por natureza — pode ficar no código. Quem protege os dados são as políticas de segurança (RLS) do `schema.sql`: qualquer um lê programas e playlist, ninguém escreve, e recados podem ser enviados mas não lidos pelo navegador.

### O que passa a funcionar

| Recurso | Comportamento |
|---|---|
| Programas, playlist, resenhas | Vêm do banco |
| Formulário de recados | Grava de verdade, com status "pendente" |
| Playlist ao vivo | Atualiza sozinha a cada 20s, sem recarregar |
| URL do stream | Configurável pelo banco, sem mexer no código |
| Textos e redes sociais | Editáveis pelo banco |

## Painel de administração

Fica em **/admin**. Permite editar programação, publicar resenhas, registrar faixas, moderar recados e configurar o stream — tudo sem tocar em código.

### Liberar o primeiro acesso

1. Supabase → **Authentication → Users → Add user** (e-mail e senha, marque "Auto Confirm User")
2. SQL Editor, trocando pelo seu e-mail:

```sql
update public.perfis set admin = true
where id = (select id from auth.users where email = 'SEU@EMAIL.COM');
```

Sem o passo 2 o login funciona mas o painel recusa a entrada — é assim de propósito.

### Sobre a segurança

Esconder botão não protege nada. Quem decide o que cada conta pode fazer é o banco, pelas políticas de RLS. Uma conta sem `admin = true` que tentasse escrever direto pela API seria recusada pelo servidor, não pelo navegador.

## Streaming

O player entende dois formatos e detecta sozinho pelo endereço:

| Serviço | Formato | O que o site consegue |
|---|---|---|
| AzuraCast e compatíveis | JSON, consulta a cada 20s | Faixa atual **e** playlist recente automática |
| Zeno.FM | Server-Sent Events | Faixa atual em tempo real |

Ambos os endereços se configuram em **/admin → Configurações**, sem tocar em código.

### Testar sem contratar nada

A demo pública do AzuraCast serve para validar o caminho completo:

```
Stream:        https://demo.azuracast.com/listen/azuratest_radio/radio.mp3
Tocando agora: https://demo.azuracast.com/api/nowplaying/1
```

É banda de terceiros, destinada a avaliação. Use para testar e **apague os campos depois** — não deixe no ar.

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

Busca da playlist (filtro e estado vazio), selo "no ar" no horário certo, revelação ao rolar com e **sem** JavaScript, favoritar com chave estável, avisos, voltar ao topo, atalho de teclado. Navegação entre todas as telas, botões voltar/avançar do navegador, formulário de recados (validação, envio e sucesso), favoritar faixa, menu mobile, e o comportamento sem stream configurado. Layout conferido em 1280px e 390px. Nenhum erro de JavaScript.
