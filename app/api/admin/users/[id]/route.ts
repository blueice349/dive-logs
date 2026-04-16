import { NextResponse } from "next/server";
import { findUserById, findUserByEmail, updateUser, deleteUser, setUserActive } from "../../../store";
import { getSession, setSession } from "@/app/lib/session";
import { profileSchema } from "@/app/api/users/data";
import { passwordRule } from "@/app/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });

  const target = await findUserById(id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { action } = body;

  if (action === "suspend") {
    if (id === session.id) return NextResponse.json({ error: "Cannot suspend yourself" }, { status: 400 });
    await setUserActive(id, 0);
    return NextResponse.json({ ok: true });
  }

  if (action === "unsuspend") {
    await setUserActive(id, 1);
    return NextResponse.json({ ok: true });
  }

  if (action === "resetPassword") {
    const schema = Joi.object({ action: Joi.string(), password: passwordRule.label("Password") });
    const { error, value } = schema.validate(body, { abortEarly: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const hashed = await bcrypt.hash(value.password, 10);
    await updateUser(id, { password: hashed });
    return NextResponse.json({ ok: true });
  }

  if (action === "impersonate") {
    if (id === session.id) return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
    if (target.isActive === 0) return NextResponse.json({ error: "Cannot impersonate a suspended user" }, { status: 400 });
    const store = await cookies();
    store.set("impersonating_admin_id", String(session.id), { httpOnly: true, path: "/", sameSite: "lax" });
    await setSession(id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
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
