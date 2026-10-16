-- Add the column as nullable so databases with existing availabilities can be migrated.
ALTER TABLE "availability" ADD COLUMN "date" DATE;

-- Existing rows predate the explicit date field, so recover it from their interval.
UPDATE "availability"
SET "date" = COALESCE("timeslot_start"::date, "timeslot_end"::date)
WHERE "date" IS NULL;

-- New records must always identify their calendar day.
ALTER TABLE "availability" ALTER COLUMN "date" SET NOT NULL;
