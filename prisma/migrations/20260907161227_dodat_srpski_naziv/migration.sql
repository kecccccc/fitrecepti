/*
  Warnings:

  - Added the required column `name_sr` to the `ingredients` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "name_sr" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ingredients_name_sr_idx" ON "ingredients"("name_sr");
