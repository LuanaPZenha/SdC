import type { Lesson, Tip } from "@/lib/types";

export const LESSONS: Lesson[] = [
  {
    id: "apatia",
    title: "A Apatia é fictícia",
    topic: "Cenário",
    body: "A Apatia não existe fora deste jogo. Ela foi desenhada com uma via só: o toque, o contato físico prolongado. Serve para você ver o efeito de festa, fila, comércio e kit sem confundir com uma doença real. Dengue, sarampo, pólio, meningite e as síndromes respiratórias que aparecem no boletim são reais — e não se transmitem como a Apatia.",
  },
  {
    id: "isolamento",
    title: "Isolamento não é quarentena",
    topic: "Medidas",
    body: "Isolamento separa quem está doente. Quarentena restringe quem foi exposto e ainda pode adoecer. Distanciamento reduz contato na população geral. O jogo chama de quarentena a restrição ampla de circulação, como a gestão municipal acaba fazendo na prática, e mostra o custo: renda, adesão e confiança. Usar a palavra certa ajuda a escolher a medida certa.",
  },
  {
    id: "imunidade",
    title: "Imunidade coletiva",
    topic: "Vacinas",
    body: "Imunidade coletiva é o ponto em que há gente protegida o suficiente para o patógeno não sustentar a cadeia. No sarampo, como o R0 é muito alto, esse ponto fica perto de 95% de cobertura. Abaixo disso, um caso importado encontra suscetível. A Apatia não tem vacina neste cenário. A cobertura que você administra é a de rotina, e ela decide se uma segunda doença entra na mesma rede.",
  },
  {
    id: "erradicacao",
    title: "Eliminação não é erradicação",
    topic: "Vacinas",
    body: "Eliminação significa interromper a circulação numa região. Erradicação significa acabar com o patógeno no mundo. A poliomielite foi eliminada no Brasil; não foi erradicada no planeta. Por isso uma cobertura baixa não é um detalhe histórico. É uma porta de reintrodução. O alerta do jogo não afirma um surto. Ele afirma o risco.",
  },
  {
    id: "capacidade",
    title: "A letalidade também é da rede",
    topic: "Hospitais",
    body: "Quando há leito e equipe, parte dos graves sobrevive. Quando a ocupação passa de 100%, o excedente é tratado tarde ou não é tratado. A mesma doença mata mais. Arbovirose no verão e SRAG no inverno não precisam ser a Apatia para produzir esse excesso: basta ocuparem o leito que faltou. Os 180 leitos iniciais são uma abstração didática, não o inventário real das unidades de Maricá.",
  },
  {
    id: "vias",
    title: "Três vias, a mesma rede",
    topic: "Transmissão",
    body: "Toque, gotícula, mosquito e vírus respiratório não respondem à mesma medida. Kit e densidade seguram contato. Vacina segura sarampo e pólio. Controle do Aedes segura dengue e chikungunya. O que é comum é o destino: UPA, Clínica da Família, oxigênio, profissional. Uma crise educacional deste jogo é perceber que a medida errada gasta a verba da medida certa.",
  },
  {
    id: "infodemia",
    title: "Infodemia e hesitação",
    topic: "Confiança",
    body: "Infodemia é o volume de informação falsa ou desencontrada que atrapalha a resposta. Hesitação vacinal não se desfaz com multa como primeira ferramenta. Passaporte, decreto e fila precisam de uma frase clara sobre o que a regra faz. Sem essa frase, grupos diferentes se juntam no protesto — e o protesto, numa doença de toque, é mais contato.",
  },
  {
    id: "maricá",
    title: "O recorte de Maricá",
    topic: "Território",
    body: "O município tem quatro distritos oficiais: Sede, Ponta Negra, Inoã e Itaipuaçu. O mapa da sala é uma placa esquemática com oito recortes jogáveis, não o limite oficial de cada bairro. A soma das populações reproduz a estimativa do IBGE para 2026, 212.703 pessoas. O Censo de 2022 contou 197.277. A RJ-106 aparece como porta de entrada porque é por ela que o fluxo regional chega.",
  },
];

export const TIPS: Tip[] = [
  {
    id: "dica-leito",
    text: "A ocupação passou de 75%. Leito novo custa menos do que a letalidade de quem ficou sem vaga.",
    trigger: { type: "metric", metric: "occupancy", op: "gt", value: 0.75 },
  },
  {
    id: "dica-pesquisa",
    text: "A cura não anda sozinha. A pesquisa básica é lenta; a intensiva cabe mal junto com uma quarentena rígida.",
    trigger: { type: "all", all: [{ type: "metric", metric: "research", op: "lt", value: 35 }, { type: "metric", metric: "day", op: "gt", value: 6 }] },
  },
  {
    id: "dica-vacina",
    text: "A Apatia não tem vacina. Sarampo e pólio têm. Cobertura baixa abre uma segunda crise na mesma equipe.",
    trigger: { type: "metric", metric: "vaccine", op: "lt", value: 75 },
  },
  {
    id: "dica-comercio",
    text: "A quarentena está irritando o comércio. Sem compensação, a porta abre e a medida perde força.",
    trigger: { type: "all", all: [{ type: "metric", metric: "faction.comerciantes", op: "lt", value: 48 }, { type: "metric", metric: "quarantine", op: "gt", value: 0.3 }] },
  },
  {
    id: "dica-saude",
    text: "As equipes estão no limite. Adicional e contratação seguram gente; decreto não cobre plantão.",
    trigger: { type: "metric", metric: "faction.saude", op: "lt", value: 48 },
  },
];
