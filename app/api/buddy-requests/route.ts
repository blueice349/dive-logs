import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getPendingBuddyRequests, updateBuddyRequest } from "../store";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await getPendingBuddyRequests(user.id);
  return NextResponse.json(requests);
}

export async function PATCH(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action } = body as { id: number; action: string };

  if (!id || !Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  if (action !== "confirm" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'confirm' or 'decline'" }, { status: 400 });
  }

  const status = action === "confirm" ? "confirmed" : "declined";
  const updated = await updateBuddyRequest(id, user.id, status);
  if (!updated) {
    return NextResponse.json({ error: "Request not found or not yours" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
