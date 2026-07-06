import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: RouteContext<"/api/public/reservations/[id]">) {
  const { id } = await ctx.params;
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ reservation });
}
