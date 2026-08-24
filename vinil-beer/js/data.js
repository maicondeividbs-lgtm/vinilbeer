/* =========================================================
   Conteúdo do site.
   Na fase do Supabase, cada array destes vira uma consulta ao
   banco com o mesmo formato — nenhum outro arquivo muda.
   ========================================================= */

const minutosAtras = (n) => new Date(Date.now() - n * 60000).toISOString();
const diasAtras    = (n) => new Date(Date.now() - n * 86400000).toISOString();

window.VB_DATA = {

  programas: [
    {
      slug: "trilhas-fracassadas",
      grade: { dias: [1,2,3,4,5], inicio: "12:00", fim: "13:00" },
      titulo: "Trilhas Fracassadas",
      dias: "Seg a Sex",
      horario: "12h",
      apresentador: "Rafael",
      capa: "assets/img/capa-programa.svg",
      descricao: "As músicas que quase deram certo. Uma hora de hits que pararam no meio do caminho, com o contexto de quem viveu a época."
    },
    {
      slug: "vinil-beer-classicos",
      grade: { dias: [1,2,3,4,5], inicio: "18:00", fim: "20:00" },
      titulo: "Vinil Beer Clássicos",
      dias: "Seg a Sex",
      horario: "18h",
      apresentador: "Rafa & Convidados",
      capa: "assets/img/capa-programa.svg",
      descricao: "O bloco principal da casa. Clássicos dos anos 80, 90 e 2000 no fim da tarde, com convidado toda semana."
    },
    {
      slug: "resenha-de-quinta",
      grade: { dias: [4], inicio: "20:00", fim: "22:00" },
      titulo: "Resenha de Quinta",
      dias: "Qui",
      horario: "20h",
      apresentador: "Rafa & Galera",
      capa: "assets/img/capa-programa.svg",
      descricao: "Papo aberto sobre música, cinema e o que mais aparecer. Sem roteiro e sem enrolação."
    },
    {
      slug: "flashback-weekend",
      grade: { dias: [6], inicio: "15:00", fim: "18:00" },
      titulo: "Flashback Weekend",
      dias: "Sáb",
      horario: "15h",
      apresentador: "Só pedradas!",
      capa: "assets/img/capa-programa.svg",
      descricao: "Sábado à tarde é só pedrada. Bloco contínuo, sem intervalo, pra deixar tocando."
    }
  ],

  /* Faixa exibida enquanto o stream não devolve metadados */
  tocandoAgora: {
    artista: "Queen",
    titulo: "Don't Stop Me Now",
    capa: "assets/img/placeholder-album.svg"
  },

  playlist: [
    { artista: "Michael Jackson", titulo: "Billie Jean",         tocadaEm: minutosAtras(5)  },
    { artista: "Legião Urbana",   titulo: "Tempo Perdido",       tocadaEm: minutosAtras(9)  },
    { artista: "A-ha",            titulo: "Take On Me",          tocadaEm: minutosAtras(14) },
    { artista: "Phil Collins",    titulo: "In The Air Tonight",  tocadaEm: minutosAtras(19) },
    { artista: "Bon Jovi",        titulo: "Always",              tocadaEm: minutosAtras(24) },
    { artista: "Titãs",           titulo: "Epitáfio",            tocadaEm: minutosAtras(29) },
    { artista: "The Police",      titulo: "Every Breath You Take", tocadaEm: minutosAtras(34) },
    { artista: "Cazuza",          titulo: "Exagerado",           tocadaEm: minutosAtras(39) }
  ],

  resenhas: [
    {
      slug: "trilhas-sonoras-anos-90",
      titulo: "As trilhas sonoras que marcaram os anos 90",
      resumo: "De Pulp Fiction a Cidade de Deus: como a seleção musical deixou de ser fundo e virou personagem no cinema da década.",
      texto: "A gente costuma lembrar dos filmes pelas cenas, mas nos anos 90 aconteceu uma coisa curiosa: a trilha começou a competir com a imagem. Diretores passaram a montar a seleção musical antes de rodar, e o resultado é que hoje é impossível ouvir certas faixas sem enxergar a cena junto.\n\nNo programa a gente destrinchou cinco trilhas que fizeram isso melhor que todo mundo, faixa por faixa, discutindo por que aquela música e não outra.",
      capa: "assets/img/capa-resenha.svg",
      publicadaEm: diasAtras(2)
    },
    {
      slug: "classicos-do-cinema",
      titulo: "Rafa comenta os clássicos do cinema",
      resumo: "Uma hora de resenha sobre os filmes que a gente assistiu tantas vezes que sabe de cor — e sobre o que eles ainda têm a dizer.",
      texto: "Tem filme que a gente assiste uma vez. Tem filme que a gente revisita. E tem filme que já faz parte do vocabulário, que a gente cita sem perceber.\n\nEssa resenha é sobre o terceiro tipo. O Rafa trouxe a lista dele, a galera discordou de metade, e o resultado foi uma das melhores conversas do ano.",
      capa: "assets/img/capa-resenha.svg",
      publicadaEm: diasAtras(5)
    },
    {
      slug: "flashback-weekend-especial-anos-80",
      titulo: "Flashback Weekend: especial anos 80",
      resumo: "O sábado que virou maratona. Tudo que rolou na edição especial, faixa por faixa.",
      texto: "Três horas sem intervalo, telefone tocando sem parar e uma fila de pedidos que não acabava. A edição especial dos anos 80 foi a maior audiência do Flashback Weekend até hoje.\n\nAqui vai a lista completa do que tocou, na ordem, pra quem quiser refazer o sábado em casa.",
      capa: "assets/img/capa-resenha.svg",
      publicadaEm: diasAtras(7)
    }
  ],

  destaques: [
    { icone: "lupa",      titulo: "Trilhas icônicas",       legenda: "Anos 80, 90 e 2000" },
    { icone: "calendario", titulo: "Programação diária",     legenda: "Todos os dias" },
    { icone: "microfone", titulo: "Resenhas sinceras",      legenda: "Sem enrolação" },
    { icone: "aviao",     titulo: "Participe da resenha",   legenda: "Mande seu recado" }
  ],

  sobre: "A Vinil Beer nasceu da paixão por música boa, cerveja gelada e conversas que ficam. Aqui a trilha é certeira e o papo é reto."
};
