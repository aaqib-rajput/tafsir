import { NextRequest, NextResponse } from "next/server";
import { seedDefaultMembers } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { force?: boolean };
  const force = body.force === true;

  const result = await seedDefaultMembers(force);
  return NextResponse.json({
    ok: true,
    seeded: result.seeded,
    count: result.members.length,
  });
}
