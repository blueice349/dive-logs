import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setSession } from "@/app/lib/session";
import { clearSession } from "@/app/lib/session";

export async function POST() {
  const store = await cookies();
  const adminId = store.get("impersonating_admin_id")?.value;
  if (!adminId) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
  }

  // Clear the impersonated session and restore the admin's session
  await clearSession();
  await setSession(Number(adminId));

  const res = NextResponse.json({ success: true });
  res.cookies.delete("impersonating_admin_id");
  return res;
}
