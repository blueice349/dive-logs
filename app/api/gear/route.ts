import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { listGearItems, insertGearItem, getUserDiveCount } from "../store";
import Joi from "joi";

const gearSchema = Joi.object({
  name: Joi.string().trim().required().label("Name"),
  type: Joi.string().trim().required().label("Type"),
  serial_number: Joi.string().trim().optional().allow("", null).label("Serial Number"),
  purchase_date: Joi.string().isoDate().optional().allow("", null).label("Purchase Date"),
  last_service_date: Joi.string().isoDate().optional().allow("", null).label("Last Service Date"),
  dives_at_last_service: Joi.number().integer().min(0).default(0).label("Dives at Last Service"),
  service_interval_dives: Joi.number().integer().min(1).optional().allow(null).label("Service Interval (dives)"),
  service_interval_months: Joi.number().integer().min(1).optional().allow(null).label("Service Interval (months)"),
  notes: Joi.string().trim().optional().allow("", null).label("Notes"),
});

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [items, diveCount] = await Promise.all([
    listGearItems(user.id),
    getUserDiveCount(user.id),
  ]);

  return NextResponse.json({ items, diveCount });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { error, value } = gearSchema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const item = await insertGearItem({ ...value, user_id: user.id });
  return NextResponse.json(item, { status: 201 });
}
