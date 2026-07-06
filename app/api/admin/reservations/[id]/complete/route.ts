import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";

export async function POST(_req: Request, ctx: RouteContext<"/api/admin/reservations/[id]/complete">) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (reservation.status !== "active") return NextResponse.json({ error: "not_active" }, { status: 400 });

  await prisma.$transaction([
    prisma.reservation.update({ where: { id }, data: { status: "completed" } }),
    prisma.customer.update({ where: { id: reservation.customerId }, data: { visits: { increment: 1 } } }),
  ]);

  return NextResponse.json({ ok: true });
}
