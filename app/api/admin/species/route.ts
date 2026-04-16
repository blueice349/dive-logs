import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { listSpecies, insertSpecies } from "../../store";
import Joi from "joi";

const schema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().label("Name"),
  category: Joi.string().trim().max(50).optional().allow("").label("Category"),
});

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await listSpecies());
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  try {
    const species = await insertSpecies(value.name, value.category);
    return NextResponse.json(species, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Species already exists" }, { status: 409 });
  }
}
