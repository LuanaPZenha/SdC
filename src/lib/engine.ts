import { addDays, clamp, formatDate, round1 } from "@/lib/format";
import { evalFormula } from "@/lib/formula";
import { findStart } from "@/lib/starts";
import type {
  Action,
  Catalog,
  CodexEntry,
  DayReport,
  EffectBag,
  GameState,
  GameView,
  Policy,
  PolicyView,
} from "@/lib/types";
import { eventInWindow, tipMatches, triggerMatches } from "@/lib/validate";

export type Projection = {
  infected: number;
  recovered: number;
  dead: number;
  population: number;
  apatiaBeds: number;
  parallelBeds: number;
  capacity: number;
  occupancy: number;
  order: number;
  income: number;
  upkeep: number;
  researchDaily: number;
  mods: EffectBag;
};

const TEMPORAL_KEYS = [
  "researchDaily",
  "factionsDaily",
  "income",
  "betaAdd",
  "betaMult",
  "protection",
  "quarantine",
  "barriers",
  "tourism",
  "mobility",
  "schoolClosure",
  "elderlyRisk",
  "gathering",
  "passport",
  "surgeBeds",
  "comms",
  "capacity",
] as const;

function param(catalog: Catalog, key: string): number {
  const found = catalog.parameters.find((item) => item.key === key);
  if (!found || !Number.isFinite(found.value)) throw new Error(`Parâmetro ausente: ${key}`);
  return found.value;
}

function formula(catalog: Catalog, id: string, extra: Record<string, number>): number {
  const row = catalog.formulas.find((item) => item.id === id);
  if (!row) throw new Error(`Fórmula ausente: ${id}`);
  const vars: Record<string, number> = {};
  for (const parameter of catalog.parameters) vars[parameter.key] = parameter.value;
  Object.assign(vars, extra);
  return evalFormula(row.expression, vars);
}

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash || 1;
}

function nextRandom(state: GameState): number {
  let seed = state.rngState | 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
  state.rngState = value | 0;
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function pushLog(state: GameState, text: string) {
  state.log.unshift({ day: state.day, text });
  state.log = state.log.slice(0, 40);
}

function remember(state: GameState, entry: CodexEntry) {
  if (!entry.body.trim()) return;
  if (state.codexExtra.some((item) => item.id === entry.id)) return;
  state.codexExtra.push(entry);
}

function heal(state: GameState, catalog: Catalog) {
  for (const district of catalog.districts) {
    if (!state.districts[district.id]) state.districts[district.id] = { infected: 0, recovered: 0, dead: 0 };
  }
  for (const faction of catalog.factions) {
    if (state.factions[faction.id] == null) state.factions[faction.id] = faction.start;
  }
  const policyIds = new Set(catalog.policies.map((policy) => policy.id));
  state.activePolicies = state.activePolicies.filter((id) => policyIds.has(id));
}

function combine(bags: EffectBag[]): EffectBag {
  const mods: EffectBag = { factionsDaily: {} };
  let betaMult = 1;
  let gathering = 1;
  let quarantine = 0;
  let barriers = 0;
  let schoolClosure = 0;
  let passport = 0;
  let protection = 0;
  let betaAdd = 0;
  let tourism = 0;
  let mobility = 0;
  let elderlyRisk = 0;
  let surgeBeds = 0;
  let capacity = 0;
  let income = 0;
  let researchDaily = 0;
  let comms = 0;
  for (const bag of bags) {
    if (bag.betaMult != null) betaMult *= bag.betaMult;
    if (bag.gathering != null) gathering = Math.max(gathering, bag.gathering);
    if (bag.quarantine != null) quarantine = Math.max(quarantine, bag.quarantine);
    if (bag.barriers != null) barriers = Math.max(barriers, bag.barriers);
    if (bag.schoolClosure != null) schoolClosure = Math.max(schoolClosure, bag.schoolClosure);
    if (bag.passport != null) passport = Math.max(passport, bag.passport);
    protection += bag.protection ?? 0;
    betaAdd += bag.betaAdd ?? 0;
    tourism += bag.tourism ?? 0;
    mobility += bag.mobility ?? 0;
    elderlyRisk += bag.elderlyRisk ?? 0;
    surgeBeds += bag.surgeBeds ?? 0;
    capacity += bag.capacity ?? 0;
    income += bag.income ?? 0;
    researchDaily += bag.researchDaily ?? 0;
    comms += bag.comms ?? 0;
    for (const [id, value] of Object.entries(bag.factionsDaily ?? {})) {
      mods.factionsDaily![id] = (mods.factionsDaily![id] ?? 0) + value;
    }
  }
  return {
    ...mods,
    betaMult,
    gathering,
    quarantine,
    barriers,
    schoolClosure,
    passport,
    protection,
    betaAdd,
    tourism,
    mobility,
    elderlyRisk,
    surgeBeds,
    capacity,
    income,
    researchDaily,
    comms,
  };
}

function activeBags(state: GameState, catalog: Catalog): EffectBag[] {
  const bags: EffectBag[] = [];
  for (const id of state.activePolicies) {
    const policy = catalog.policies.find((item) => item.id === id);
    if (policy) bags.push(policy.effects);
  }
  for (const modifier of state.timedModifiers) bags.push(modifier.effects);
  return bags;
}

function monthBit(month: number): number {
  return 1 << (month - 1);
}

function seasonalBeds(state: GameState, catalog: Catalog): number {
  const month = Number(state.date.split("-")[1] ?? 1);
  const bit = monthBit(month);
  let beds = 0;
  if (Math.floor(param(catalog, "arbovirusMask")) & bit) beds += param(catalog, "arbovirusBeds");
  if (Math.floor(param(catalog, "sragMask")) & bit) beds += param(catalog, "sragBeds");
  return beds;
}

export function project(state: GameState, catalog: Catalog): Projection {
  heal(state, catalog);
  const mods = combine(activeBags(state, catalog));
  const population = catalog.districts.reduce((sum, district) => sum + district.population, 0);
  let infected = 0;
  let recovered = 0;
  let dead = 0;
  let apatiaBeds = 0;
  for (const district of catalog.districts) {
    const snap = state.districts[district.id];
    if (!snap) continue;
    infected += snap.infected;
    recovered += snap.recovered;
    dead += snap.dead;
    const age = 1 + district.elderly * (param(catalog, "elderlySevere") + (mods.elderlyRisk ?? 0));
    apatiaBeds += snap.infected * param(catalog, "severeRate") * Math.max(0.2, age);
  }
  const parallelBeds = Math.max(0, seasonalBeds(state, catalog) + state.parallelExtra + (mods.surgeBeds ?? 0));
  let capacity = Math.max(20, state.capacity + (mods.capacity ?? 0));
  if ((state.factions.saude ?? 100) < param(catalog, "strikeThreshold")) {
    capacity = Math.max(20, capacity * param(catalog, "strikeCapacityMult"));
  }
  const occupancy = formula(catalog, "occupancy", { apatiaBeds, parallelBeds, capacity });
  const order = orderOf(state, catalog);
  const income = formula(catalog, "income", { quarantine: mods.quarantine ?? 0, incomeExtra: mods.income ?? 0 });
  const upkeep = round1(
    state.activePolicies.reduce((sum, id) => sum + (catalog.policies.find((policy) => policy.id === id)?.dailyCost ?? 0), 0),
  );
  return {
    infected,
    recovered,
    dead,
    population,
    apatiaBeds,
    parallelBeds,
    capacity,
    occupancy,
    order,
    income: round1(income),
    upkeep,
    researchDaily: mods.researchDaily ?? 0,
    mods,
  };
}

function orderOf(state: GameState, catalog: Catalog): number {
  const weight = catalog.factions.reduce((sum, faction) => sum + faction.weight, 0) || 1;
  const value = catalog.factions.reduce((sum, faction) => sum + faction.weight * (state.factions[faction.id] ?? 0), 0);
  return value / weight;
}

function metricsOf(state: GameState, catalog: Catalog, view: Projection): Record<string, number> {
  return {
    day: state.day,
    occupancy: view.occupancy,
    order: view.order,
    vaccine: state.vaccineCoverage,
    research: state.research,
    deathsToday: state.deathsToday,
    quarantine: view.mods.quarantine ?? 0,
    passport: view.mods.passport ?? 0,
    gathering: view.mods.gathering ?? 1,
    infected: view.infected,
    "faction.comerciantes": state.factions.comerciantes ?? 0,
    "faction.saude": state.factions.saude ?? 0,
    "faction.civil": state.factions.civil ?? 0,
  };
}

function districtFactor(catalog: Catalog, state: GameState, mods: EffectBag, districtId: string): number {
  const district = catalog.districts.find((item) => item.id === districtId);
  if (!district) return 1;
  const quarantine = mods.quarantine ?? 0;
  let compliance = 1;
  if ((state.factions.comerciantes ?? 100) < param(catalog, "revoltThreshold") && quarantine > 0.2) {
    compliance = param(catalog, "revoltLeak");
  }
  const protection = clamp(mods.protection ?? 0, 0, param(catalog, "protectionCap"));
  let factor = clamp(1 - protection, 0.05, 1);
  factor *= clamp(1 - param(catalog, "quarantineBetaCut") * quarantine * compliance, 0.05, 1.4);
  if ((mods.schoolClosure ?? 0) >= 1 && district.schools >= param(catalog, "schoolMin")) factor *= param(catalog, "schoolCut");
  if (district.border >= param(catalog, "borderMin")) {
    factor *= clamp(1 - param(catalog, "barrierCut") * (mods.barriers ?? 0), 0.15, 1);
  }
  factor *= clamp(1 + (mods.mobility ?? 0), 0.25, 2);
  factor *= clamp(1 + (mods.tourism ?? 0) * district.tourism, 0.15, 2.2);
  const gathering = mods.gathering ?? 1;
  const full =
    district.tourism >= param(catalog, "gatheringMinTourism") || district.commerce >= param(catalog, "gatheringMinCommerce");
  factor *= full ? gathering : 1 + (gathering - 1) * 0.4;
  if ((state.factions.civil ?? 100) < param(catalog, "panicThreshold")) factor *= param(catalog, "panicBeta");
  return Math.max(0.02, factor);
}

function applyEffects(state: GameState, catalog: Catalog, effects: EffectBag, name: string) {
  if (effects.budget) state.budget = round1(state.budget + effects.budget);
  if (effects.research) state.research = clamp(state.research + effects.research, 0, 100);
  if (effects.vaccine) state.vaccineCoverage = clamp(state.vaccineCoverage + effects.vaccine, 0, 100);
  if (effects.lethalityAdd) state.lethalityShift += effects.lethalityAdd;
  if (effects.deaths && effects.deaths > 0) state.totalDead += Math.round(effects.deaths);
  for (const [id, delta] of Object.entries(effects.factions ?? {})) {
    if (state.factions[id] == null) continue;
    state.factions[id] = clamp((state.factions[id] ?? 0) + delta, 0, 100);
  }
  for (const [id, amount] of Object.entries(effects.infect ?? {})) {
    const district = catalog.districts.find((item) => item.id === id);
    const snap = state.districts[id];
    if (!district || !snap || amount <= 0) continue;
    const room = Math.max(0, district.population - snap.infected - snap.recovered - snap.dead);
    snap.infected += Math.min(room, Math.round(amount));
  }
  if (effects.cancelPolicies?.length) {
    const cancel = new Set(effects.cancelPolicies);
    state.activePolicies = state.activePolicies.filter((id) => !cancel.has(id));
  }
  const duration = effects.durationDays ?? 0;
  if (effects.capacity != null && duration <= 0) state.capacity = Math.max(40, state.capacity + effects.capacity);
  if (duration > 0) {
    const temporal: EffectBag = {};
    let hasTemporal = false;
    for (const key of TEMPORAL_KEYS) {
      const value = effects[key];
      if (value != null) {
        (temporal[key] as number | Record<string, number> | undefined) = value as never;
        hasTemporal = true;
      }
    }
    if (hasTemporal) {
      state.timedModifiers.push({
        id: `${name}-${state.day}-${state.timedModifiers.length}`,
        name,
        daysLeft: duration,
        effects: temporal,
      });
    }
  }
}

function conclude(state: GameState, catalog: Catalog, occupancy: number) {
  const population = catalog.districts.reduce((sum, district) => sum + district.population, 0);
  if (state.research >= 100) {
    state.status = "won";
    state.endingTitle = "Cura distribuída";
    state.endingText =
      "A pesquisa chegou a 100% e a cura alcançou as unidades de Maricá. Os dias que você segurou a rede e a adesão foram o tempo que a ciência precisava. O placar guarda esse intervalo — e também os óbitos que ele custou.";
  } else if (state.overloadStreak >= param(catalog, "overloadDays")) {
    state.status = "lost";
    state.endingTitle = "Rede em colapso";
    state.endingText =
      "A ocupação ficou acima de 100% por dias seguidos. Sem leito, a letalidade deixa de ser só uma propriedade do patógeno e passa a ser uma propriedade do sistema. Arboviroses e SRAG, quando ocupam a mesma vaga, entram nessa conta.";
  } else if (state.disorderStreak >= param(catalog, "disorderDays")) {
    state.status = "lost";
    state.endingTitle = "Ordem pública rompida";
    state.endingText =
      "Comércio, equipes e população deixaram de sustentar a mesma medida. Uma restrição correta no papel perde efeito quando ninguém consegue ou aceita cumpri-la. A gestão da epidemia também é gestão de adesão.";
  } else if (population > 0 && state.totalDead / population >= param(catalog, "deathCollapseRatio")) {
    state.status = "lost";
    state.endingTitle = "Colapso demográfico";
    state.endingText =
      "Os óbitos da crise passaram do limite da simulação. Contenção tardia e rede lotada cobram juros em pessoas, não só em verba.";
  }
  if (state.status === "playing") return;
  const winBonus = state.status === "won" ? param(catalog, "scoreWin") : 0;
  state.score = Math.max(
    0,
    Math.round(
      formula(catalog, "score", {
        days: state.day,
        research: state.research,
        dead: state.totalDead,
        winBonus,
      }),
    ),
  );
  void occupancy;
}

function pickEvent(state: GameState, catalog: Catalog): string | null {
  const view = project(state, catalog);
  const metrics = metricsOf(state, catalog, view);
  const matches = catalog.events.filter((event) => {
    if (state.pendingEventId === event.id) return false;
    const last = state.fired[event.id];
    if (last != null && !event.repeatable) return false;
    if (last != null && event.repeatable && state.day < last + Math.max(1, event.cooldown)) return false;
    if (!eventInWindow(state.date, event)) return false;
    return triggerMatches(event.trigger, metrics, () => nextRandom(state), true);
  });
  matches.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title, "pt-BR"));
  return matches[0]?.id ?? null;
}

export function createInitialState(playerName: string, catalog: Catalog, id: string, startId: string): GameState {
  const start = findStart(startId) ?? findStart("fevereiro");
  if (!start) throw new Error("Data inicial inválida.");
  const factions: Record<string, number> = {};
  for (const faction of catalog.factions) factions[faction.id] = faction.start;
  const districts: GameState["districts"] = {};
  for (const district of catalog.districts) districts[district.id] = { infected: 0, recovered: 0, dead: 0 };
  if (districts.centro) districts.centro.infected = 22;
  if (districts.itaipuacu) districts.itaipuacu.infected = 6;
  const state: GameState = {
    id,
    playerName,
    startId: start.id,
    day: 1,
    date: start.date,
    budget: param(catalog, "startBudget"),
    capacity: param(catalog, "startCapacity"),
    research: 0,
    vaccineCoverage: param(catalog, "startVaccine"),
    lethalityShift: 0,
    parallelExtra: 0,
    factions,
    districts,
    activePolicies: [],
    timedModifiers: [],
    fired: {},
    policyUses: {},
    cooldowns: {},
    log: [{ day: 1, text: "Você assume a sala de situação de Maricá. A Apatia se transmite por toque. O resto do boletim vem do banco de conteúdo." }],
    overloadStreak: 0,
    disorderStreak: 0,
    deathsToday: 0,
    totalDead: 0,
    pendingEventId: null,
    lastOutcome: null,
    lastReport: null,
    history: [],
    codexExtra: [],
    status: "playing",
    endingTitle: null,
    endingText: null,
    score: 0,
    ranked: false,
    rngState: hashSeed(`${id}:${playerName}:${start.id}`),
  };
  const opening = catalog.events.find((event) => event.opening);
  state.pendingEventId = opening?.id ?? pickEvent(state, catalog);
  return state;
}

function findPolicy(catalog: Catalog, id: string): Policy | undefined {
  return catalog.policies.find((policy) => policy.id === id);
}

export function applyAction(state: GameState, catalog: Catalog, action: Action): { state: GameState; error?: string } {
  const error = validateAction(state, catalog, action);
  if (error) return { state, error };
  const next = structuredClone(state);
  heal(next, catalog);
  if (action.type === "toggle") togglePolicy(next, catalog, action.policyId);
  if (action.type === "instant") useInstant(next, catalog, action.policyId);
  if (action.type === "choose") chooseEvent(next, catalog, action.choiceId);
  if (action.type === "endDay") resolveDay(next, catalog);
  if (next.status !== "playing") {
    const view = project(next, catalog);
    conclude(next, catalog, view.occupancy);
  }
  return { state: next };
}

function validateAction(state: GameState, catalog: Catalog, action: Action): string | undefined {
  if (state.status !== "playing") return "Esta gestão já foi encerrada.";
  if (action.type === "endDay" && state.pendingEventId) return "Resolva o boletim do dia antes de avançar.";
  if (action.type === "choose") {
    const event = catalog.events.find((item) => item.id === state.pendingEventId);
    if (!event) return "Não há boletim aberto.";
    const choice = event.choices.find((item) => item.id === action.choiceId);
    if (!choice) return "Essa resposta não está neste boletim.";
    if (state.budget + (choice.effects.budget ?? 0) < 0) return "A verba não cobre essa resposta.";
  }
  if (action.type === "toggle" || action.type === "instant") {
    const policy = findPolicy(catalog, action.policyId);
    if (!policy) return "Política não encontrada no banco.";
    if (action.type === "toggle" && policy.kind !== "sustained") return "Essa medida é pontual.";
    if (action.type === "instant" && policy.kind !== "instant") return "Essa medida fica ativa até você suspender.";
    if (action.type === "instant") {
      const uses = state.policyUses[policy.id] ?? 0;
      if (policy.maxUses != null && uses >= policy.maxUses) return "Essa medida já chegou ao limite nesta gestão.";
      const ready = state.cooldowns[policy.id] ?? 0;
      if (state.day < ready) return "Essa medida ainda está em intervalo.";
      if (state.budget < policy.cost) return "Verba insuficiente.";
    }
  }
  return undefined;
}

function togglePolicy(state: GameState, catalog: Catalog, policyId: string) {
  const policy = findPolicy(catalog, policyId);
  if (!policy) return;
  if (state.activePolicies.includes(policy.id)) {
    state.activePolicies = state.activePolicies.filter((id) => id !== policy.id);
    pushLog(state, `${policy.name} foi suspensa.`);
    return;
  }
  if (policy.exclusiveGroup) {
    const group = new Set(
      catalog.policies.filter((item) => item.exclusiveGroup === policy.exclusiveGroup).map((item) => item.id),
    );
    state.activePolicies = state.activePolicies.filter((id) => !group.has(id));
  }
  state.activePolicies.push(policy.id);
  remember(state, { id: `politica-${policy.id}`, title: policy.name, topic: "Medida", body: policy.lesson });
  pushLog(state, `${policy.name} entrou em vigor.`);
}

function useInstant(state: GameState, catalog: Catalog, policyId: string) {
  const policy = findPolicy(catalog, policyId);
  if (!policy) return;
  state.budget = round1(state.budget - policy.cost);
  state.policyUses[policy.id] = (state.policyUses[policy.id] ?? 0) + 1;
  state.cooldowns[policy.id] = state.day + Math.max(1, policy.cooldownDays);
  applyEffects(state, catalog, policy.effects, policy.name);
  remember(state, { id: `politica-${policy.id}`, title: policy.name, topic: "Medida", body: policy.lesson });
  pushLog(state, `${policy.name} executada por R$ ${policy.cost.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} mi.`);
  if (state.research >= 100 || state.totalDead > 0) conclude(state, catalog, project(state, catalog).occupancy);
}

function chooseEvent(state: GameState, catalog: Catalog, choiceId: string) {
  const event = catalog.events.find((item) => item.id === state.pendingEventId);
  const choice = event?.choices.find((item) => item.id === choiceId);
  if (!event || !choice) return;
  applyEffects(state, catalog, choice.effects, event.title);
  state.fired[event.id] = state.day;
  state.pendingEventId = null;
  state.lastOutcome = { title: event.title, text: choice.outcome, lesson: choice.lesson || event.lesson };
  remember(state, { id: `evento-${event.id}`, title: event.title, topic: event.category, body: event.lesson });
  if (choice.lesson && choice.lesson !== event.lesson) {
    remember(state, { id: `evento-${event.id}-${choice.id}`, title: choice.label, topic: event.category, body: choice.lesson });
  }
  pushLog(state, `${event.title}: ${choice.label}.`);
  conclude(state, catalog, project(state, catalog).occupancy);
}

function suspendUnaffordable(state: GameState, catalog: Catalog) {
  for (let guard = 0; guard < 8; guard += 1) {
    const view = project(state, catalog);
    if (state.budget + view.income - view.upkeep >= -0.05) return;
    const ranked = state.activePolicies
      .map((id) => findPolicy(catalog, id))
      .filter((policy): policy is Policy => Boolean(policy))
      .sort((a, b) => b.dailyCost - a.dailyCost);
    const drop = ranked[0];
    if (!drop) return;
    state.activePolicies = state.activePolicies.filter((id) => id !== drop.id);
    pushLog(state, `A verba não cobriu ${drop.name}. A medida foi suspensa.`);
  }
}

function weightedIndex(state: GameState, weights: number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return 0;
  let roll = nextRandom(state) * total;
  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return index;
  }
  return Math.max(0, weights.length - 1);
}

function carrierTrips(state: GameState, catalog: Catalog, mods: EffectBag) {
  const trips: DayReport["trips"] = [];
  const infectedTotal = catalog.districts.reduce((sum, district) => sum + (state.districts[district.id]?.infected ?? 0), 0);
  const limit = infectedTotal >= 180 ? 2 : 1;
  const pool = catalog.districts.filter((district) => (state.districts[district.id]?.infected ?? 0) >= 5);
  const used = new Set<string>();
  while (trips.length < limit && pool.length > 0) {
    const pick = weightedIndex(
      state,
      pool.map((district) => state.districts[district.id]?.infected ?? 0),
    );
    const source = pool.splice(pick, 1)[0];
    if (!source) break;
    const snap = state.districts[source.id];
    if (!snap || snap.infected < 5) continue;
    const chance = clamp(0.8 - (mods.quarantine ?? 0) * 0.5, 0.12, 0.8);
    if (nextRandom(state) > chance) continue;
    const options = source.neighbors
      .map((id) => catalog.districts.find((item) => item.id === id))
      .filter((item): item is Catalog["districts"][number] => Boolean(item))
      .filter((item) => !used.has(item.id));
    if (!options.length) continue;
    const weights = options.map((item) => {
      const there = state.districts[item.id]?.infected ?? 0;
      return (there <= 0 ? 3.2 : 1) * (0.35 + item.border + item.tourism + item.commerce);
    });
    const destination = options[weightedIndex(state, weights)];
    if (!destination) continue;
    const barrier =
      destination.border >= param(catalog, "borderMin") ? (mods.barriers ?? 0) * param(catalog, "barrierCut") : 0;
    if (barrier > 0 && nextRandom(state) < barrier) continue;
    const destSnap = state.districts[destination.id];
    if (!destSnap) continue;
    const room = Math.max(0, destination.population - destSnap.infected - destSnap.recovered - destSnap.dead);
    const carried = Math.min(room, snap.infected >= 120 ? 2 : 1);
    if (carried <= 0) continue;
    destSnap.infected += carried;
    used.add(destination.id);
    trips.push({ from: source.id, to: destination.id, carried });
  }
  return trips;
}

function resolveDay(state: GameState, catalog: Catalog) {
  suspendUnaffordable(state, catalog);
  const before = project(state, catalog);
  state.budget = round1(Math.max(0, state.budget + before.income - before.upkeep));
  const mods = before.mods;
  const notes: string[] = [];
  if ((mods.gathering ?? 1) >= 2) notes.push("Aglomerações multiplicaram o contato físico.");
  if (before.parallelBeds >= 20) notes.push("Outras síndromes ocupavam leitos além da Apatia.");
  if ((mods.quarantine ?? 0) >= 0.45) notes.push("A restrição de circulação seguia ativa.");
  if ((state.factions.saude ?? 100) < param(catalog, "strikeThreshold")) {
    notes.push("Parte das equipes cruzou o limiar de paralisação e a capacidade efetiva caiu.");
  }
  if ((state.factions.comerciantes ?? 100) < param(catalog, "revoltThreshold") && (mods.quarantine ?? 0) > 0.2) {
    notes.push("O comércio abriu por conta própria e a quarentena perdeu adesão.");
  }

  const previous = new Map(catalog.districts.map((district) => [district.id, state.districts[district.id]?.infected ?? 0]));
  let newInfections = 0;
  let recoveries = 0;
  const severe = new Map<string, number>();

  for (const district of catalog.districts) {
    const snap = state.districts[district.id];
    if (!snap) continue;
    const infected = previous.get(district.id) ?? 0;
    const susceptible = Math.max(0, district.population - infected - snap.recovered - snap.dead);
    let imported = 0;
    for (const neighborId of district.neighbors) {
      const neighbor = catalog.districts.find((item) => item.id === neighborId);
      if (!neighbor || neighbor.population <= 0) continue;
      imported += ((previous.get(neighborId) ?? 0) / neighbor.population) * param(catalog, "importRate") * (1 - 0.45 * (mods.quarantine ?? 0));
    }
    const factor = districtFactor(catalog, state, mods, district.id);
    const beta = (param(catalog, "beta") + (mods.betaAdd ?? 0)) * (mods.betaMult ?? 1);
    const force = Math.max(0, formula(catalog, "force", { infectedShare: infected / district.population, beta, factor, imported }));
    const raw = formula(catalog, "newInfections", { susceptible, force });
    const neu = Math.min(susceptible, stochastic(raw, nextRandom(state)));
    const rec = Math.min(infected, Math.round(infected * param(catalog, "recovery")));
    snap.infected = Math.max(0, infected - rec + neu);
    snap.recovered += rec;
    newInfections += neu;
    recoveries += rec;
    const age = 1 + district.elderly * (param(catalog, "elderlySevere") + (mods.elderlyRisk ?? 0));
    severe.set(district.id, snap.infected * param(catalog, "severeRate") * Math.max(0.2, age));
  }

  const afterSpread = project(state, catalog);
  const treatedShare = Math.min(1, afterSpread.capacity / Math.max(1, afterSpread.apatiaBeds + afterSpread.parallelBeds));
  const treated = afterSpread.apatiaBeds * treatedShare;
  const untreated = Math.max(0, afterSpread.apatiaBeds + afterSpread.parallelBeds - afterSpread.capacity);
  const rawDeaths = formula(catalog, "deaths", { treated, untreated, lethalityShift: state.lethalityShift });
  let deaths = clamp(Math.round(rawDeaths), 0, afterSpread.population);
  const severeTotal = [...severe.values()].reduce((sum, value) => sum + value, 0);
  let assigned = 0;
  for (const district of catalog.districts) {
    const snap = state.districts[district.id];
    if (!snap || deaths <= 0) continue;
    const weight = severeTotal > 0 ? (severe.get(district.id) ?? 0) / severeTotal : 0;
    const take = Math.min(snap.infected, Math.round(deaths * weight));
    snap.infected -= take;
    snap.dead += take;
    assigned += take;
  }
  const excess = Math.max(0, deaths - assigned);
  state.totalDead += assigned + excess;
  state.deathsToday = assigned + excess;
  if (excess > 0) notes.push("Houve óbitos em excesso ligados à falta de leito, não só à história natural da Apatia.");

  const trips = carrierTrips(state, catalog, mods);
  for (const trip of trips) {
    const from = catalog.districts.find((item) => item.id === trip.from);
    const to = catalog.districts.find((item) => item.id === trip.to);
    if (!from || !to) continue;
    const who = trip.carried === 1 ? "1 pessoa contaminada" : `${trip.carried} pessoas contaminadas`;
    notes.push(`Um ônibus saiu de ${from.name} para ${to.name} com ${who}. O contato entrou no destino.`);
    pushLog(state, `Ônibus de ${from.name} para ${to.name}: ${trip.carried} caso(s) levado(s).`);
    newInfections += trip.carried;
  }

  for (const faction of catalog.factions) {
    let delta = mods.factionsDaily?.[faction.id] ?? 0;
    if (faction.id === "saude") {
      if (afterSpread.occupancy > 1) delta -= param(catalog, "healthOverloadDaily");
      else if (afterSpread.occupancy > 0.85) delta -= param(catalog, "healthPressureDaily");
      else delta += param(catalog, "healthRecoverDaily");
    }
    if (faction.id === "comerciantes" && (mods.quarantine ?? 0) < 0.2) delta += param(catalog, "commerceRecoverDaily");
    if (faction.id === "civil") {
      delta -= state.deathsToday * param(catalog, "civilDeathWeight");
      delta += param(catalog, "civilRecoverDaily");
    }
    state.factions[faction.id] = clamp((state.factions[faction.id] ?? 0) + delta, 0, 100);
  }

  const researchGain = Math.max(0, formula(catalog, "research", { researchDaily: mods.researchDaily ?? 0 }));
  state.research = clamp(state.research + researchGain, 0, 100);
  state.timedModifiers = state.timedModifiers
    .map((modifier) => ({ ...modifier, daysLeft: modifier.daysLeft - 1 }))
    .filter((modifier) => modifier.daysLeft > 0);

  const endView = project(state, catalog);
  if (endView.occupancy > 1) state.overloadStreak += 1;
  else state.overloadStreak = 0;
  if (endView.order < param(catalog, "disorderThreshold")) state.disorderStreak += 1;
  else state.disorderStreak = 0;

  const report: DayReport = {
    day: state.day,
    date: state.date,
    newInfections,
    recoveries,
    deaths: state.deathsToday,
    income: before.income,
    expenses: before.upkeep,
    researchGain: round1(researchGain),
    occupancy: endView.occupancy,
    notes,
    trips,
  };
  state.lastReport = report;
  state.history.push({
    day: state.day,
    infected: endView.infected,
    dead: state.totalDead,
    occupancy: endView.occupancy,
    research: state.research,
    order: endView.order,
  });
  state.history = state.history.slice(-180);
  pushLog(
    state,
    `${newInfections.toLocaleString("pt-BR")} casos novos, ${state.deathsToday.toLocaleString("pt-BR")} óbitos, pesquisa em ${state.research.toFixed(1).replace(".", ",")}%.`,
  );
  conclude(state, catalog, endView.occupancy);
  if (state.status !== "playing") return;
  state.day += 1;
  state.date = addDays(state.date, 1);
  state.pendingEventId = pickEvent(state, catalog);
}

function stochastic(value: number, roll: number): number {
  if (value <= 0) return 0;
  const base = Math.floor(value);
  return base + (roll < value - base ? 1 : 0);
}

export function buildView(state: GameState, catalog: Catalog): GameView {
  const view = project(state, catalog);
  const event = catalog.events.find((item) => item.id === state.pendingEventId) ?? null;
  const metrics = metricsOf(state, catalog, view);
  const policies: PolicyView[] = catalog.policies.map((policy) => {
    const uses = state.policyUses[policy.id] ?? 0;
    const readyIn = Math.max(0, (state.cooldowns[policy.id] ?? 0) - state.day);
    let disabledReason: string | null = null;
    if (state.status !== "playing") disabledReason = "A gestão encerrou.";
    else if (policy.kind === "instant" && policy.maxUses != null && uses >= policy.maxUses) disabledReason = "Limite de uso desta gestão.";
    else if (policy.kind === "instant" && readyIn > 0) disabledReason = `Disponível em ${readyIn} dia(s).`;
    else if (policy.kind === "instant" && state.budget < policy.cost) disabledReason = "Verba insuficiente.";
    return {
      id: policy.id,
      name: policy.name,
      category: policy.category,
      summary: policy.summary,
      kind: policy.kind,
      cost: policy.cost,
      dailyCost: policy.dailyCost,
      maxUses: policy.maxUses,
      uses,
      active: state.activePolicies.includes(policy.id),
      readyIn,
      disabledReason,
    };
  });
  return {
    id: state.id,
    playerName: state.playerName,
    startId: state.startId,
    day: state.day,
    date: state.date,
    dateLabel: formatDate(state.date),
    status: state.status,
    endingTitle: state.endingTitle,
    endingText: state.endingText,
    score: state.score,
    budget: state.budget,
    income: view.income,
    upkeep: view.upkeep,
    research: state.research,
    vaccine: state.vaccineCoverage,
    order: view.order,
    occupancy: view.occupancy,
    apatiaBeds: view.apatiaBeds,
    parallelBeds: view.parallelBeds,
    capacity: view.capacity,
    infected: view.infected,
    recovered: view.recovered,
    dead: state.totalDead,
    factions: catalog.factions.map((faction) => ({
      id: faction.id,
      name: faction.name,
      description: faction.description,
      value: state.factions[faction.id] ?? 0,
    })),
    districts: catalog.districts.map((district) => {
      const snap = state.districts[district.id] ?? { infected: 0, recovered: 0, dead: 0 };
      return {
        ...district,
        ...snap,
        attackPer10k: district.population > 0 ? (snap.infected / district.population) * 10000 : 0,
      };
    }),
    policies,
    pending: event
      ? {
          id: event.id,
          title: event.title,
          category: event.category,
          text: event.body,
          choices: event.choices.map((choice) => ({
            id: choice.id,
            label: choice.label,
            affordable: state.budget + (choice.effects.budget ?? 0) >= 0,
          })),
        }
      : null,
    lastOutcome: state.lastOutcome,
    report: state.lastReport ? { ...state.lastReport, trips: state.lastReport.trips ?? [] } : null,
    log: state.log,
    modifiers: state.timedModifiers.map((modifier) => ({ name: modifier.name, daysLeft: modifier.daysLeft })),
    history: state.history,
    codex: [...catalog.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, topic: lesson.topic, body: lesson.body })), ...state.codexExtra],
    tips: catalog.tips.filter((tip) => tipMatches(tip, metrics)).slice(0, 2).map((tip) => tip.text),
    population: view.population,
  };
}
