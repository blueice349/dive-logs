import { NextResponse } from "next/server";
import { diveLogBaseSchema } from "./data";
import { getAllDiveLogs, insertDiveLog } from "../store";

export async function GET() {
  return NextResponse.json(getAllDiveLogs());
}

export async function POST(req: Request) {
  const body = await req.json();

  const { error, value } = diveLogBaseSchema.validate(body, {
    abortEarly: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const newLog = insertDiveLog({
    ...value,
    date: value.date.split("T")[0],
  });

  return NextResponse.json(newLog, { status: 201 });
}
