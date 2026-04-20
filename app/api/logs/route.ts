import { NextResponse } from "next/server";
import { diveLogBaseSchema } from "./data";
import { getAllDiveLogs, getDiveLogsForUser, insertDiveLog, setDiveGear, getOwnedGearIds } from "../store";
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

  const rawGearIds: unknown[] = Array.isArray(body.gearIds) ? body.gearIds : [];
  if (rawGearIds.some((id) => !Number.isInteger(id) || (id as number) <= 0)) {
    return NextResponse.json({ error: "gearIds must be positive integers" }, { status: 400 });
  }
  const gearIds = [...new Set(rawGearIds as number[])];
  if (gearIds.length > 0) {
    const owned = await getOwnedGearIds(targetUserId, gearIds);
    if (owned.length !== gearIds.length) {
      return NextResponse.json({ error: "One or more gear items do not belong to this user" }, { status: 400 });
    }
    await setDiveGear(newLog.id, gearIds);
  }

  return NextResponse.json(newLog, { status: 201 });
}
