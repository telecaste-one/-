import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      reservations: {
        where: { status: "active" },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        take: 1,
      },
    },
  });

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      visits: c.visits,
      planName: c.planName,
      next: c.reservations[0]
        ? {
            date: c.reservations[0].date,
            time: c.reservations[0].time,
            endTime: c.reservations[0].endTime,
            trainerName: c.reservations[0].trainerName,
            planName: c.reservations[0].planName,
          }
        : null,
    })),
  });
}
