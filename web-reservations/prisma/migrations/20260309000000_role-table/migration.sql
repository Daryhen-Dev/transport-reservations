-- Step 1: Drop the DEFAULT (it references the enum type)
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Step 2: Convert User.role from enum to TEXT
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;

-- Step 3: Drop the enum type (now safe)
DROP TYPE "Role";

-- Step 3: Create the Role table
CREATE TABLE "Role" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- Step 4: Seed initial roles (fixed IDs for FK migration)
INSERT INTO "Role" ("id", "name", "updatedAt") VALUES
    ('role_super_admin',  'SUPER_ADMIN',  CURRENT_TIMESTAMP),
    ('role_agency_admin', 'AGENCY_ADMIN', CURRENT_TIMESTAMP),
    ('role_agency_user',  'AGENCY_USER',  CURRENT_TIMESTAMP);

-- Step 5: Add roleId column (nullable for data migration)
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- Step 6: Migrate existing data
UPDATE "User" SET "roleId" = 'role_super_admin'  WHERE "role" = 'SUPER_ADMIN';
UPDATE "User" SET "roleId" = 'role_agency_admin' WHERE "role" = 'AGENCY_ADMIN';
UPDATE "User" SET "roleId" = 'role_agency_user'  WHERE "role" = 'AGENCY_USER';

-- Step 7: Enforce NOT NULL + FK
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Drop old role column
ALTER TABLE "User" DROP COLUMN "role";
