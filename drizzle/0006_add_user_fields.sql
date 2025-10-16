ALTER TABLE "user" ADD COLUMN "phone" text;
ALTER TABLE "user" ADD COLUMN "address" text;
ALTER TABLE "user" ADD COLUMN "dateOfBirth" timestamp;
ALTER TABLE "user" ADD COLUMN "isActive" boolean NOT NULL DEFAULT true;