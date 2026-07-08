import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUpcomingDates } from "@/lib/dates";
import { TIME_SLOTS, endTimeOf } from "@/lib/constants";
import { getPlan } from "@/lib/plans";
import { getBookingWindowDays } from "@/lib/settings";
import { pickAvailableTrainer } from "@/lib/availability";
import { sendMail } from "@/lib/mail";
import { buildStoreEmail, buildCustomerEmail } from "@/lib/emails";

type Body = {
  planId: number;
  date: string;
  time: string;
  trainerId: string | null;
  name: string;
  email: string;
  phone: string;
  note: string;
};

export async function POST(request: Request) {
  let body: Partial<Body>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const note = (body.note ?? "").trim();

  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
  if (!email.includes("@")) return NextResponse.json({ error: "email_invalid" }, { status: 400 });

  const bookingWindowDays = await getBookingWindowDays(prisma);
  const validDates = new Set(getUpcomingDates(bookingWindowDays).map((d) => d.date));
  if (!body.date || !validDates.has(body.date)) {
    return NextResponse.json({ error: "date_invalid" }, { status: 400 });
  }
  if (!body.time || !TIME_SLOTS.includes(body.time)) {
    return NextResponse.json({ error: "time_invalid" }, { status: 400 });
  }

  let plan;
  try {
    plan = getPlan(body.planId ?? -1);
  } catch {
    return NextResponse.json({ error: "plan_invalid" }, { status: 400 });
  }

  const date = body.date;
  const time = body.time;
  const requestedTrainerId = body.trainerId || null;

  const trainers = await prisma.trainer.findMany({ orderBy: { order: "asc" } });
  if (requestedTrainerId && !trainers.some((t) => t.id === requestedTrainerId)) {
    return NextResponse.json({ error: "trainer_invalid" }, { status: 400 });
  }
  const candidateIds = requestedTrainerId ? [requestedTrainerId] : trainers.map((t) => t.id);
  if (candidateIds.length === 0) {
    return NextResponse.json({ error: "no_trainers" }, { status: 409 });
  }

  const endTime = endTimeOf(time);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingCustomer = await tx.customer.findUnique({ where: { email } });
      if (existingCustomer) {
        const activeCount = await tx.reservation.count({
          where: { customerId: existingCustomer.id, status: "active" },
        });
        if (activeCount > 0) {
          throw new ApiError(409, "already_has_active_reservation");
        }
      }

      const trainerId = await pickAvailableTrainer(tx, candidateIds, date, time);
      if (!trainerId) {
        throw new ApiError(409, requestedTrainerId ? "trainer_unavailable" : "slot_full");
      }
      const trainer = trainers.find((t) => t.id === trainerId)!;

      const remaining = plan.single ? 0 : plan.count - 1;
      const customer = existingCustomer
        ? await tx.customer.update({
            where: { id: existingCustomer.id },
            data: { name, phone: phone || null, planName: plan.name, planCount: plan.count, remaining },
          })
        : await tx.customer.create({
            data: {
              name,
              email,
              phone: phone || null,
              planName: plan.name,
              planCount: plan.count,
              remaining,
            },
          });

      const reservation = await tx.reservation.create({
        data: {
          customerId: customer.id,
          customerName: name,
          email,
          phone: phone || null,
          note: note || null,
          trainerId,
          trainerName: trainer.name,
          autoAssigned: !requestedTrainerId,
          planName: plan.name,
          planCount: plan.count,
          planPrice: plan.price,
          single: plan.single,
          date,
          time,
          endTime,
          status: "active",
          source: "app",
        },
      });

      return reservation;
    });

    const storeEmail = process.env.STORE_EMAIL || "reserve@core-pt.studio";
    const storeContent = buildStoreEmail(storeEmail, result);
    const custContent = buildCustomerEmail(result);
    const [storeResult, custResult] = await Promise.all([sendMail(storeContent), sendMail(custContent)]);

    return NextResponse.json({
      reservation: result,
      mail: {
        store: { ...storeContent, ...storeResult },
        customer: { ...custContent, ...custResult },
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error("reservation create failed", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string
  ) {
    super(code);
  }
}
