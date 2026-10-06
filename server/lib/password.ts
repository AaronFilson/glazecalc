import bcrypt from 'bcrypt';

const COST = 10;
// bcrypt uses only the first 72 bytes of a password, so longer ones are refused
// instead of being silently cut short.
const MAX_BYTES = 72;

/** Why a new password cannot be used, or null when it is fine. */
export const problem = (password: unknown): string | null => {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Please enter a password 8 characters or longer.';
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) {
    return 'Please enter a password of at most 72 characters (fewer with accented letters or symbols).';
  }
  return null;
};

// The async calls run on Node's thread pool, so hashing does not hold up other requests.
export const hash = (password: string): Promise<string> => bcrypt.hash(password, COST);

export const matches = (password: unknown, hashed: unknown): Promise<boolean> =>
  typeof password === 'string' && typeof hashed === 'string'
    ? bcrypt.compare(password, hashed)
    : Promise.resolve(false);

// Compared against when no account matches, so a sign-in with an unknown email
// takes as long as one with a wrong password.
const UNUSED_HASH = bcrypt.hashSync('no account has this password', COST);
export const matchesNothing = async (password: unknown): Promise<false> => {
  await matches(String(password), UNUSED_HASH);
  return false;
};
