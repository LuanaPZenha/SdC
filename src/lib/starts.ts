export const STARTS = [
  {
    id: "fevereiro",
    date: "2026-02-01",
    label: "1º de fevereiro",
    detail: "Verão, arboviroses e o Carnaval à frente.",
  },
  {
    id: "maio",
    date: "2026-05-18",
    label: "18 de maio",
    detail: "Véspera da semana de aniversário da cidade.",
  },
  {
    id: "agosto",
    date: "2026-08-01",
    label: "1º de agosto",
    detail: "Inverno, SRAG e a festa da padroeira.",
  },
  {
    id: "dezembro",
    date: "2026-12-15",
    label: "15 de dezembro",
    detail: "Temporada, Natal e o fluxo da RJ-106.",
  },
] as const;

export type StartId = (typeof STARTS)[number]["id"];

export function findStart(id: string) {
  return STARTS.find((item) => item.id === id) ?? null;
}
