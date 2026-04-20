import { NextResponse } from "next/server";
import { diveLogBaseSchema } from "../data";
import { updateDiveLog, adminUpdateDiveLog, deleteDiveLog, setDiveGear, getDiveGear, getOwnedGearIds } from "../../store";
import { getSession } from "@/app/lib/session";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const gearIds = await getDiveGear(Number(id));
  return NextResponse.json({ gearIds });
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const numericId = Number(id);

  const body = await req.json();
  const { error, value } = diveLogBaseSchema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const logData = { ...value, date: value.date.split("T")[0] };
  const logOwnerId = user.isAdmin && Number.isInteger(body.userId) && body.userId > 0 ? body.userId : user.id;
  const updated = user.isAdmin
    ? await adminUpdateDiveLog(numericId, logData, logOwnerId)
    : await updateDiveLog(numericId, user.id, logData);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawGearIds: unknown[] = Array.isArray(body.gearIds) ? body.gearIds : [];
  if (rawGearIds.some((id) => !Number.isInteger(id) || (id as number) <= 0)) {
    return NextResponse.json({ error: "gearIds must be positive integers" }, { status: 400 });
  }
  const gearIds = [...new Set(rawGearIds as number[])];
  if (gearIds.length > 0) {
    const owned = await getOwnedGearIds(logOwnerId, gearIds);
    if (owned.length !== gearIds.length) {
      return NextResponse.json({ error: "One or more gear items do not belong to this user" }, { status: 400 });
    }
  }
  await setDiveGear(numericId, gearIds);

  return NextResponse.json({ ...updated, gearIds });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await deleteDiveLog(Number(id), user.id);

  if (result.status === "not_found") {
    return NextResponse.json({ error: "Dive log not found." }, { status: 404 });
  }
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "You do not have permission to delete this dive log." }, { status: 403 });
  }

  return NextResponse.json(result.log);
}
