import bcrypt from "bcryptjs";
import type { prisma as prismaClient } from "./prisma";
import { getUpcomingDates } from "./dates";
import { endTimeOf } from "./constants";

type Prisma = typeof prismaClient;

// Shared by prisma/seed.ts (local CLI seeding) and app/api/setup (one-click
// production setup, since asking a non-technical shop owner to run a CLI
// command against their production DATABASE_URL isn't realistic).
export async function runSeed(prisma: Prisma) {
  // --- admin login ---
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  // --- trainers ---
  const trainerDefs = [
    { name: "田中 玲", initial: "田" },
    { name: "佐藤 美咲", initial: "佐" },
    { name: "鈴木 大和", initial: "鈴" },
  ];
  const trainers: Record<string, { id: string }> = {};
  for (let i = 0; i < trainerDefs.length; i++) {
    const def = trainerDefs[i];
    const existing = await prisma.trainer.findFirst({ where: { name: def.name } });
    const t = existing ?? (await prisma.trainer.create({ data: { name: def.name, initial: def.initial, order: i } }));
    trainers[def.name] = { id: t.id };
  }

  // --- sample customers + history (matches the design's mock data) ---
  const dates = getUpcomingDates(8);
  const customerDefs = [
    {
      name: "佐々木 健",
      email: "sasaki@example.com",
      phone: "080-2222-1111",
      planName: "12回コース",
      planCount: 12,
      remaining: 9,
      visits: 28,
      history: [
        ["6/28(土)", "田中 玲", "completed"],
        ["6/14(土)", "田中 玲", "completed"],
        ["5/31(土)", "佐藤 美咲", "completed"],
        ["5/17(土)", "田中 玲", "completed"],
      ],
    },
    {
      name: "及川 由美",
      email: "oikawa@example.com",
      phone: "090-3333-4444",
      planName: "単発",
      planCount: 1,
      remaining: 0,
      visits: 4,
      history: [
        ["6/20(金)", "佐藤 美咲", "completed"],
        ["6/6(金)", "佐藤 美咲", "completed"],
        ["5/23(金)", "佐藤 美咲", "cancelled"],
      ],
    },
    {
      name: "高橋 潤",
      email: "takahashi@example.com",
      phone: "070-5555-6666",
      planName: "8回コース",
      planCount: 8,
      remaining: 5,
      visits: 11,
      history: [
        ["6/22(日)", "鈴木 大和", "completed"],
        ["6/8(日)", "鈴木 大和", "completed"],
        ["5/25(日)", "鈴木 大和", "completed"],
      ],
    },
    {
      name: "山本 彩",
      email: "yamamoto@example.com",
      phone: "090-7777-8888",
      planName: "4回コース",
      planCount: 4,
      remaining: 2,
      visits: 2,
      history: [
        ["6/12(木)", "田中 玲", "completed"],
        ["5/29(木)", "田中 玲", "completed"],
      ],
    },
  ];

  const customers: Record<string, { id: string }> = {};
  for (const def of customerDefs) {
    const c = await prisma.customer.upsert({
      where: { email: def.email },
      update: {
        name: def.name,
        phone: def.phone,
        planName: def.planName,
        planCount: def.planCount,
        remaining: def.remaining,
        visits: def.visits,
      },
      create: {
        name: def.name,
        email: def.email,
        phone: def.phone,
        planName: def.planName,
        planCount: def.planCount,
        remaining: def.remaining,
        visits: def.visits,
      },
    });
    customers[def.email] = { id: c.id };

    // Historical (past, already-resolved) sessions — dated before "today" so
    // they read as completed history, not upcoming bookings.
    const already = await prisma.reservation.count({ where: { customerId: c.id, source: "seed-history" } });
    if (already === 0) {
      const today = new Date();
      for (let i = 0; i < def.history.length; i++) {
        const [label, staffName, status] = def.history[i];
        const past = new Date(today);
        past.setDate(today.getDate() - (i + 1) * 14 - 3);
        const y = past.getFullYear();
        const m = String(past.getMonth() + 1).padStart(2, "0");
        const d = String(past.getDate()).padStart(2, "0");
        await prisma.reservation.create({
          data: {
            customerId: c.id,
            customerName: def.name,
            email: def.email,
            phone: def.phone,
            trainerId: trainers[staffName]?.id ?? null,
            trainerName: staffName,
            planName: def.planName,
            planCount: def.planCount,
            planPrice: "",
            single: def.planCount === 1,
            date: `${y}-${m}-${d}`,
            time: "11:30",
            endTime: endTimeOf("11:30"),
            status,
            source: "seed-history",
            note: label, // keep the design's original date label for reference
          },
        });
      }
    }
  }

  // --- upcoming sample reservations (occupy real slots so double-booking
  // prevention has something to demonstrate against) ---
  const seedUpcoming = [
    { customerEmail: "sasaki@example.com", staffName: "田中 玲", dateIdx: 0, time: "11:30" },
    { customerEmail: "oikawa@example.com", staffName: "佐藤 美咲", dateIdx: 0, time: "16:00" },
    { customerEmail: "takahashi@example.com", staffName: "鈴木 大和", dateIdx: 2, time: "19:30" },
  ];
  for (const s of seedUpcoming) {
    const cust = customerDefs.find((c) => c.email === s.customerEmail)!;
    const custId = customers[s.customerEmail].id;
    const dateInfo = dates[s.dateIdx];
    const exists = await prisma.reservation.findFirst({
      where: { customerId: custId, date: dateInfo.date, time: s.time, source: "seed-upcoming" },
    });
    if (exists) continue;
    await prisma.reservation.create({
      data: {
        customerId: custId,
        customerName: cust.name,
        email: cust.email,
        phone: cust.phone,
        trainerId: trainers[s.staffName]?.id ?? null,
        trainerName: s.staffName,
        planName: cust.planName,
        planCount: cust.planCount,
        planPrice: "",
        single: cust.planCount === 1,
        date: dateInfo.date,
        time: s.time,
        endTime: endTimeOf(s.time),
        status: "active",
        source: "seed-upcoming",
      },
    });
  }

  return { username, password };
}
