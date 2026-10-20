import { FORMULA_SAMPLE, evalFormula } from "@/lib/formula";
import type { Catalog, EffectBag, GameEvent, Tip, Trigger } from "@/lib/types";
import { EFFECT_KEYS } from "@/lib/types";

export const REQUIRED_FORMULAS = ["force", "newInfections", "deaths", "income", "research", "occupancy", "score"];

const METRICS = new Set([
  "day",
  "occupancy",
  "order",
  "vaccine",
  "research",
  "deathsToday",
  "quarantine",
  "passport",
  "gathering",
  "infected",
  "faction.comerciantes",
  "faction.saude",
  "faction.civil",
]);

function checkTrigger(trigger: Trigger, where: string, errors: string[], allowRandom: boolean) {
  if (trigger.type === "calendar") {
    if (trigger.chance != null && (trigger.chance < 0 || trigger.chance > 1)) {
      errors.push(`${where}: chance fora de 0 a 1.`);
    }
    return;
  }
  if (trigger.type === "random") {
    if (!allowRandom) errors.push(`${where}: dica não pode depender de sorteio.`);
    if (trigger.chance < 0 || trigger.chance > 1) errors.push(`${where}: chance fora de 0 a 1.`);
    return;
  }
  if (trigger.type === "metric") {
    if (!METRICS.has(trigger.metric)) errors.push(`${where}: métrica desconhecida (${trigger.metric}).`);
    if (!Number.isFinite(trigger.value)) errors.push(`${where}: valor de métrica inválido.`);
    return;
  }
  if (trigger.type === "all") {
    if (!trigger.all?.length) errors.push(`${where}: condição composta vazia.`);
    trigger.all?.forEach((item, index) => checkTrigger(item, `${where} / condição ${index + 1}`, errors, allowRandom));
    return;
  }
  errors.push(`${where}: gatilho inválido.`);
}

function checkEffects(effects: EffectBag, where: string, catalog: Catalog, errors: string[]) {
  for (const key of Object.keys(effects)) {
    if (!EFFECT_KEYS.includes(key as (typeof EFFECT_KEYS)[number])) {
      errors.push(`${where}: chave de efeito desconhecida (${key}).`);
    }
  }
  const factionIds = new Set(catalog.factions.map((faction) => faction.id));
  const districtIds = new Set(catalog.districts.map((district) => district.id));
  const policyIds = new Set(catalog.policies.map((policy) => policy.id));
  for (const id of Object.keys(effects.factions ?? {})) {
    if (!factionIds.has(id)) errors.push(`${where}: facção inexistente (${id}).`);
  }
  for (const id of Object.keys(effects.factionsDaily ?? {})) {
    if (!factionIds.has(id)) errors.push(`${where}: facção inexistente (${id}).`);
  }
  for (const id of Object.keys(effects.infect ?? {})) {
    if (!districtIds.has(id)) errors.push(`${where}: bairro inexistente (${id}).`);
  }
  for (const id of effects.cancelPolicies ?? []) {
    if (!policyIds.has(id)) errors.push(`${where}: política inexistente (${id}).`);
  }
}

export function validateCatalog(catalog: Catalog): string[] {
  const errors: string[] = [];
  const ids = (items: { id: string }[], label: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.id?.trim()) errors.push(`${label} sem id.`);
      if (seen.has(item.id)) errors.push(`${label} com id repetido: ${item.id}.`);
      seen.add(item.id);
    }
  };
  ids(catalog.districts, "Bairro");
  ids(catalog.factions, "Facção");
  ids(catalog.policies, "Política");
  ids(catalog.events, "Evento");
  ids(catalog.lessons, "Lição");
  ids(catalog.tips, "Dica");
  ids(catalog.formulas, "Fórmula");

  const districtIds = new Set(catalog.districts.map((district) => district.id));
  for (const district of catalog.districts) {
    if (district.population <= 0) errors.push(`${district.name}: população precisa ser positiva.`);
    for (const key of ["elderly", "tourism", "commerce", "schools", "border"] as const) {
      if (district[key] < 0 || district[key] > 1) errors.push(`${district.name}: ${key} precisa ficar entre 0 e 1.`);
    }
    if (!district.path?.trim()) errors.push(`${district.name}: falta o desenho do mapa.`);
    for (const neighbor of district.neighbors) {
      if (!districtIds.has(neighbor)) errors.push(`${district.name}: vizinho inexistente (${neighbor}).`);
      if (neighbor === district.id) errors.push(`${district.name}: não pode ser vizinho de si.`);
    }
  }

  const parameterKeys = new Set<string>();
  for (const parameter of catalog.parameters) {
    if (parameterKeys.has(parameter.key)) errors.push(`Parâmetro repetido: ${parameter.key}.`);
    parameterKeys.add(parameter.key);
    if (!Number.isFinite(parameter.value)) errors.push(`Parâmetro inválido: ${parameter.key}.`);
  }

  const formulaIds = new Set(catalog.formulas.map((formula) => formula.id));
  for (const id of REQUIRED_FORMULAS) {
    if (!formulaIds.has(id)) errors.push(`Falta a fórmula ${id}.`);
  }
  const sample = { ...FORMULA_SAMPLE };
  for (const parameter of catalog.parameters) sample[parameter.key] = parameter.value;
  for (const formula of catalog.formulas) {
    try {
      const value = evalFormula(formula.expression, sample);
      if (!Number.isFinite(value)) errors.push(`Fórmula ${formula.id} não deu um número finito.`);
    } catch (error) {
      errors.push(`Fórmula ${formula.id}: ${error instanceof Error ? error.message : "inválida"}`);
    }
  }

  for (const policy of catalog.policies) {
    if (!policy.name.trim()) errors.push(`Política ${policy.id} sem nome.`);
    if (policy.kind !== "instant" && policy.kind !== "sustained") errors.push(`${policy.name}: tipo inválido.`);
    if (policy.cost < 0 || policy.dailyCost < 0) errors.push(`${policy.name}: custo negativo.`);
    checkEffects(policy.effects, policy.name, catalog, errors);
  }

  const openings = catalog.events.filter((event) => event.opening);
  if (openings.length !== 1) errors.push("É preciso haver exatamente um evento de abertura.");
  for (const event of catalog.events) {
    if (!event.choices.length) errors.push(`${event.title}: sem escolhas.`);
    if (!event.choices.some((choice) => (choice.effects.budget ?? 0) >= 0)) {
      errors.push(`${event.title}: inclua uma escolha que não gaste verba.`);
    }
    const choiceIds = new Set<string>();
    for (const choice of event.choices) {
      if (choiceIds.has(choice.id)) errors.push(`${event.title}: escolha repetida (${choice.id}).`);
      choiceIds.add(choice.id);
      if (!choice.label.trim()) errors.push(`${event.title}: escolha sem texto.`);
      checkEffects(choice.effects, `${event.title} / ${choice.label}`, catalog, errors);
    }
    checkTrigger(event.trigger, event.title, errors, true);
    if (event.monthStart != null || event.monthEnd != null) {
      for (const value of [event.monthStart, event.monthEnd]) {
        if (value == null || value < 1 || value > 12) errors.push(`${event.title}: mês inválido.`);
      }
    }
  }

  for (const tip of catalog.tips) {
    if (!tip.text.trim()) errors.push(`Dica ${tip.id} vazia.`);
    checkTrigger(tip.trigger, `Dica ${tip.id}`, errors, false);
  }

  for (const lesson of catalog.lessons) {
    if (!lesson.title.trim() || !lesson.body.trim()) errors.push(`Lição ${lesson.id} incompleta.`);
  }

  return errors;
}

export function triggerMatches(trigger: Trigger, metrics: Record<string, number>, roll: () => number, rollChance: boolean): boolean {
  if (trigger.type === "metric") {
    const left = metrics[trigger.metric] ?? 0;
    if (trigger.op === "gt") return left > trigger.value;
    if (trigger.op === "lt") return left < trigger.value;
    if (trigger.op === "gte") return left >= trigger.value;
    return left <= trigger.value;
  }
  if (trigger.type === "all") return trigger.all.every((item) => triggerMatches(item, metrics, roll, rollChance));
  if (!rollChance) return trigger.type === "calendar" && (trigger.chance ?? 1) >= 1;
  const chance = trigger.type === "random" ? trigger.chance : (trigger.chance ?? 1);
  return roll() < chance;
}

export function eventInWindow(date: string, event: Pick<GameEvent, "monthStart" | "monthEnd" | "dayStart" | "dayEnd">): boolean {
  if (event.monthStart == null || event.monthEnd == null) return true;
  const [, monthText, dayText] = date.split("-");
  const current = Number(monthText) * 100 + Number(dayText);
  const start = event.monthStart * 100 + (event.dayStart ?? 1);
  const end = event.monthEnd * 100 + (event.dayEnd ?? 31);
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

export function tipMatches(tip: Tip, metrics: Record<string, number>): boolean {
  return triggerMatches(tip.trigger, metrics, () => 0, false);
}
