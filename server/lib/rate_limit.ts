import type { Request } from 'express';
import { rateLimit } from 'express-rate-limit';

// Limits per client address, unless they say otherwise. In production nginx
// passes the address in X-Forwarded-For, which server/app.ts trusts for exactly
// one proxy hop. RATE_LIMITS=off turns them off; the test suites sign up many
// accounts from one address.
const limiter = (minutes: number, limit: number, msg: string, keyGenerator?: (req: Request) => string) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.RATE_LIMITS === 'off',
    message: { msg },
    ...(keyGenerator && { keyGenerator })
  });

const WAIT = 'Please wait a few minutes and try again.';
export const signIn = limiter(15, 20, 'Too many sign-in attempts. ' + WAIT);
export const signUp = limiter(60, 10, 'Too many new accounts from this address. Please try again later.');
export const guest = limiter(
  60,
  10,
  'Too many trials from this address. Please try again later, or create a free account.'
);
export const forgotPassword = limiter(15, 5, 'Too many password reset requests. ' + WAIT);
export const resetPassword = limiter(15, 10, 'Too many attempts. ' + WAIT);
export const changePassword = limiter(15, 10, 'Too many attempts. ' + WAIT);

/**
 * For routes that check the signed-in user's current password (changing the
 * email or the password, deleting the account), after jwtAuth. Counted per
 * account, not per address, so someone holding a stolen session cannot guess
 * the password from many addresses. One count for all three routes.
 */
export const passwordCheck = limiter(15, 10, 'Too many attempts. ' + WAIT, (req) => 'user:' + String(req.user?._id));
