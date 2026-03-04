import { NextRequest, NextResponse } from "next/server";
import { createMember, deleteMember, getMembers, replaceMembers, type MemberRecord } from "@/lib/db";

export async function GET() {
  const members = await getMembers();
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name?: string };
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const member = await createMember(body.name);
  return NextResponse.json({ member }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { members?: MemberRecord[] };
  if (!Array.isArray(body.members)) {
    return NextResponse.json({ error: "members array is required" }, { status: 400 });
  }

  await replaceMembers(body.members);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await deleteMember(id);
  return NextResponse.json({ ok: true });
}
