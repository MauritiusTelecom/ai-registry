-- CreateTable
CREATE TABLE "registry"."contacts" (
    "id" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "organisationName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "emailVerificationExpiry" TIMESTAMP(3),
    "linkedUserId" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "registry"."contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_linkedUserId_idx" ON "registry"."contacts"("linkedUserId");

-- CreateIndex
CREATE INDEX "contacts_emailVerificationToken_idx" ON "registry"."contacts"("emailVerificationToken");

-- AddForeignKey
ALTER TABLE "registry"."contacts" ADD CONSTRAINT "contacts_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "registry"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
