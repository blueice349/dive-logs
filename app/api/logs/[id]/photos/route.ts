import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  listDivePhotos,
  insertDivePhoto,
  deleteDivePhoto,
  getDiveLogsForUser,
} from "@/app/api/store";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const diveLogId = Number(id);

  // Verify ownership: admin can see any, regular user must own the dive
  if (!user.isAdmin) {
    const logs = await getDiveLogsForUser(user.id);
    const owns = logs.some((l) => l.id === diveLogId);
    if (!owns) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const photos = await listDivePhotos(diveLogId);
  return NextResponse.json(photos);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const diveLogId = Number(id);

  // Verify ownership
  const logs = await getDiveLogsForUser(user.id);
  const owns = logs.some((l) => l.id === diveLogId);
  if (!owns && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { photoData, caption } = body as { photoData?: string; caption?: string };

  if (!photoData || typeof photoData !== "string") {
    return NextResponse.json({ error: "photoData is required" }, { status: 400 });
  }
  if (!photoData.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "photoData must be a base64 image data URL (starting with data:image/)" },
      { status: 400 }
    );
  }

  const photo = await insertDivePhoto(diveLogId, user.id, photoData, caption);
  return NextResponse.json(photo, { status: 201 });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const diveLogId = Number(id);
  const { searchParams } = new URL(req.url);
  const photoIdParam = searchParams.get("photoId");

  if (!photoIdParam) {
    return NextResponse.json({ error: "photoId query param is required" }, { status: 400 });
  }

  const photoId = Number(photoIdParam);

  // Verify the photo belongs to this dive log and this user
  const photos = await listDivePhotos(diveLogId);
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }
  if (photo.user_id !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deleted = await deleteDivePhoto(photoId, photo.user_id);
  if (!deleted) {
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
