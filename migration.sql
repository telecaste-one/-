import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUpcomingDates } from "@/lib/dates";
import { TIME_SLOTS } from "@/lib/constants";

// Returns everything the booking UI needs to render availability for the
// next 8 days: the date list, active trainers, explicit slot overrides, and
// which trainer/date/time combos are already booked. The client rebuilds
// the same open/booked logic with lib/slotGrid.ts so the rules stay in sync
// with server-side validation.
export async function GET() {
  const dates = getUpcomingDates(8);
  const dateStrings = dates.map((d) => d.date);

  const [trainers, overrides, reservations] = await Promise.all([
    prisma.trainer.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, initial: true, photoUrl: true } }),
    prisma.slotOverride.findMany({ where: { date: { in: dateStrings } } }),
    prisma.reservation.findMany({
      where: { date: { in: dateStrings }, status: "active", trainerId: { not: null } },
      select: { trainerId: true, date: true, time: true },
    }),
  ]);

  return NextResponse.json({
    dates,
    times: TIME_SLOTS,
    trainers,
    overrides: overrides.map((o) => ({ trainerId: o.trainerId, date: o.date, time: o.time, isOpen: o.isOpen })),
    booked: reservations.map((r) => ({ trainerId: r.trainerId as string, date: r.date, time: r.time })),
  });
}
