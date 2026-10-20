export type EffectBag = {
  budget?: number;
  capacity?: number;
  research?: number;
  researchDaily?: number;
  vaccine?: number;
  lethalityAdd?: number;
  factions?: Record<string, number>;
  factionsDaily?: Record<string, number>;
  infect?: Record<string, number>;
  deaths?: number;
  cancelPolicies?: string[];
  durationDays?: number;
  income?: number;
  betaAdd?: number;
  betaMult?: number;
  protection?: number;
  quarantine?: number;
  barriers?: number;
  tourism?: number;
  mobility?: number;
  schoolClosure?: number;
  elderlyRisk?: number;
  gathering?: number;
  passport?: number;
  surgeBeds?: number;
  comms?: number;
};

export const EFFECT_KEYS = [
  "budget",
  "capacity",
  "research",
  "researchDaily",
  "vaccine",
  "lethalityAdd",
  "factions",
  "factionsDaily",
  "infect",
  "deaths",
  "cancelPolicies",
  "durationDays",
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
] as const;

export type Trigger =
  | { type: "calendar"; chance?: number }
  | { type: "random"; chance: number }
  | { type: "metric"; metric: string; op: "gt" | "lt" | "gte" | "lte"; value: number }
  | { type: "all"; all: Trigger[] };

export type District = {
  id: string;
  name: string;
  officialDistrict: string;
  population: number;
  elderly: number;
  tourism: number;
  commerce: number;
  schools: number;
  border: number;
  neighbors: string[];
  path: string;
  labelX: number;
  labelY: number;
};

export type Faction = {
  id: string;
  name: string;
  description: string;
  weight: number;
  start: number;
};

export type Policy = {
  id: string;
  name: string;
  category: "saude" | "fronteiras" | "pesquisa" | "faccoes";
  summary: string;
  lesson: string;
  kind: "instant" | "sustained";
  cost: number;
  dailyCost: number;
  cooldownDays: number;
  maxUses: number | null;
  exclusiveGroup: string | null;
  effects: EffectBag;
};

export type EventChoice = {
  id: string;
  label: string;
  outcome: string;
  lesson: string;
  effects: EffectBag;
};

export type GameEvent = {
  id: string;
  title: string;
  category: string;
  priority: number;
  opening: boolean;
  body: string;
  lesson: string;
  monthStart: number | null;
  monthEnd: number | null;
  dayStart: number | null;
  dayEnd: number | null;
  repeatable: boolean;
  cooldown: number;
  trigger: Trigger;
  choices: EventChoice[];
};

export type Lesson = {
  id: string;
  title: string;
  topic: string;
  body: string;
};

export type Tip = {
  id: string;
  text: string;
  trigger: Trigger;
};

export type Parameter = {
  key: string;
  value: number;
  label: string;
  hint: string;
};

export type Formula = {
  id: string;
  label: string;
  expression: string;
  explanation: string;
};

export type Catalog = {
  districts: District[];
  factions: Faction[];
  policies: Policy[];
  events: GameEvent[];
  lessons: Lesson[];
  tips: Tip[];
  parameters: Parameter[];
  formulas: Formula[];
};

export type DistrictSnapshot = {
  infected: number;
  recovered: number;
  dead: number;
};

export type TimedModifier = {
  id: string;
  name: string;
  daysLeft: number;
  effects: EffectBag;
};

export type DayReport = {
  day: number;
  date: string;
  newInfections: number;
  recoveries: number;
  deaths: number;
  income: number;
  expenses: number;
  researchGain: number;
  occupancy: number;
  notes: string[];
};

export type CodexEntry = {
  id: string;
  title: string;
  topic: string;
  body: string;
};

export type OutcomeNote = {
  title: string;
  text: string;
  lesson: string;
};

export type GameState = {
  id: string;
  playerName: string;
  startId: string;
  day: number;
  date: string;
  budget: number;
  capacity: number;
  research: number;
  vaccineCoverage: number;
  lethalityShift: number;
  parallelExtra: number;
  factions: Record<string, number>;
  districts: Record<string, DistrictSnapshot>;
  activePolicies: string[];
  timedModifiers: TimedModifier[];
  fired: Record<string, number>;
  policyUses: Record<string, number>;
  cooldowns: Record<string, number>;
  log: { day: number; text: string }[];
  overloadStreak: number;
  disorderStreak: number;
  deathsToday: number;
  totalDead: number;
  pendingEventId: string | null;
  lastOutcome: OutcomeNote | null;
  lastReport: DayReport | null;
  history: { day: number; infected: number; dead: number; occupancy: number; research: number; order: number }[];
  codexExtra: CodexEntry[];
  status: "playing" | "won" | "lost";
  endingTitle: string | null;
  endingText: string | null;
  score: number;
  ranked: boolean;
  rngState: number;
};

export type DistrictView = District & DistrictSnapshot & { attackPer10k: number };

export type PolicyView = {
  id: string;
  name: string;
  category: Policy["category"];
  summary: string;
  kind: Policy["kind"];
  cost: number;
  dailyCost: number;
  maxUses: number | null;
  uses: number;
  active: boolean;
  readyIn: number;
  disabledReason: string | null;
};

export type GameView = {
  id: string;
  playerName: string;
  startId: string;
  day: number;
  date: string;
  dateLabel: string;
  status: GameState["status"];
  endingTitle: string | null;
  endingText: string | null;
  score: number;
  budget: number;
  income: number;
  upkeep: number;
  research: number;
  vaccine: number;
  order: number;
  occupancy: number;
  apatiaBeds: number;
  parallelBeds: number;
  capacity: number;
  infected: number;
  recovered: number;
  dead: number;
  factions: { id: string; name: string; description: string; value: number }[];
  districts: DistrictView[];
  policies: PolicyView[];
  pending: {
    id: string;
    title: string;
    category: string;
    text: string;
    choices: { id: string; label: string; affordable: boolean }[];
  } | null;
  lastOutcome: OutcomeNote | null;
  report: DayReport | null;
  log: { day: number; text: string }[];
  modifiers: { name: string; daysLeft: number }[];
  history: GameState["history"];
  codex: CodexEntry[];
  tips: string[];
  population: number;
};

export type RankingEntry = {
  id: string;
  saveId: string;
  playerName: string;
  daysSurvived: number;
  research: number;
  dead: number;
  score: number;
  outcome: "won" | "lost";
  endingTitle: string;
  createdAt: string;
};

export type Action =
  | { type: "toggle"; policyId: string }
  | { type: "instant"; policyId: string }
  | { type: "choose"; choiceId: string }
  | { type: "endDay" };
