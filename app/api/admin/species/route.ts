import { NextResponse } from "next/server";
import { listSpecies, insertSpecies } from "@/app/api/store";
import { getSession } from "@/app/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await listSpecies());
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const category = typeof body.category === "string" ? body.category.trim() || undefined : undefined;

  try {
    const species = await insertSpecies(name, category);
    return NextResponse.json(species, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Species already exists" }, { status: 409 });
  }
}
