import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { seedCatalog } from "@/content";
import { getRepo } from "@/lib/store";
import type { Catalog } from "@/lib/types";
import { validateCatalog } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.ADMIN_KEY?.trim() ?? "";
  const got = request.headers.get("x-admin-key") ?? "";
  const left = Buffer.from(expected);
  const right = Buffer.from(got);
  if (left.length < 12 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Chave do painel recusada." }, { status: 401 });
  try {
    const repo = await getRepo();
    return NextResponse.json({ catalog: await repo.catalog(), storage: repo.mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao ler o catálogo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Chave do painel recusada." }, { status: 401 });
  try {
    const body = (await request.json()) as { action?: string; catalog?: Catalog };
    const repo = await getRepo();
    if (body.action === "reset") {
      await repo.saveCatalog(seedCatalog());
      return NextResponse.json({ catalog: await repo.catalog(), storage: repo.mode });
    }
    if (!body.catalog) return NextResponse.json({ error: "Catálogo ausente." }, { status: 400 });
    const errors = validateCatalog(body.catalog);
    if (errors.length) return NextResponse.json({ error: "O conteúdo não passou na validação.", errors }, { status: 400 });
    await repo.saveCatalog(body.catalog);
    return NextResponse.json({ catalog: await repo.catalog(), storage: repo.mode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gravar o conteúdo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
