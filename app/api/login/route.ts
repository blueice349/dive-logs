import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { loginSchema } from "../auth/data";
import { findUserByEmail } from "../store";

export async function POST(req: Request) {
  const body = await req.json();

  const { error, value } = loginSchema.validate(body, { abortEarly: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const user = findUserByEmail(value.email);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const passwordMatch = await bcrypt.compare(value.password, user.password);
  if (!passwordMatch) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  return NextResponse.json(user);
}
