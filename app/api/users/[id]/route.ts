import { NextResponse } from "next/server";
import {
  findUserByEmail,
  updateUser,
  findUserById,
  deleteUser,
} from "../../store";
import Joi from "joi";

const profileSchema = Joi.object({
  firstName: Joi.string().min(1).required().label("First Name"),
  lastName: Joi.string().min(1).required().label("Last Name"),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .label("Email"),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-().]{7,15}$/)
    .required()
    .label("Phone Number")
    .messages({ "string.pattern.base": "Please enter a valid phone number" }),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const body = await req.json();

  const { error, value } = profileSchema.validate(body, { abortEarly: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const emailTaken = findUserByEmail(value.email);
  if (emailTaken && Number(emailTaken.id) !== Number(id)) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    );
  }

  const updated = updateUser(id, value);
  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  const user = findUserById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  deleteUser(id);
  return NextResponse.json({ message: "Account deleted" });
}
