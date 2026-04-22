import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  listDivePhotos,
  insertDivePhoto,
  deleteDivePhoto,
  updateDivePhotoCaption,
  userOwnsDiveLog,
} from "@/app/api/store";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const diveLogId = Number(id);

  if (!user.isAdmin && !(await userOwnsDiveLog(user.id, diveLogId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  if (!user.isAdmin && !(await userOwnsDiveLog(user.id, diveLogId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const MAX_BODY_BYTES = 8 * 1024 * 1024;   // 8 MB raw request — covers ~5 MB image after base64 + JSON overhead
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // 5 MB decoded image
  const MAX_CAPTION_LENGTH = 500;
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const dataUrlPattern = /^data:(image\/[a-z+]+);base64,/;

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Upload exceeds the 5 MB limit." }, { status: 413 });
  }

  const body = await req.json();
  const { photoData, caption } = body as { photoData?: string; caption?: string };

  if (!photoData || typeof photoData !== "string") {
    return NextResponse.json({ error: "photoData is required" }, { status: 400 });
  }
  const match = dataUrlPattern.exec(photoData);
  if (!match || !ALLOWED_IMAGE_TYPES.includes(match[1])) {
    return NextResponse.json(
      { error: "photoData must be a base64-encoded JPEG, PNG, WebP, or GIF data URL" },
      { status: 400 }
    );
  }

  // Compute decoded byte count from the base64 payload (accounts for = padding)
  const base64Payload = photoData.slice(match[0].length);
  const paddingChars = (base64Payload.match(/=+$/) ?? [""])[0].length;
  const decodedBytes = Math.floor(base64Payload.length * 3 / 4) - paddingChars;
  if (decodedBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image exceeds the 5 MB limit." }, { status: 413 });
  }

  if (caption && caption.length > MAX_CAPTION_LENGTH) {
    return NextResponse.json(
      { error: `Caption must be ${MAX_CAPTION_LENGTH} characters or fewer.` },
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
  if (photo.userId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deleted = await deleteDivePhoto(photoId, photo.userId);
  if (!deleted) {
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const photoIdParam = searchParams.get("photoId");
  if (!photoIdParam) {
    return NextResponse.json({ error: "photoId query param is required" }, { status: 400 });
  }

  const body = await req.json();
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  if (caption.length > 500) {
    return NextResponse.json({ error: "Caption must be 500 characters or fewer." }, { status: 400 });
  }

  const photoId = Number(photoIdParam);
  const photos = await listDivePhotos(Number(id));
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  if (photo.userId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await updateDivePhotoCaption(photoId, photo.userId, caption);
  if (!updated) return NextResponse.json({ error: "Failed to update caption" }, { status: 500 });
  return NextResponse.json(updated);
}
