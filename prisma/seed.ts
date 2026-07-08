import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { runSeed } from "../lib/seedData";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

runSeed(prisma)
  .then(({ username, password }) => {
    console.log(`Admin user ready: ${username} / ${password} (change ADMIN_PASSWORD in .env)`);
    console.log("Seed complete.");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
