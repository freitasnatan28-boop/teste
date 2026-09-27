-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketplace" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "itemId" TEXT,
    "title" TEXT NOT NULL,
    "permalink" TEXT,
    "imageUrl" TEXT,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "rootCategoryId" TEXT,
    "price" REAL NOT NULL,
    "originalPrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "rating" REAL,
    "reviewsCount" INTEGER,
    "soldQuantity" INTEGER,
    "bestSellerPosition" INTEGER,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,
    "officialStore" BOOLEAN NOT NULL DEFAULT false,
    "officialStoreName" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreDetails" TEXT,
    "realDiscountPct" REAL,
    "suspiciousDiscount" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReason" TEXT,
    "affiliateUrl" TEXT,
    "affiliateUpdatedAt" DATETIME,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "originalPrice" REAL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "categoryIds" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "provider" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "userId" TEXT,
    "nickname" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OAuthState" (
    "state" TEXT NOT NULL PRIMARY KEY,
    "codeVerifier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CategoryCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rootId" TEXT NOT NULL,
    "rootName" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProductToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProductToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Product_score_idx" ON "Product"("score");

-- CreateIndex
CREATE UNIQUE INDEX "Product_marketplace_externalId_key" ON "Product"("marketplace", "externalId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_productId_capturedAt_idx" ON "PriceSnapshot"("productId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToTag_AB_unique" ON "_ProductToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToTag_B_index" ON "_ProductToTag"("B");
