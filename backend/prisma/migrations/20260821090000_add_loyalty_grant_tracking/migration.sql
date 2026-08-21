-- Track whether a paid transaction has already granted its loyalty stamp.
ALTER TABLE "Transaction" ADD COLUMN "loyaltyGrantedAt" TIMESTAMP(3);
