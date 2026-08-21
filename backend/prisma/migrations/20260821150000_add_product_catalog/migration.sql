CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceSats" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_priceSats_check" CHECK ("priceSats" > 0)
);

ALTER TABLE "Transaction"
ADD COLUMN "productId" TEXT,
ADD COLUMN "productName" TEXT;

CREATE UNIQUE INDEX "Product_businessId_name_key" ON "Product"("businessId", "name");
CREATE INDEX "Product_businessId_isActive_name_idx" ON "Product"("businessId", "isActive", "name");
CREATE INDEX "Transaction_productId_idx" ON "Transaction"("productId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
