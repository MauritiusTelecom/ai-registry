/** Normalise and de-duplicate recipient addresses for transactional mail. */
export function uniqueValidEmails(addresses: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const raw of addresses) {
    const trimmed = raw?.trim().toLowerCase();
    if (trimmed && /^\S+@\S+\.\S+$/.test(trimmed)) set.add(trimmed);
  }
  return [...set];
}
