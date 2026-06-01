/*
  Warnings:

  - A unique constraint covering the columns `[confirmationToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `confirmationToken` VARCHAR(191) NULL,
    ADD COLUMN `isConfirmed` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `users_confirmationToken_key` ON `users`(`confirmationToken`);
