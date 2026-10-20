import { NextResponse } from "next/server";
import { getRepo } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = await getRepo();
    const catalog = await repo.catalog();
    return NextResponse.json({
      storage: repo.mode,
      districts: catalog.districts.length,
      policies: catalog.policies.length,
      events: catalog.events.length,
      lessons: catalog.lessons.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao ler o conteúdo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
