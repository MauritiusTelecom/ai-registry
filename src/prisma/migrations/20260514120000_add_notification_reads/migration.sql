-- CreateTable
CREATE TABLE "registry"."NotificationRead" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_userId_notificationKey_key"
    ON "registry"."NotificationRead"("userId", "notificationKey");

-- CreateIndex
CREATE INDEX "NotificationRead_userId_idx"
    ON "registry"."NotificationRead"("userId");

-- CreateIndex
CREATE INDEX "NotificationRead_readAt_idx"
    ON "registry"."NotificationRead"("readAt");

-- AddForeignKey
ALTER TABLE "registry"."NotificationRead"
    ADD CONSTRAINT "NotificationRead_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "registry"."User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
