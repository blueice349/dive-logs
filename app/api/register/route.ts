import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { authSchema } from "../auth/data";
import { findUserByEmail, insertUser } from "../store";
import { setSession } from "@/app/lib/session";
import { toPublicUser } from "@/app/types/user";

const SALT_ROUNDS = 12;

export async function POST(req: Request) {
  const body = await req.json();

  const { error, value } = authSchema.validate(body, { abortEarly: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const existing = findUserByEmail(value.email);
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  // Hash the plain text password before storing
  const hashedPassword = await bcrypt.hash(value.password, SALT_ROUNDS);

  const user = insertUser({
    email: value.email,
    password: hashedPassword,
    firstName: value.firstName,
    lastName: value.lastName,
    phone: value.phone,
  });

  await setSession(user.id);
  return NextResponse.json(toPublicUser(user), { status: 201 });
}
