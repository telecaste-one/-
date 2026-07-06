import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/trainers/[id]">) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const count = await prisma.trainer.count();
  if (count <= 1) {
    return NextResponse.json({ error: "must_keep_one_trainer" }, { status: 400 });
  }

  await prisma.trainer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
