-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'UNKNOWN';

-- ReplaceCheckConstraint
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_status_fields_check";

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_status_fields_check"
CHECK (
    (
        "status" = 'PENDING'
        AND "paidAt" IS NULL
        AND "failureCode" IS NULL
        AND "failureMessage" IS NULL
    )
    OR (
        "status" = 'PAID'
        AND "paidAt" IS NOT NULL
        AND "bolt11" IS NOT NULL
        AND "failureCode" IS NULL
        AND "failureMessage" IS NULL
    )
    OR (
        "status" = 'FAILED'
        AND "paidAt" IS NULL
        AND "failureCode" IS NOT NULL
    )
    OR (
        "status" = 'UNKNOWN'
        AND "paidAt" IS NULL
        AND "bolt11" IS NOT NULL
        AND "failureCode" IS NOT NULL
    )
);
