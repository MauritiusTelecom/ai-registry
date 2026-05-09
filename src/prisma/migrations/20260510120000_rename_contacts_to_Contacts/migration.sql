-- Prisma model `Contact` @@map("Contacts") — physical table name is PascalCase.
-- Safe if the table was already renamed or never existed under `contacts`.

ALTER TABLE IF EXISTS "registry"."contacts" RENAME TO "Contacts";
