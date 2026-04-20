import { NextResponse } from "next/server";
import { diveLogBaseSchema } from "../data";
import { updateDiveLog, adminUpdateDiveLog, deleteDiveLog, createBuddyRequest, findUserById } from "../../store";
import { getSession } from "@/app/lib/session";

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
  const updated = user.isAdmin
    ? await adminUpdateDiveLog(
        numericId,
        logData,
        Number.isInteger(body.userId) && body.userId > 0 ? body.userId : user.id
      )
    : await updateDiveLog(numericId, user.id, logData);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetUserId = user.isAdmin && Number.isInteger(body.userId) && body.userId > 0 ? body.userId : user.id;
  if (value.buddyUserId && value.buddyUserId !== targetUserId) {
    const buddyExists = await findUserById(value.buddyUserId);
    if (buddyExists) {
      await createBuddyRequest(numericId, targetUserId, value.buddyUserId);
    }
  }

  return NextResponse.json(updated);
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
