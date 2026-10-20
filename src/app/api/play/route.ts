import { NextResponse } from "next/server";
import { applyAction, buildView, createInitialState, ensureClock } from "@/lib/engine";
import { findStart } from "@/lib/starts";
import { getRepo, newId } from "@/lib/store";
import type { GameState, RankingEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lanes = new Map<string, Promise<unknown>>();

function lane<T>(id: string, work: () => Promise<T>): Promise<T> {
  const previous = lanes.get(id) ?? Promise.resolve();
  const run = previous.then(work, work);
  lanes.set(
    id,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

type Body = {
  action?: string;
  id?: string;
  playerName?: string;
  startId?: string;
  policyId?: string;
  choiceId?: string;
};

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 24) return null;
  if (/[\u0000-\u001f]/.test(name)) return null;
  return name;
}

async function publish(previous: GameState | null, state: GameState) {
  const repo = await getRepo();
  if (previous?.status === "playing" && state.status !== "playing" && !state.ranked) {
    const entry: RankingEntry = {
      id: newId(),
      saveId: state.id,
      playerName: state.playerName,
      daysSurvived: state.day,
      research: state.research,
      dead: state.totalDead,
      score: state.score,
      outcome: state.status === "won" ? "won" : "lost",
      endingTitle: state.endingTitle ?? "Gestão encerrada",
      createdAt: new Date().toISOString(),
    };
    await repo.addRanking(entry);
    state.ranked = true;
  }
  await repo.saveGame(state);
  const catalog = await repo.catalog();
  return buildView(state, catalog);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const repo = await getRepo();
    const catalog = await repo.catalog();
    if (body.action === "create") {
      const playerName = cleanName(body.playerName);
      if (!playerName) return NextResponse.json({ error: "Informe um nome com 2 a 24 caracteres." }, { status: 400 });
      const start = findStart(body.startId ?? "fevereiro");
      if (!start) return NextResponse.json({ error: "Data inicial inválida." }, { status: 400 });
      const state = createInitialState(playerName, catalog, newId(), start.id);
      const view = await publish(null, state);
      return NextResponse.json({ view });
    }
    if (!body.id) return NextResponse.json({ error: "Partida não informada." }, { status: 400 });
    return await lane(body.id, async () => {
      const current = await repo.game(body.id ?? "");
      if (!current) return NextResponse.json({ error: "Partida não encontrada." }, { status: 404 });
      if (body.action === "load") {
        const next = structuredClone(current);
        if (ensureClock(next)) await repo.saveGame(next);
        return NextResponse.json({ view: buildView(next, catalog) });
      }
      const action =
        body.action === "toggle"
          ? { type: "toggle" as const, policyId: body.policyId ?? "" }
          : body.action === "instant"
            ? { type: "instant" as const, policyId: body.policyId ?? "" }
            : body.action === "choose"
              ? { type: "choose" as const, choiceId: body.choiceId ?? "" }
              : body.action === "end"
                ? { type: "endDay" as const }
                : body.action === "tick"
                  ? { type: "tick" as const }
                  : null;
      if (!action) return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
      const result = applyAction(current, catalog, action);
      if (result.error) return NextResponse.json({ error: result.error, view: buildView(current, catalog) }, { status: 400 });
      if (result.changed === false) return NextResponse.json({ view: buildView(result.state, catalog) });
      const view = await publish(current, result.state);
      return NextResponse.json({ view });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar a jogada.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
