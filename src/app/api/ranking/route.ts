import { NextResponse } from "next/server";
import { getRepo } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = await getRepo();
    const ranking = await repo.ranking();
    return NextResponse.json({ ranking, storage: repo.mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao ler o placar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
