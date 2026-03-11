import { NextResponse } from "next/server";
import { diveLogs, diveLogBaseSchema, type DiveLog } from "./data";

let nextId = 1;

export async function GET() {
  return NextResponse.json(diveLogs);
}

export async function POST(req: Request) {
  const body = await req.json();

  const { error, value } = diveLogBaseSchema.validate(body, {
    abortEarly: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const newLog: DiveLog = {
    id: nextId++,
    ...value,
    date: value.date.split("T")[0],
  };
  diveLogs.push(newLog);

  return NextResponse.json(newLog, { status: 201 });
}
