import { NextResponse } from "next/server";
import { listSpecies } from "@/app/api/store";
import { getSession } from "@/app/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await listSpecies());
}
