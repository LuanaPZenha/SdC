import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { get, put } from "@vercel/blob";
import { Pool, type PoolClient } from "pg";
import { seedCatalog } from "@/content";
import type { Catalog, GameState, RankingEntry } from "@/lib/types";
import { validateCatalog } from "@/lib/validate";

type FileShape = {
  catalog: Catalog;
  games: Record<string, GameState>;
  ranking: RankingEntry[];
};

export type Repo = {
  mode: "postgres" | "arquivo" | "blob";
  catalog: () => Promise<Catalog>;
  saveCatalog: (catalog: Catalog) => Promise<void>;
  game: (id: string) => Promise<GameState | null>;
  saveGame: (state: GameState) => Promise<void>;
  ranking: () => Promise<RankingEntry[]>;
  addRanking: (entry: RankingEntry) => Promise<void>;
};

const filePath = path.join(process.cwd(), "data", "runtime.json");
const blobPath = "runtime.json";

function blobEnabled() {
  return Boolean(process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN);
}
let queue: Promise<unknown> = Promise.resolve();
let repoPromise: Promise<Repo> | null = null;

function locked<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readBlobDb(): Promise<FileShape> {
  const result = await get(blobPath, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) {
    const fresh: FileShape = { catalog: seedCatalog(), games: {}, ranking: [] };
    await writeBlobDb(fresh);
    return fresh;
  }
  const raw = await new Response(result.stream).text();
  const parsed = JSON.parse(raw) as FileShape;
  const errors = validateCatalog(parsed.catalog);
  if (errors.length) throw new Error(errors.join(" "));
  return parsed;
}

async function writeBlobDb(data: FileShape) {
  await put(blobPath, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function readFileDb(): Promise<FileShape> {
  if (blobEnabled()) return readBlobDb();
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as FileShape;
    const errors = validateCatalog(parsed.catalog);
    if (errors.length) throw new Error(errors.join(" "));
    return parsed;
  } catch (error) {
    const missing = error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
    if (!missing && !(error instanceof SyntaxError)) throw error;
    const fresh: FileShape = { catalog: seedCatalog(), games: {}, ranking: [] };
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(fresh), "utf8");
    return fresh;
  }
}

async function writeFileDb(data: FileShape) {
  if (blobEnabled()) {
    await writeBlobDb(data);
    return;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data), "utf8");
}

function fileRepo(): Repo {
  return {
    mode: blobEnabled() ? "blob" : "arquivo",
    async catalog() {
      return locked(async () => structuredClone((await readFileDb()).catalog));
    },
    async saveCatalog(catalog) {
      const errors = validateCatalog(catalog);
      if (errors.length) throw new Error(errors.join("\n"));
      await locked(async () => {
        const data = await readFileDb();
        data.catalog = catalog;
        await writeFileDb(data);
      });
    },
    async game(id) {
      return locked(async () => structuredClone((await readFileDb()).games[id] ?? null));
    },
    async saveGame(state) {
      await locked(async () => {
        const data = await readFileDb();
        data.games[state.id] = state;
        await writeFileDb(data);
      });
    },
    async ranking() {
      return locked(async () => structuredClone(sortRanking((await readFileDb()).ranking)).slice(0, 50));
    },
    async addRanking(entry) {
      await locked(async () => {
        const data = await readFileDb();
        if (data.ranking.some((item) => item.saveId === entry.saveId)) return;
        data.ranking.push(entry);
        await writeFileDb(data);
      });
    },
  };
}

function sortRanking(entries: RankingEntry[]): RankingEntry[] {
  return [...entries].sort(
    (a, b) =>
      b.daysSurvived - a.daysSurvived ||
      Number(b.outcome === "won") - Number(a.outcome === "won") ||
      b.score - a.score ||
      a.dead - b.dead,
  );
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL ausente.");
    const local = /localhost|127\.0\.0\.1/.test(connectionString);
    pool = new Pool({
      connectionString,
      max: 5,
      ssl: local ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function withClient<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

async function ensureSchema() {
  const sql = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  await withClient(async (client) => {
    for (const statement of statements) await client.query(statement);
    const count = await client.query("SELECT COUNT(*)::int AS total FROM parameters");
    if ((count.rows[0]?.total ?? 0) === 0) await writeCatalog(client, seedCatalog());
  });
}

async function writeCatalog(client: PoolClient, catalog: Catalog) {
  const errors = validateCatalog(catalog);
  if (errors.length) throw new Error(errors.join("\n"));
  await client.query("BEGIN");
  try {
    await client.query("DELETE FROM tips");
    await client.query("DELETE FROM lessons");
    await client.query("DELETE FROM events");
    await client.query("DELETE FROM policies");
    await client.query("DELETE FROM formulas");
    await client.query("DELETE FROM parameters");
    await client.query("DELETE FROM factions");
    await client.query("DELETE FROM districts");
    for (const district of catalog.districts) {
      await client.query(
        `INSERT INTO districts (id, name, official_district, population, elderly, tourism, commerce, schools, border, neighbors, svg_path, label_x, label_y)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13)`,
        [
          district.id,
          district.name,
          district.officialDistrict,
          district.population,
          district.elderly,
          district.tourism,
          district.commerce,
          district.schools,
          district.border,
          JSON.stringify(district.neighbors),
          district.path,
          district.labelX,
          district.labelY,
        ],
      );
    }
    for (const faction of catalog.factions) {
      await client.query("INSERT INTO factions (id, name, description, weight, start_value) VALUES ($1,$2,$3,$4,$5)", [
        faction.id,
        faction.name,
        faction.description,
        faction.weight,
        faction.start,
      ]);
    }
    for (const policy of catalog.policies) {
      await client.query(
        `INSERT INTO policies (id, name, category, summary, lesson, kind, cost, daily_cost, cooldown_days, max_uses, exclusive_group, effects)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
        [
          policy.id,
          policy.name,
          policy.category,
          policy.summary,
          policy.lesson,
          policy.kind,
          policy.cost,
          policy.dailyCost,
          policy.cooldownDays,
          policy.maxUses,
          policy.exclusiveGroup,
          JSON.stringify(policy.effects),
        ],
      );
    }
    for (const event of catalog.events) {
      await client.query(
        `INSERT INTO events (id, title, category, priority, opening, body, lesson, month_start, month_end, day_start, day_end, repeatable, cooldown, trigger, choices)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb)`,
        [
          event.id,
          event.title,
          event.category,
          event.priority,
          event.opening,
          event.body,
          event.lesson,
          event.monthStart,
          event.monthEnd,
          event.dayStart,
          event.dayEnd,
          event.repeatable,
          event.cooldown,
          JSON.stringify(event.trigger),
          JSON.stringify(event.choices),
        ],
      );
    }
    for (const lesson of catalog.lessons) {
      await client.query("INSERT INTO lessons (id, title, topic, body) VALUES ($1,$2,$3,$4)", [
        lesson.id,
        lesson.title,
        lesson.topic,
        lesson.body,
      ]);
    }
    for (const tip of catalog.tips) {
      await client.query("INSERT INTO tips (id, text, trigger) VALUES ($1,$2,$3::jsonb)", [tip.id, tip.text, JSON.stringify(tip.trigger)]);
    }
    for (const parameter of catalog.parameters) {
      await client.query("INSERT INTO parameters (key, value, label, hint) VALUES ($1,$2,$3,$4)", [
        parameter.key,
        parameter.value,
        parameter.label,
        parameter.hint,
      ]);
    }
    for (const item of catalog.formulas) {
      await client.query("INSERT INTO formulas (id, label, expression, explanation) VALUES ($1,$2,$3,$4)", [
        item.id,
        item.label,
        item.expression,
        item.explanation,
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function readCatalog(client: PoolClient): Promise<Catalog> {
  const [districts, factions, policies, events, lessons, tips, parameters, formulas] = await Promise.all([
    client.query("SELECT * FROM districts ORDER BY name"),
    client.query("SELECT * FROM factions ORDER BY name"),
    client.query("SELECT * FROM policies ORDER BY name"),
    client.query("SELECT * FROM events ORDER BY priority, title"),
    client.query("SELECT * FROM lessons ORDER BY title"),
    client.query("SELECT * FROM tips ORDER BY id"),
    client.query("SELECT * FROM parameters ORDER BY key"),
    client.query("SELECT * FROM formulas ORDER BY id"),
  ]);
  return {
    districts: districts.rows.map((row) => ({
      id: row.id,
      name: row.name,
      officialDistrict: row.official_district,
      population: Number(row.population),
      elderly: Number(row.elderly),
      tourism: Number(row.tourism),
      commerce: Number(row.commerce),
      schools: Number(row.schools),
      border: Number(row.border),
      neighbors: row.neighbors,
      path: row.svg_path,
      labelX: Number(row.label_x),
      labelY: Number(row.label_y),
    })),
    factions: factions.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      weight: Number(row.weight),
      start: Number(row.start_value),
    })),
    policies: policies.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      summary: row.summary,
      lesson: row.lesson,
      kind: row.kind,
      cost: Number(row.cost),
      dailyCost: Number(row.daily_cost),
      cooldownDays: Number(row.cooldown_days),
      maxUses: row.max_uses == null ? null : Number(row.max_uses),
      exclusiveGroup: row.exclusive_group,
      effects: row.effects,
    })),
    events: events.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      priority: Number(row.priority),
      opening: Boolean(row.opening),
      body: row.body,
      lesson: row.lesson,
      monthStart: row.month_start == null ? null : Number(row.month_start),
      monthEnd: row.month_end == null ? null : Number(row.month_end),
      dayStart: row.day_start == null ? null : Number(row.day_start),
      dayEnd: row.day_end == null ? null : Number(row.day_end),
      repeatable: Boolean(row.repeatable),
      cooldown: Number(row.cooldown),
      trigger: row.trigger,
      choices: row.choices,
    })),
    lessons: lessons.rows.map((row) => ({ id: row.id, title: row.title, topic: row.topic, body: row.body })),
    tips: tips.rows.map((row) => ({ id: row.id, text: row.text, trigger: row.trigger })),
    parameters: parameters.rows.map((row) => ({
      key: row.key,
      value: Number(row.value),
      label: row.label,
      hint: row.hint,
    })),
    formulas: formulas.rows.map((row) => ({
      id: row.id,
      label: row.label,
      expression: row.expression,
      explanation: row.explanation,
    })),
  };
}

function postgresRepo(): Repo {
  return {
    mode: "postgres",
    async catalog() {
      return withClient(readCatalog);
    },
    async saveCatalog(catalog) {
      await withClient((client) => writeCatalog(client, catalog));
    },
    async game(id) {
      return withClient(async (client) => {
        const result = await client.query("SELECT state FROM saves WHERE id = $1", [id]);
        return (result.rows[0]?.state as GameState | undefined) ?? null;
      });
    },
    async saveGame(state) {
      await withClient(async (client) => {
        await client.query(
          `INSERT INTO saves (id, player_name, status, days_survived, research, state)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)
           ON CONFLICT (id) DO UPDATE SET player_name = $2, status = $3, days_survived = $4, research = $5, state = $6::jsonb, updated_at = now()`,
          [state.id, state.playerName, state.status, state.day, state.research, JSON.stringify(state)],
        );
      });
    },
    async ranking() {
      return withClient(async (client) => {
        const result = await client.query(
          `SELECT id, save_id, player_name, days_survived, research, dead, score, outcome, ending_title, created_at
           FROM ranking ORDER BY days_survived DESC, CASE WHEN outcome = 'won' THEN 1 ELSE 0 END DESC, score DESC, dead ASC LIMIT 50`,
        );
        return result.rows.map(mapRanking);
      });
    },
    async addRanking(entry) {
      await withClient(async (client) => {
        await client.query(
          `INSERT INTO ranking (id, save_id, player_name, days_survived, research, dead, score, outcome, ending_title)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (save_id) DO NOTHING`,
          [entry.id, entry.saveId, entry.playerName, entry.daysSurvived, entry.research, entry.dead, entry.score, entry.outcome, entry.endingTitle],
        );
      });
    },
  };
}

function mapRanking(row: Record<string, unknown>): RankingEntry {
  return {
    id: String(row.id),
    saveId: String(row.save_id),
    playerName: String(row.player_name),
    daysSurvived: Number(row.days_survived),
    research: Number(row.research),
    dead: Number(row.dead),
    score: Number(row.score),
    outcome: row.outcome === "won" ? "won" : "lost",
    endingTitle: String(row.ending_title),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function getRepo(): Promise<Repo> {
  if (!repoPromise) {
    repoPromise = (async () => {
      if (process.env.DATABASE_URL) {
        try {
          await ensureSchema();
          return postgresRepo();
        } catch (error) {
          console.error("PostgreSQL indisponível. O jogo segue no arquivo local.", error);
        }
      }
      return fileRepo();
    })();
  }
  return repoPromise;
}

export function newId(): string {
  return randomUUID();
}
