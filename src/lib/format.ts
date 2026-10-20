const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const name = MONTHS[(month ?? 1) - 1] ?? "";
  return `${day} de ${name} de ${year}`;
}

export function money(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function people(value: number): string {
  return Math.round(value).toLocaleString("pt-BR");
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monthAndDay(iso: string): { month: number; day: number } {
  const parts = iso.split("-").map(Number);
  return { month: parts[1] ?? 1, day: parts[2] ?? 1 };
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
