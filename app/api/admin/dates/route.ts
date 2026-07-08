import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminGuard";
import { getUpcomingDates } from "@/lib/dates";
import { DATE_PAGE_SIZE } from "@/lib/constants";
import { MAX_WINDOW_DAYS } from "@/lib/settings";

// Unlike /api/public/slots, the admin's date paging isn't capped by the
// store's customer-facing booking window — staff can block out slots (e.g.
// for a vacation) further out than customers are currently allowed to book.
export async function GET(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawOffset = Number(searchParams.get("offset") ?? "0");
  const maxOffset = Math.max(0, MAX_WINDOW_DAYS - DATE_PAGE_SIZE);
  const offset = Math.max(0, Math.min(maxOffset, Number.isFinite(rawOffset) ? Math.round(rawOffset) : 0));

  const from = new Date();
  from.setDate(from.getDate() + offset);
  const dates = getUpcomingDates(DATE_PAGE_SIZE, from);

  return NextResponse.json({ dates, offset, maxOffset });
}
