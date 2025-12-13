-- CreateTable
CREATE TABLE "contact_merges" (
    "id" TEXT NOT NULL,
    "primaryContactId" TEXT NOT NULL,
    "primaryContactName" TEXT NOT NULL,
    "secondaryContactName" TEXT NOT NULL,
    "emailsMerged" INTEGER NOT NULL DEFAULT 0,
    "phonesMerged" INTEGER NOT NULL DEFAULT 0,
    "tagsMerged" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "contact_merges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_merges_userId_idx" ON "contact_merges"("userId");

-- CreateIndex
CREATE INDEX "contact_merges_primaryContactId_idx" ON "contact_merges"("primaryContactId");

-- CreateIndex
CREATE INDEX "contact_merges_createdAt_idx" ON "contact_merges"("createdAt");

-- AddForeignKey
ALTER TABLE "contact_merges" ADD CONSTRAINT "contact_merges_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
