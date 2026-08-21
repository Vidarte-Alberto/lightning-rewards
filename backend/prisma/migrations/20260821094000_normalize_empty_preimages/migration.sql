-- Internal CLINK settlements can omit the preimage. Store that state as NULL so
-- multiple successful internal settlements do not conflict with the unique index.
UPDATE "Transaction"
SET "preimage" = NULL
WHERE "preimage" IS NOT NULL
  AND length(trim("preimage")) = 0;

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_preimage_not_blank_check"
CHECK ("preimage" IS NULL OR length(trim("preimage")) > 0);
