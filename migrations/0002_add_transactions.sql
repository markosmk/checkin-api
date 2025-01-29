-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Session";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gatewayCustomerId" TEXT,
    "gatewaySubscriptionId" TEXT,
    "gatewayPriceId" TEXT,
    "gatewayCurrentPeriodEnd" DATETIME,
    "subscribedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" DATETIME,
    "canceledAt" DATETIME,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" TEXT NOT NULL,
    "description" TEXT,
    "gateway" TEXT,
    "gatewayTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "checkin" DATETIME NOT NULL,
    "checkout" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "nights" INTEGER,
    "client" JSONB NOT NULL,
    "observations" TEXT,
    "requiredFields" JSONB,
    "allowedFields" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("allowedFields", "checkin", "checkout", "client", "createdAt", "hotelId", "id", "nights", "observations", "requiredFields", "reservationId", "status", "updatedAt", "userId") SELECT "allowedFields", "checkin", "checkout", "client", "createdAt", "hotelId", "id", "nights", "observations", "requiredFields", "reservationId", "status", "updatedAt", "userId" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE TABLE "new_Hotel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT,
    "subType" TEXT,
    "coverImage" TEXT,
    "rooms" INTEGER,
    "website" TEXT,
    "phone" TEXT NOT NULL,
    "location" JSONB,
    "options" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "fieldsAllowed" JSONB,
    "domain" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Hotel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Hotel" ("coverImage", "createdAt", "domain", "fieldsAllowed", "id", "isPublic", "location", "name", "options", "phone", "rooms", "slug", "subType", "type", "updatedAt", "userId", "website") SELECT "coverImage", "createdAt", "domain", "fieldsAllowed", "id", "isPublic", "location", "name", "options", "phone", "rooms", "slug", "subType", "type", "updatedAt", "userId", "website" FROM "Hotel";
DROP TABLE "Hotel";
ALTER TABLE "new_Hotel" RENAME TO "Hotel";
CREATE UNIQUE INDEX "Hotel_slug_key" ON "Hotel"("slug");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "tempToken" TEXT,
    "tempTokenExpires" DATETIME,
    "subscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    "deletedAt" DATETIME
);
INSERT INTO "new_User" ("email", "hashedPassword", "id", "name") SELECT "email", "hashedPassword", "id", "name" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_subscriptionId_key" ON "User"("subscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_gatewayCustomerId_key" ON "Subscription"("gatewayCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_gatewaySubscriptionId_key" ON "Subscription"("gatewaySubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
