-- CreateTable
CREATE TABLE "gmail_accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "historyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "gmail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_watches" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gmailAccountId" TEXT NOT NULL,

    CONSTRAINT "gmail_watches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gmail_accounts_userId_idx" ON "gmail_accounts"("userId");

-- CreateIndex
CREATE INDEX "gmail_accounts_email_idx" ON "gmail_accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_accounts_userId_email_key" ON "gmail_accounts"("userId", "email");

-- CreateIndex
CREATE INDEX "gmail_watches_gmailAccountId_idx" ON "gmail_watches"("gmailAccountId");

-- CreateIndex
CREATE INDEX "gmail_watches_expiration_idx" ON "gmail_watches"("expiration");

-- AddForeignKey
ALTER TABLE "gmail_accounts" ADD CONSTRAINT "gmail_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gmail_watches" ADD CONSTRAINT "gmail_watches_gmailAccountId_fkey" FOREIGN KEY ("gmailAccountId") REFERENCES "gmail_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;