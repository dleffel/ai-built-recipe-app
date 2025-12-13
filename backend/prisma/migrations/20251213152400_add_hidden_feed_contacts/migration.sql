-- CreateTable
CREATE TABLE "hidden_feed_contacts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "hidden_feed_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hidden_feed_contacts_userId_idx" ON "hidden_feed_contacts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "hidden_feed_contacts_userId_contactId_key" ON "hidden_feed_contacts"("userId", "contactId");

-- AddForeignKey
ALTER TABLE "hidden_feed_contacts" ADD CONSTRAINT "hidden_feed_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_feed_contacts" ADD CONSTRAINT "hidden_feed_contacts_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
