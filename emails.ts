import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const trainers = await prisma.trainer.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ trainers });
}

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const max = await prisma.trainer.aggregate({ _max: { order: true } });
  const trainer = await prisma.trainer.create({
    data: { name, initial: name.charAt(0), order: (max._max.order ?? -1) + 1 },
  });
  return NextResponse.json({ trainer });
}
