CREATE TYPE "RecapStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TYPE "GameResult" AS ENUM ('WIN', 'DRAW', 'LOSS');

CREATE TABLE "EventRecap" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "RecapStatus" NOT NULL DEFAULT 'DRAFT',
    "summaryPoints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "story" TEXT,
    "actionsTaken" TEXT,
    "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "lessons" TEXT,
    "nextTime" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRecap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventRecapGame" (
    "id" TEXT NOT NULL,
    "recapId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "opponent" TEXT,
    "ourScore" INTEGER,
    "theirScore" INTEGER,
    "result" "GameResult",
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventRecapGame_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventRecap_eventId_key" ON "EventRecap"("eventId");

ALTER TABLE "EventRecap" ADD CONSTRAINT "EventRecap_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventRecap" ADD CONSTRAINT "EventRecap_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventRecapGame" ADD CONSTRAINT "EventRecapGame_recapId_fkey" FOREIGN KEY ("recapId") REFERENCES "EventRecap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
