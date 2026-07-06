import type { prisma as prismaClient } from "./prisma";
import type { Prisma as PrismaNS } from "@/app/generated/prisma/client";
import { buildAvailabilityGrid, type AvailabilityGrid } from "./slotGrid";

type Prisma = typeof prismaClient;

export async function loadAvailabilityGrid(prisma: Prisma, dates: string[]): Promise<AvailabilityGrid> {
  const [overrides, reservations] = await Promise.all([
    prisma.slotOverride.findMany({ where: { date: { in: dates } } }),
    prisma.reservation.findMany({
      where: { date: { in: dates }, status: "active", trainerId: { not: null } },
      select: { trainerId: true, date: true, time: true },
    }),
  ]);

  return buildAvailabilityGrid(
    overrides.map((o) => ({ trainerId: o.trainerId, date: o.date, time: o.time, isOpen: o.isOpen })),
    reservations
      .filter((r): r is { trainerId: string; date: string; time: string } => r.trainerId != null)
      .map((r) => ({ trainerId: r.trainerId, date: r.date, time: r.time }))
  );
}

// Re-validates + picks a trainer for a booking inside the caller's
// transaction, so a race between two simultaneous bookings can't double
// book the same trainer/date/time. Returns the trainer id to book, or null
// if nothing is available.
export async function pickAvailableTrainer(
  tx: PrismaNS.TransactionClient,
  candidateTrainerIds: string[],
  date: string,
  time: string
): Promise<string | null> {
  for (const trainerId of candidateTrainerIds) {
    const override = await tx.slotOverride.findUnique({
      where: { trainerId_date_time: { trainerId, date, time } },
    });
    const open = override ? override.isOpen : true;
    if (!open) continue;
    const conflict = await tx.reservation.findFirst({
      where: { trainerId, date, time, status: "active" },
      select: { id: true },
    });
    if (conflict) continue;
    return trainerId;
  }
  return null;
}
