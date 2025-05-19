/*
  Warnings:

  - You are about to drop the column `cardType` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `groupId` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Card` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `CardRoomLink` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CardRoomLink` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `inviteToken` on the `PlanningRoom` table. All the data in the column will be lost.
  - You are about to drop the column `shareable` on the `PlanningRoom` table. All the data in the column will be lost.
  - You are about to drop the column `cardId` on the `Reaction` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Reaction` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `RoomMember` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `RoomMember` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,messageId,emoji]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roomId,userId]` on the table `RoomMember` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `Card` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Card` table without a default value. This is not possible if the table is not empty.
  - Added the required column `emoji` to the `Reaction` table without a default value. This is not possible if the table is not empty.
  - Made the column `messageId` on table `Reaction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_userId_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_cardId_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_messageId_fkey";

-- DropForeignKey
ALTER TABLE "RoomMember" DROP CONSTRAINT "RoomMember_roomId_fkey";

-- DropForeignKey
ALTER TABLE "RoomMember" DROP CONSTRAINT "RoomMember_userId_fkey";

-- DropIndex
DROP INDEX "PlanningRoom_inviteToken_key";

-- DropIndex
DROP INDEX "Reaction_userId_messageId_cardId_key";

-- DropIndex
DROP INDEX "RoomMember_userId_roomId_key";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "cardType",
DROP COLUMN "groupId",
DROP COLUMN "imageUrl",
DROP COLUMN "order",
DROP COLUMN "userId",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CardRoomLink" DROP COLUMN "order",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "PlanningRoom" DROP COLUMN "inviteToken",
DROP COLUMN "shareable";

-- AlterTable
ALTER TABLE "Reaction" DROP COLUMN "cardId",
DROP COLUMN "type",
ADD COLUMN     "emoji" TEXT NOT NULL,
ALTER COLUMN "messageId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RoomMember" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "role" SET DEFAULT 'member';

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "planningRoomId" TEXT NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "context" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");

-- CreateIndex
CREATE INDEX "InviteToken_token_idx" ON "InviteToken"("token");

-- CreateIndex
CREATE INDEX "InviteToken_planningRoomId_isActive_idx" ON "InviteToken"("planningRoomId", "isActive");

-- CreateIndex
CREATE INDEX "Activity_groupId_idx" ON "Activity"("groupId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_timestamp_idx" ON "Activity"("timestamp");

-- CreateIndex
CREATE INDEX "Card_createdById_idx" ON "Card"("createdById");

-- CreateIndex
CREATE INDEX "CardRoomLink_roomId_idx" ON "CardRoomLink"("roomId");

-- CreateIndex
CREATE INDEX "Message_roomId_idx" ON "Message"("roomId");

-- CreateIndex
CREATE INDEX "Message_userId_idx" ON "Message"("userId");

-- CreateIndex
CREATE INDEX "PlanningRoom_ownerId_idx" ON "PlanningRoom"("ownerId");

-- CreateIndex
CREATE INDEX "Reaction_messageId_idx" ON "Reaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_messageId_emoji_key" ON "Reaction"("userId", "messageId", "emoji");

-- CreateIndex
CREATE INDEX "RoomMember_userId_idx" ON "RoomMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMember_roomId_userId_key" ON "RoomMember"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlanningRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_planningRoomId_fkey" FOREIGN KEY ("planningRoomId") REFERENCES "PlanningRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlanningRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
