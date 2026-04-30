import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { generateShareToken, clearShareToken, getShareTokenForUser } from "../../store";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await getShareTokenForUser(user.id);
  if (!token) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, token, path: `/share/${token}` });
}

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await generateShareToken(user.id);
  return NextResponse.json({ enabled: true, token, path: `/share/${token}` });
}

export async function DELETE() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await clearShareToken(user.id);
  return NextResponse.json({ enabled: false });
}
