-- CreateEnum
CREATE TYPE "PodiumType" AS ENUM ('INDIVIDUAL', 'TEAM');

-- CreateTable
CREATE TABLE "EventPodium" (
    "id" TEXT NOT NULL,
    "recapId" TEXT NOT NULL,
    "type" "PodiumType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPodium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPodiumEntry" (
    "id" TEXT NOT NULL,
    "podiumId" TEXT NOT NULL,
    "place" INTEGER NOT NULL,
    "teamName" TEXT,
    "memberId" TEXT,

    CONSTRAINT "EventPodiumEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PodiumTeamMember" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "PodiumTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventPodium_recapId_key" ON "EventPodium"("recapId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPodiumEntry_podiumId_place_key" ON "EventPodiumEntry"("podiumId", "place");

-- CreateIndex
CREATE UNIQUE INDEX "PodiumTeamMember_entryId_memberId_key" ON "PodiumTeamMember"("entryId", "memberId");

-- AddForeignKey
ALTER TABLE "EventPodium" ADD CONSTRAINT "EventPodium_recapId_fkey" FOREIGN KEY ("recapId") REFERENCES "EventRecap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPodiumEntry" ADD CONSTRAINT "EventPodiumEntry_podiumId_fkey" FOREIGN KEY ("podiumId") REFERENCES "EventPodium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPodiumEntry" ADD CONSTRAINT "EventPodiumEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodiumTeamMember" ADD CONSTRAINT "PodiumTeamMember_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "EventPodiumEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PodiumTeamMember" ADD CONSTRAINT "PodiumTeamMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
