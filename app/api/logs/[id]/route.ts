import { NextResponse } from "next/server";
import { diveLogBaseSchema } from "../data";
import { updateDiveLog, deleteDiveLog } from "../../store";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = Number(id);

  const body = await req.json();
  const { error, value } = diveLogBaseSchema.validate(body, {
    abortEarly: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const updated = updateDiveLog(numericId, {
    ...value,
    date: value.date.split("T")[0],
  });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = Number(id);

  const deleted = deleteDiveLog(numericId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(deleted);
}
