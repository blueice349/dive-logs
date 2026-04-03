import { NextResponse } from "next/server";
import { findUserById, updateUser } from "../../../store";
import { getSession } from "@/app/lib/session";
import Joi from "joi";
import bcrypt from "bcrypt";

const passwordSchema = Joi.object({
  currentPassword: Joi.string().required().label("Current Password"),
  newPassword: Joi.string().min(4).required().label("New Password"),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);

  if (session.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const { error, value } = passwordSchema.validate(body, { abortEarly: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const user = findUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const match = await bcrypt.compare(value.currentPassword, user.password);
  if (!match) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  const hashed = await bcrypt.hash(value.newPassword, 12);
  updateUser(id, { password: hashed });
  return NextResponse.json({ success: true });
}
