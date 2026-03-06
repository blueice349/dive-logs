import { NextResponse } from "next/server";
import { diveLogs, diveLogBaseSchema, type DiveLog } from "../data";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = Number(id);

  const index = diveLogs.findIndex((log) => log.id === numericId);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { error, value } = diveLogBaseSchema.validate(body, {
    abortEarly: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const updated: DiveLog = {
    ...diveLogs[index],
    ...value,
    date: value.date.split("T")[0],
  };

  diveLogs[index] = updated;
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = Number(id);

  const index = diveLogs.findIndex((log) => log.id === numericId);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deleted = diveLogs[index];
  diveLogs.splice(index, 1);
  return NextResponse.json(deleted);
}
