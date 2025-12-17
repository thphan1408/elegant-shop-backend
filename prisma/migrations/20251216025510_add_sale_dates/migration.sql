-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sale_end_date" TIMESTAMP(3),
ADD COLUMN     "sale_start_date" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Product_sale_end_date_idx" ON "Product"("sale_end_date");

-- CreateIndex
CREATE INDEX "ProductVariant_price_sale_idx" ON "ProductVariant"("price_sale");
