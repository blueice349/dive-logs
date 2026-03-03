import { NextResponse } from "next/server";
import { diveLogs, DiveLog } from "./data";

export async function GET() {
  return NextResponse.json(diveLogs);
}

export async function POST(req: Request) {
  const body = await req.json();
  const newLog: DiveLog = {
    id: diveLogs.length + 1,
    location: body.location,
    depth: body.depth,
    duration: body.duration,
    date: body.date,
  };

  diveLogs.push(newLog);
  return NextResponse.json(newLog, { status: 201 });
}
