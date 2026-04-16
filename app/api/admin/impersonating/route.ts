import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserById } from "../../store";

export async function GET() {
  const store = await cookies();
  const adminId = store.get("impersonating_admin_id")?.value;
  if (!adminId) return NextResponse.json({ impersonating: false });
  const admin = await findUserById(Number(adminId));
  return NextResponse.json({
    impersonating: true,
    adminName: admin ? `${admin.firstName} ${admin.lastName}` : "Admin",
  });
}
