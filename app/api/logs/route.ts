import { NextResponse } from "next/server";
import { diveLogBaseSchema } from "./data";
import { getAllDiveLogs, getDiveLogsForUser, insertDiveLog, createBuddyRequest, findUserById } from "../store";
import { getSession } from "@/app/lib/session";

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const wantsAll = searchParams.get("filter") === "all";
  if (wantsAll && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const logs = wantsAll ? await getAllDiveLogs() : await getDiveLogsForUser(user.id);
  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { error, value } = diveLogBaseSchema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const targetUserId =
    user.isAdmin && Number.isInteger(body.userId) && body.userId > 0
      ? body.userId
      : user.id;

  const newLog = await insertDiveLog(
    { ...value, date: value.date.split("T")[0] },
    targetUserId
  );

  if (value.buddyUserId && value.buddyUserId !== targetUserId) {
    const buddyExists = await findUserById(value.buddyUserId);
    if (buddyExists) {
      await createBuddyRequest(newLog.id, targetUserId, value.buddyUserId);
    }
  }

  return NextResponse.json(newLog, { status: 201 });
}
