import { NextResponse } from "next/server";
import { clearSession } from "@/app/lib/session";

export async function POST() {
  await clearSession();
  return NextResponse.json({ message: "Logged out" });
}
