import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { updateCertification, deleteCertification, updateCertificationAdmin, deleteCertificationAdmin } from "../../store";
import Joi from "joi";

const certSchema = Joi.object({
  certName: Joi.string().trim().optional().label("Certification Name"),
  agency: Joi.string().trim().optional().allow("").label("Agency"),
  certDate: Joi.string().isoDate().optional().allow("", null).label("Date"),
  certNumber: Joi.string().trim().optional().allow("").label("Cert Number"),
  notes: Joi.string().trim().optional().allow("").label("Notes"),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await req.json();
  const { error, value } = certSchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // Admins can update any cert; regular users only their own
  const updated = user.isAdmin
    ? await updateCertificationAdmin(Number(id), value)
    : await updateCertification(Number(id), user.id, value);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const deleted = user.isAdmin
    ? await deleteCertificationAdmin(Number(id))
    : await deleteCertification(Number(id), user.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
