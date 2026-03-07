import { NextResponse } from "next/server";
import { loginSchema } from "../auth/data";
import { findUserByEmail } from "../store";

export async function POST(req: Request) {
  const body = await req.json();

  const { error, value } = loginSchema.validate(body, { abortEarly: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const user = findUserByEmail(value.email);
  if (!user || user.password !== value.password) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  return NextResponse.json(user);
}
