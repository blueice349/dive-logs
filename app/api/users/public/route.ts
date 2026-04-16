import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { listPublicUsers } from "../../store";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = await listPublicUsers();
  return NextResponse.json(users);
}
