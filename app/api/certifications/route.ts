import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { listCertifications, insertCertification } from "../store";
import Joi from "joi";

const certSchema = Joi.object({
  certName: Joi.string().trim().required().label("Certification Name"),
  agency: Joi.string().trim().optional().allow("").label("Agency"),
  certDate: Joi.string().isoDate().optional().allow("", null).label("Date"),
  certNumber: Joi.string().trim().optional().allow("").label("Cert Number"),
  notes: Joi.string().trim().optional().allow("").label("Notes"),
});

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get("userId");
  let targetUserId = user.id;
  if (userIdParam) {
    if (!user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    targetUserId = Number(userIdParam);
  }

  const certs = await listCertifications(targetUserId);
  return NextResponse.json(certs);
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { userId: bodyUserId, ...rest } = body;
  const { error, value } = certSchema.validate(rest, { abortEarly: false, stripUnknown: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  let targetUserId = user.id;
  if (bodyUserId && bodyUserId !== user.id) {
    if (!user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    targetUserId = Number(bodyUserId);
  }
  const cert = await insertCertification(value, targetUserId);
  return NextResponse.json(cert, { status: 201 });
}
