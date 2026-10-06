/** MongoDB refused a write because a unique index already has that value (such as an email). */
export const isDuplicateKey = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
