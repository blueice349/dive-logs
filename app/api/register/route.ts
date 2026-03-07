import { NextResponse } from "next/server";
import { authSchema } from "../auth/data";
import { findUserByEmail, insertUser } from "../store";

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

  const user = insertUser({
    email: value.email,
    password: value.password,
    firstName: value.firstName,
    lastName: value.lastName,
    phone: value.phone,
  });

  return NextResponse.json(user, { status: 201 });
}
