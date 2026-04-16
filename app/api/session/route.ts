import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findSession } from "../store";

export async function GET() {
  const store = await cookies();
  const token = store.get("session_token")?.value;
  if (!token) return NextResponse.json({ valid: false }, { status: 401 });
  const user = await findSession(token);
  if (!user) return NextResponse.json({ valid: false }, { status: 401 });
  return NextResponse.json({ valid: true });
}
