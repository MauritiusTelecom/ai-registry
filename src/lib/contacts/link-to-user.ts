import type { PrismaClient } from "@/generated/prisma";

export function normalizeContactEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Attach anonymous `Contacts` rows (same email, not yet linked) to a user account. */
export async function linkContactsToUser(
  prisma: PrismaClient,
  email: string,
  userId: string
): Promise<number> {
  const normalized = normalizeContactEmail(email);
  const { count } = await prisma.contact.updateMany({
    where: { email: normalized, linkedUserId: null },
    data: { linkedUserId: userId }
  });
  return count;
}
