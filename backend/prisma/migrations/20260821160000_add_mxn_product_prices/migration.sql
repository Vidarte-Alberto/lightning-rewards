CREATE TYPE "ProductPriceCurrency" AS ENUM ('SATS', 'MXN');

ALTER TABLE "Product"
ADD COLUMN "priceCurrency" "ProductPriceCurrency" NOT NULL DEFAULT 'SATS',
ADD COLUMN "priceMxnCents" INTEGER,
ADD COLUMN "lastBtcMxnRate" DECIMAL(18,2),
ADD COLUMN "rateUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Transaction"
ADD COLUMN "productPriceCurrency" "ProductPriceCurrency",
ADD COLUMN "productPriceMxnCents" INTEGER,
ADD COLUMN "btcMxnRate" DECIMAL(18,2);

ALTER TABLE "Product" ADD CONSTRAINT "Product_currency_price_check" CHECK (
  ("priceCurrency" = 'SATS' AND "priceMxnCents" IS NULL)
  OR
  (
    "priceCurrency" = 'MXN'
    AND "priceMxnCents" > 0
    AND "lastBtcMxnRate" > 0
    AND "rateUpdatedAt" IS NOT NULL
  )
);
