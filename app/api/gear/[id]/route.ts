import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { updateGearItem, deleteGearItem, getUserDiveCount } from "../../store";
import Joi from "joi";

const gearUpdateSchema = Joi.object({
  name: Joi.string().trim().optional().label("Name"),
  type: Joi.string().trim().optional().label("Type"),
  serialNumber: Joi.string().trim().optional().allow("", null).label("Serial Number"),
  purchaseDate: Joi.string().isoDate().optional().allow("", null).label("Purchase Date"),
  lastServiceDate: Joi.string().isoDate().optional().allow("", null).label("Last Service Date"),
  divesAtLastService: Joi.number().integer().min(0).optional().label("Dives at Last Service"),
  serviceIntervalDives: Joi.number().integer().min(1).optional().allow(null).label("Service Interval (dives)"),
  serviceIntervalMonths: Joi.number().integer().min(1).optional().allow(null).label("Service Interval (months)"),
  notes: Joi.string().trim().optional().allow("", null).label("Notes"),
});

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();
  const { error, value } = gearUpdateSchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (value.purchaseDate) value.purchaseDate = value.purchaseDate.split("T")[0];
  if (value.lastServiceDate) value.lastServiceDate = value.lastServiceDate.split("T")[0];

  const updated = await updateGearItem(Number(id), user.id, value);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const deleted = await deleteGearItem(Number(id), user.id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await req.json();

  if (body.action !== "logService") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const currentDiveCount = await getUserDiveCount(user.id);

  const updated = await updateGearItem(Number(id), user.id, {
    lastServiceDate: today,
    divesAtLastService: currentDiveCount,
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
