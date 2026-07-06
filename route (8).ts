import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";
import { labelForISODate } from "@/lib/dates";

export async function GET(_req: Request, ctx: RouteContext<"/api/admin/customers/[id]">) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { reservations: { orderBy: [{ date: "desc" }, { time: "desc" }] } },
  });
  if (!customer) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const next = customer.reservations.find((r) => r.status === "active");
  const history = customer.reservations.filter((r) => r.status !== "active");

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      since: customer.createdAt,
      visits: customer.visits,
      planName: customer.planName,
      remaining: customer.remaining,
    },
    next: next
      ? {
          date: next.date,
          time: next.time,
          endTime: next.endTime,
          trainerName: next.trainerName,
          planName: next.planName,
        }
      : null,
    history: history.map((h) => ({
      id: h.id,
      date: h.date,
      time: h.time,
      trainerName: h.trainerName,
      planName: h.planName,
      status: h.status,
      dateLabel: h.note && h.source === "seed-history" ? h.note : `${labelForISODate(h.date)} ${h.time}`,
    })),
  });
}
