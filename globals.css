import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";

// The 予約一覧 tab only cares about upcoming/manageable bookings — seed
// history rows (source: "seed-history") are past-dated demo data for the
// customer detail view, not something staff need to action here.
export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const reservations = await prisma.reservation.findMany({
    where: { source: { in: ["app", "seed-upcoming"] } },
    orderBy: [{ status: "asc" }, { date: "asc" }, { time: "asc" }],
  });
  return NextResponse.json({ reservations });
}
