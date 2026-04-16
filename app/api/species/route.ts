import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { listSpecies } from "../store";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listSpecies());
}
