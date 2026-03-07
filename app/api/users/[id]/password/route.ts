import { NextResponse } from "next/server";
import { findUserById, updateUser } from "../../../store";
import Joi from "joi";

const passwordSchema = Joi.object({
  currentPassword: Joi.string().required().label("Current Password"),
  newPassword: Joi.string().min(4).required().label("New Password"),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const body = await req.json();

  const { error, value } = passwordSchema.validate(body, { abortEarly: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const user = findUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.password !== value.currentPassword) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  updateUser(id, { password: value.newPassword });
  return NextResponse.json({ success: true });
}
