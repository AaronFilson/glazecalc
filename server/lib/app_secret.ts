import crypto from 'node:crypto';
import * as log from './log.ts';

// Secret for signing login tokens. Production must set APP_SECRET. Elsewhere a
// random secret is made for each run, so sign-ins end when the server restarts.
const choose = (): string => {
  const fromEnvironment = process.env.APP_SECRET;
  if (fromEnvironment) return fromEnvironment;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_SECRET must be set when NODE_ENV is production');
  }
  log.warn('APP_SECRET is not set; using a random secret for this run.');
  return crypto.randomBytes(32).toString('hex');
};

const secret: string = choose();
export default secret;
