import type { prisma as prismaClient } from "./prisma";

type Prisma = typeof prismaClient;

const SETTING_ID = "app";
const DEFAULT_WINDOW_DAYS = 14;
const MAX_WINDOW_DAYS = 366; // sanity cap (~1 year), matches the admin's own date-navigation limit

export async function getBookingWindowDays(prisma: Prisma): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
  return row?.bookingWindowDays ?? DEFAULT_WINDOW_DAYS;
}

export async function setBookingWindowDays(prisma: Prisma, days: number): Promise<number> {
  const clamped = Math.max(1, Math.min(MAX_WINDOW_DAYS, Math.round(days)));
  await prisma.appSetting.upsert({
    where: { id: SETTING_ID },
    update: { bookingWindowDays: clamped },
    create: { id: SETTING_ID, bookingWindowDays: clamped },
  });
  return clamped;
}

export { MAX_WINDOW_DAYS };
