import { NextResponse } from "next/server";
import { listUsers, findUserByEmail, insertUser } from "../../store";
import { getSession } from "@/app/lib/session";
import { profileSchema } from "@/app/api/users/data";
import { toPublicUser } from "@/app/types/user";
import Joi from "joi";
import bcrypt from "bcrypt";

const createUserSchema = profileSchema.keys({
  password: Joi.string().min(4).required().label("Password"),
  isAdmin: Joi.number().integer().valid(0, 1).default(0).label("Admin"),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { error, value } = createUserSchema.validate(body, { abortEarly: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const existing = findUserByEmail(value.email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(value.password, 12);
  const user = insertUser({
    email: value.email,
    password: hashed,
    firstName: value.firstName,
    lastName: value.lastName,
    phone: value.phone,
    isAdmin: value.isAdmin,
  });

  return NextResponse.json(toPublicUser(user), { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(listUsers());
}
