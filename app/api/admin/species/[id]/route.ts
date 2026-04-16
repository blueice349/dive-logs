import { NextResponse } from "next/server";
import { deleteSpecies } from "@/app/api/store";
import { getSession } from "@/app/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const numId = Number(id);
  if (!numId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await deleteSpecies(numId);
  return new NextResponse(null, { status: 204 });
}
