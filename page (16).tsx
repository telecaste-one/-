import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";
import { TIME_SLOTS } from "@/lib/constants";
import { loadAvailabilityGrid } from "@/lib/availability";

export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const trainerId = searchParams.get("trainerId");
  const date = searchParams.get("date");
  if (!trainerId || !date) return NextResponse.json({ error: "trainerId_and_date_required" }, { status: 400 });

  const grid = await loadAvailabilityGrid(prisma, [date]);
  const slots = TIME_SLOTS.map((time) => ({
    time,
    open: grid.isOpen(trainerId, date, time),
    booked: grid.isBooked(trainerId, date, time),
  }));
  return NextResponse.json({ slots });
}

// Toggle a single slot on/off for one trainer/date/time.
export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const { trainerId, date, time } = body ?? {};
  if (!trainerId || !date || !time || !TIME_SLOTS.includes(time)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const existing = await prisma.slotOverride.findUnique({ where: { trainerId_date_time: { trainerId, date, time } } });
  const nextOpen = existing ? !existing.isOpen : false; // default is open, so first toggle closes it
  await prisma.slotOverride.upsert({
    where: { trainerId_date_time: { trainerId, date, time } },
    update: { isOpen: nextOpen },
    create: { trainerId, date, time, isOpen: nextOpen },
  });
  return NextResponse.json({ open: nextOpen });
}

// Set every slot for one trainer/date to the same open/closed state
// ("すべて受付" / "すべて停止").
export async function PUT(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const { trainerId, date, isOpen } = body ?? {};
  if (!trainerId || !date || typeof isOpen !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await prisma.$transaction(
    TIME_SLOTS.map((time) =>
      prisma.slotOverride.upsert({
        where: { trainerId_date_time: { trainerId, date, time } },
        update: { isOpen },
        create: { trainerId, date, time, isOpen },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
