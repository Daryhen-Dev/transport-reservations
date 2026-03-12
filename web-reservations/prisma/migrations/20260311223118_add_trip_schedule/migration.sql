-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "scheduleId" TEXT;

-- CreateTable
CREATE TABLE "trip_schedules" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_schedules_routeId_time_key" ON "trip_schedules"("routeId", "time");

-- AddForeignKey
ALTER TABLE "trip_schedules" ADD CONSTRAINT "trip_schedules_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "trip_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
