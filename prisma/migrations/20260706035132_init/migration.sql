-- CreateTable
CREATE TABLE "Trainer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initial" TEXT NOT NULL,
    "photoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotOverride" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL,

    CONSTRAINT "SlotOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planName" TEXT,
    "planCount" INTEGER,
    "remaining" INTEGER,
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "trainerId" TEXT,
    "trainerName" TEXT NOT NULL,
    "autoAssigned" BOOLEAN NOT NULL DEFAULT false,
    "planName" TEXT NOT NULL,
    "planCount" INTEGER NOT NULL,
    "planPrice" TEXT NOT NULL,
    "single" BOOLEAN NOT NULL DEFAULT false,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotOverride_trainerId_date_idx" ON "SlotOverride"("trainerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SlotOverride_trainerId_date_time_key" ON "SlotOverride"("trainerId", "date", "time");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Reservation_trainerId_date_time_idx" ON "Reservation"("trainerId", "date", "time");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- AddForeignKey
ALTER TABLE "SlotOverride" ADD CONSTRAINT "SlotOverride_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
