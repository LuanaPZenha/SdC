import { seedCatalog } from "../src/content";
import { applyAction, createInitialState, project } from "../src/lib/engine";
import type { EffectBag, EventChoice, GameState } from "../src/lib/types";

const catalog = seedCatalog();

function affordable(state: GameState, choice: EventChoice) {
  return state.budget + (choice.effects.budget ?? 0) >= 0;
}

function choiceScore(effects: EffectBag): number {
  const infect = Object.values(effects.infect ?? {}).reduce((sum, value) => sum + value, 0);
  return (
    -(effects.gathering ?? 1) * 24 +
    (effects.vaccine ?? 0) * 2 +
    (effects.research ?? 0) +
    (effects.factions?.saude ?? 0) +
    (effects.factions?.civil ?? 0) * 0.2 -
    infect / 8 -
    (effects.deaths ?? 0) * 4 -
    Math.max(0, -(effects.budget ?? 0)) * 0.4 -
    Math.max(0, effects.betaAdd ?? 0) * 40 -
    Math.max(0, effects.surgeBeds ?? 0) / 2
  );
}

function ready(state: GameState, id: string) {
  const policy = catalog.policies.find((item) => item.id === id);
  if (!policy) return false;
  if (state.budget < policy.cost) return false;
  if ((state.cooldowns[id] ?? 0) > state.day) return false;
  if (policy.maxUses != null && (state.policyUses[id] ?? 0) >= policy.maxUses) return false;
  return true;
}

function act(state: GameState, action: Parameters<typeof applyAction>[2]) {
  const result = applyAction(state, catalog, action);
  if (result.error) return state;
  return result.state;
}

function play(kind: "negligente" | "atenta", seedName: string) {
  let state = createInitialState(seedName, catalog, `sim-${seedName}`, "fevereiro");
  for (let guard = 0; guard < 320 && state.status === "playing"; guard += 1) {
    if (state.pendingEventId) {
      const event = catalog.events.find((item) => item.id === state.pendingEventId);
      const choices = (event?.choices ?? []).filter((choice) => affordable(state, choice));
      const ranked = [...choices].sort((a, b) => choiceScore(a.effects) - choiceScore(b.effects));
      const choice = kind === "negligente" ? ranked[0] : ranked[ranked.length - 1];
      if (!choice) break;
      state = act(state, { type: "choose", choiceId: choice.id });
      if (state.status !== "playing") break;
    }
    if (kind === "atenta") state = manage(state);
    if (state.status !== "playing") break;
    if (state.pendingEventId) continue;
    state = act(state, { type: "endDay" });
  }
  const view = project(state, catalog);
  return { state, view };
}

function manage(state: GameState) {
  const view = project(state, catalog);
  const has = (id: string) => state.activePolicies.includes(id);
  const toggle = (id: string, on: boolean) => {
    if (has(id) === on) return;
    state = act(state, { type: "toggle", policyId: id });
  };
  if (view.occupancy > 0.5 && ready(state, "abrir-leitos")) state = act(state, { type: "instant", policyId: "abrir-leitos" });
  if (view.occupancy > 0.9 && ready(state, "contratar-equipes")) state = act(state, { type: "instant", policyId: "contratar-equipes" });
  if ((state.factions.saude ?? 100) < 50 && ready(state, "bonificar-saude")) state = act(state, { type: "instant", policyId: "bonificar-saude" });
  if ((state.factions.comerciantes ?? 100) < 55 && (view.mods.quarantine ?? 0) > 0.3 && ready(state, "compensar-comerciantes")) {
    state = act(state, { type: "instant", policyId: "compensar-comerciantes" });
  }
  if (state.vaccineCoverage < 88 && state.day < 50 && ready(state, "vacinacao-bloqueio") && state.budget > 8) {
    state = act(state, { type: "instant", policyId: "vacinacao-bloqueio" });
  }
  if (view.parallelBeds > 28 && ready(state, "fumigacao") && state.budget > 7) state = act(state, { type: "instant", policyId: "fumigacao" });
  if (view.infected > 40 && ready(state, "kits-protecao") && state.budget > 8) state = act(state, { type: "instant", policyId: "kits-protecao" });
  const hard = view.occupancy > 0.7 || (view.mods.gathering ?? 1) >= 2;
  if (hard && state.budget > 5) toggle("quarentena-rigida", true);
  else if (view.infected > 80 || view.occupancy > 0.4 || (view.mods.gathering ?? 1) > 1.15) toggle("quarentena-parcial", true);
  else {
    toggle("quarentena-rigida", false);
    toggle("quarentena-parcial", false);
  }
  const fresh = project(state, catalog);
  const rigidOn = state.activePolicies.includes("quarentena-rigida");
  if (!rigidOn && fresh.occupancy < 0.7 && state.budget > 7) toggle("pesquisa-intensiva", true);
  else if (state.budget > 3) toggle("pesquisa-basica", true);
  else {
    toggle("pesquisa-intensiva", false);
    toggle("pesquisa-basica", false);
  }
  return state;
}

function assertState(state: GameState) {
  for (const district of catalog.districts) {
    const snap = state.districts[district.id];
    if (!snap) throw new Error(`Bairro sem estado: ${district.id}`);
    const total = snap.infected + snap.recovered + snap.dead;
    if (total > district.population + 1) throw new Error(`População estourada em ${district.name}`);
    if ([snap.infected, snap.recovered, snap.dead, state.budget, state.research].some((value) => !Number.isFinite(value))) {
      throw new Error("Número inválido no estado.");
    }
  }
}

const failures: string[] = [];
for (const name of ["Ana", "Bruno", "Caio"]) {
  const negligent = play("negligente", name);
  const careful = play("atenta", name);
  assertState(negligent.state);
  assertState(careful.state);
  console.log(
    `${name} negligente: ${negligent.state.status} dia ${negligent.state.day} pesquisa ${negligent.state.research.toFixed(1)} infectados ${negligent.view.infected} óbitos ${negligent.state.totalDead}`,
  );
  console.log(
    `${name} atenta: ${careful.state.status} dia ${careful.state.day} pesquisa ${careful.state.research.toFixed(1)} infectados ${careful.view.infected} óbitos ${careful.state.totalDead} pico ${(Math.max(...careful.state.history.map((item) => item.occupancy), 0) * 100).toFixed(0)}%`,
  );
  if (negligent.state.status !== "lost" || negligent.state.day > 200) failures.push(`${name}: omissão não perdeu ao longo do calendário.`);
  if (careful.state.status !== "won") failures.push(`${name}: gestão atenta não chegou à cura (${careful.state.status}, dia ${careful.state.day}).`);
  if (careful.state.day <= negligent.state.day && careful.state.status !== "won") failures.push(`${name}: gestão atenta não durou mais.`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Simulação consistente.");
