import type { Formula } from "@/lib/types";

export const FORMULAS: Formula[] = [
  {
    id: "force",
    label: "Força de infecção",
    expression: "infectedShare * beta * factor + imported",
    explanation: "infectedShare é a prevalência local. beta é a taxa de contato da Apatia. factor reúne kits, quarentena, escolas, barreiras, turismo e aglomeração. imported vem dos bairros vizinhos.",
  },
  {
    id: "newInfections",
    label: "Casos novos",
    expression: "susceptible * (1 - exp(-1 * force))",
    explanation: "Modelo discreto de força de infecção. O resultado é limitado aos suscetíveis do bairro. Editar esta expressão muda o cálculo de dano do contágio sem alterar o código.",
  },
  {
    id: "deaths",
    label: "Óbitos do dia",
    expression: "treated * max(0, baseLethality + lethalityShift) + untreated * overloadLethality",
    explanation: "treated são doentes da Apatia que conseguiram leito. untreated é o excesso total da rede, incluindo leitos tomados por outras síndromes. É o cálculo de dano hospitalar.",
  },
  {
    id: "income",
    label: "Receita do dia",
    expression: "baseIncome * (1 - quarantineWeight * quarantine) + incomeExtra",
    explanation: "A quarentena reduz a arrecadação do fundo emergencial. incomeExtra soma bônus e penalidades das medidas ativas.",
  },
  {
    id: "research",
    label: "Avanço da cura",
    expression: "researchBase + researchDaily",
    explanation: "Pontos percentuais acrescentados à pesquisa no fim do dia. researchDaily vem das políticas de pesquisa ativas.",
  },
  {
    id: "occupancy",
    label: "Ocupação hospitalar",
    expression: "(apatiaBeds + parallelBeds) / capacity",
    explanation: "Soma quem precisa de leito por causa da Apatia e quem já ocupa leito por arbovirose ou SRAG, dividida pela capacidade efetiva.",
  },
  {
    id: "score",
    label: "Pontuação final",
    expression: "days * scorePerDay + research * scorePerResearch + winBonus - dead * scorePerDeath",
    explanation: "O placar ordena primeiro pelos dias sobrevividos. Esta pontuação aparece como critério de desempate e como leitura do custo humano.",
  },
];
