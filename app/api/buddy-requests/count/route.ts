import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { countPendingBuddyRequests } from "../../store";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await countPendingBuddyRequests(user.id);
  return NextResponse.json({ count });
}
