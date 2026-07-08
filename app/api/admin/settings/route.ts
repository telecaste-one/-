import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/adminGuard";
import { getBookingWindowDays, setBookingWindowDays, MAX_WINDOW_DAYS } from "@/lib/settings";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const bookingWindowDays = await getBookingWindowDays(prisma);
  return NextResponse.json({ bookingWindowDays, maxWindowDays: MAX_WINDOW_DAYS });
}

export async function PUT(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const days = Number(body?.bookingWindowDays);
  if (!Number.isFinite(days) || days < 1) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }
  const bookingWindowDays = await setBookingWindowDays(prisma, days);
  return NextResponse.json({ bookingWindowDays });
}
