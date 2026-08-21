-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUSINESS', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('AVAILABLE', 'REDEEMED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "ndebitString" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "nofferString" TEXT NOT NULL,
    "stampsRequired" INTEGER NOT NULL DEFAULT 5,
    "rewardDescription" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCard" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currentStamps" INTEGER NOT NULL DEFAULT 0,
    "totalStampsEver" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountSats" INTEGER NOT NULL,
    "bolt11" TEXT,
    "preimage" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'AVAILABLE',
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Business_ownerId_key" ON "Business"("ownerId");

-- CreateIndex
CREATE INDEX "Business_category_isActive_idx" ON "Business"("category", "isActive");

-- CreateIndex
CREATE INDEX "LoyaltyCard_customerId_idx" ON "LoyaltyCard"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_businessId_customerId_key" ON "LoyaltyCard"("businessId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_bolt11_key" ON "Transaction"("bolt11");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_preimage_key" ON "Transaction"("preimage");

-- CreateIndex
CREATE INDEX "Transaction_businessId_createdAt_idx" ON "Transaction"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_customerId_createdAt_idx" ON "Transaction"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_transactionId_key" ON "Reward"("transactionId");

-- CreateIndex
CREATE INDEX "Reward_status_earnedAt_idx" ON "Reward"("status", "earnedAt");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "User" ADD CONSTRAINT "User_business_without_ndebit_check"
CHECK ("role" <> 'BUSINESS' OR "ndebitString" IS NULL);

-- AddCheckConstraint
ALTER TABLE "Business" ADD CONSTRAINT "Business_stampsRequired_check"
CHECK ("stampsRequired" > 0);

-- AddCheckConstraint
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_stamp_counts_check"
CHECK (
    "currentStamps" >= 0
    AND "totalStampsEver" >= 0
    AND "currentStamps" <= "totalStampsEver"
);

-- AddCheckConstraint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_amountSats_check"
CHECK ("amountSats" > 0);

-- AddCheckConstraint
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_idempotencyKey_check"
CHECK (length(trim("idempotencyKey")) > 0);

-- AddCheckConstraint
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
);

-- AddCheckConstraint
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_redemption_state_check"
CHECK (
    ("status" = 'AVAILABLE' AND "redeemedAt" IS NULL)
    OR ("status" = 'REDEEMED' AND "redeemedAt" IS NOT NULL)
);
