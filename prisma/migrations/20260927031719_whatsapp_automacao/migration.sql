-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'desconectado',
    "qr" TEXT,
    "phone" TEXT,
    "lastError" TEXT,
    "pausedUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WhatsAppGroup" (
    "jid" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "lastSentAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OfferMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "variants" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'aprovada',
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME
);

-- CreateTable
CREATE TABLE "SendJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "groupJid" TEXT NOT NULL,
    "imageUrl" TEXT,
    "text" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SendJob_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "OfferMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'principal',
    "name" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "catchphrases" TEXT NOT NULL DEFAULT '[]',
    "emojis" TEXT NOT NULL DEFAULT '[]',
    "forbidden" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "OfferMessage_status_idx" ON "OfferMessage"("status");

-- CreateIndex
CREATE INDEX "SendJob_status_scheduledAt_idx" ON "SendJob"("status", "scheduledAt");
