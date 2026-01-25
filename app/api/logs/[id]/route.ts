import { NextResponse } from "next/server";
import { diveLogs, DiveLog } from "../data";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const numericId = Number(id);

  const body = await req.json();

  const index = diveLogs.findIndex((log) => log.id === numericId);
  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated: DiveLog = {
    ...diveLogs[index],
    ...body,
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
