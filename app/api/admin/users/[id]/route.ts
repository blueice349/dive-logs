import { NextResponse } from "next/server";
import { findUserById, findUserByEmail, updateUser, deleteUser } from "../../../store";
import { getSession } from "@/app/lib/session";
import { profileSchema } from "@/app/api/users/data";
import Joi from "joi";

const adminProfileSchema = profileSchema.keys({
  isAdmin: Joi.number().integer().valid(0, 1).required().label("Admin"),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const existing = await findUserById(id);
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { error, value } = adminProfileSchema.validate(body, { abortEarly: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const emailTaken = await findUserByEmail(value.email);
  if (emailTaken && emailTaken.id !== id) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const updated = await updateUser(id, value);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const user = await findUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await deleteUser(id);
  return NextResponse.json({ message: "User deleted" });
}
