-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "bookingWindowDays" INTEGER NOT NULL DEFAULT 14,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);
