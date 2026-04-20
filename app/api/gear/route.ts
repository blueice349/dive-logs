import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { listGearItems, insertGearItem, getUserDiveCount } from "../store";
import Joi from "joi";

const gearSchema = Joi.object({
  name: Joi.string().trim().required().label("Name"),
  type: Joi.string().trim().required().label("Type"),
  serialNumber: Joi.string().trim().optional().allow("", null).label("Serial Number"),
  purchaseDate: Joi.string().isoDate().optional().allow("", null).label("Purchase Date"),
  lastServiceDate: Joi.string().isoDate().optional().allow("", null).label("Last Service Date"),
  divesAtLastService: Joi.number().integer().min(0).default(0).label("Dives at Last Service"),
  serviceIntervalDives: Joi.number().integer().min(1).optional().allow(null).label("Service Interval (dives)"),
  serviceIntervalMonths: Joi.number().integer().min(1).optional().allow(null).label("Service Interval (months)"),
  notes: Joi.string().trim().optional().allow("", null).label("Notes"),
});

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedUserId = searchParams.get("userId");
  const targetUserId = requestedUserId && user.isAdmin ? Number(requestedUserId) : user.id;

  const [items, diveCount] = await Promise.all([
    listGearItems(targetUserId),
    getUserDiveCount(targetUserId),
  ]);

  return NextResponse.json({ items, diveCount });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { error, value } = gearSchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (value.purchaseDate) value.purchaseDate = value.purchaseDate.split("T")[0];
  if (value.lastServiceDate) value.lastServiceDate = value.lastServiceDate.split("T")[0];

  const item = await insertGearItem({ ...value, userId: user.id });
  return NextResponse.json(item, { status: 201 });
}
