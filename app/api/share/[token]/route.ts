import { NextResponse } from "next/server";
import { getPublicProfile } from "@/app/api/store";

export async function GET(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const profile = await getPublicProfile(token);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}
