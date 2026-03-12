-- Migration: refactor-passenger-independent
-- Convert Passenger from embedded entity (with reservationId FK) to independent entity
-- with many-to-many join table ReservationPassenger
--
-- NOTE: When this migration was first attempted, the RENAME step executed but CREATE failed.
-- The DB state entering this migration is:
--   - "Passenger_old" exists (0 rows, has reservationId column)
--   - "Passenger" does NOT exist
--   - "ReservationPassenger" does NOT exist
-- This SQL handles that state.

-- Step 0: Rename the PK constraint on Passenger_old (RENAME TABLE preserves constraint names)
-- This frees the name "Passenger_pkey" so the new table can use it.
ALTER TABLE "Passenger_old" RENAME CONSTRAINT "Passenger_pkey" TO "Passenger_old_pkey";

-- Step 1: Create new independent Passenger table (no reservationId)
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create ReservationPassenger join table
CREATE TABLE "ReservationPassenger" (
    "reservationId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    CONSTRAINT "ReservationPassenger_pkey" PRIMARY KEY ("reservationId", "passengerId")
);

-- Step 3: No data migration needed (Passenger_old has 0 rows)

-- Step 4: Add unique constraint on Passenger
CREATE UNIQUE INDEX "Passenger_documentTypeId_documentNumber_key"
    ON "Passenger"("documentTypeId", "documentNumber");

-- Step 5: Add FK constraints to new Passenger table
ALTER TABLE "Passenger"
    ADD CONSTRAINT "Passenger_documentTypeId_fkey"
    FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Passenger"
    ADD CONSTRAINT "Passenger_countryId_fkey"
    FOREIGN KEY ("countryId") REFERENCES "Country"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Add FK constraints to ReservationPassenger
ALTER TABLE "ReservationPassenger"
    ADD CONSTRAINT "ReservationPassenger_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "PassengerReservation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReservationPassenger"
    ADD CONSTRAINT "ReservationPassenger_passengerId_fkey"
    FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Drop old table (empty, no longer needed)
DROP TABLE "Passenger_old";
