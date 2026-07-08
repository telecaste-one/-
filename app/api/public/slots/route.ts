import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUpcomingDates } from "@/lib/dates";
import { TIME_SLOTS, DATE_PAGE_SIZE } from "@/lib/constants";
import { getBookingWindowDays } from "@/lib/settings";

// Returns everything the booking UI needs to render availability for one
// DATE_PAGE_SIZE-day "page" of the customer-facing booking window: the date
// list, active trainers, explicit slot overrides, and which trainer/date/time
// combos are already booked. The client rebuilds the same open/booked logic
// with lib/slotGrid.ts so the rules stay in sync with server-side validation.
//
// `offset` (days from today) pages through the window; the window itself is
// capped by the store's configured bookingWindowDays (see /api/admin/settings)
// so customers can never fetch further out than the store allows.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawOffset = Number(searchParams.get("offset") ?? "0");

  const bookingWindowDays = await getBookingWindowDays(prisma);
  const maxOffset = Math.max(0, bookingWindowDays - DATE_PAGE_SIZE);
  const offset = Math.max(0, Math.min(maxOffset, Number.isFinite(rawOffset) ? Math.round(rawOffset) : 0));
  const pageDays = Math.min(DATE_PAGE_SIZE, bookingWindowDays - offset);

  const from = new Date();
  from.setDate(from.getDate() + offset);
  const dates = getUpcomingDates(pageDays, from);
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
    offset,
    bookingWindowDays,
  });
}
