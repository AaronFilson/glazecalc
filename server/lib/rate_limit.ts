import type { Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { type MessageCode, say } from './messages.ts';

// Limits per client address, unless they say otherwise. In production nginx
// passes the address in X-Forwarded-For, which server/app.ts trusts for exactly
// one proxy hop. RATE_LIMITS=off turns them off; the test suites sign up many
// accounts from one address.
const limiter = (minutes: number, limit: number, code: MessageCode, keyGenerator?: (req: Request) => string) =>
  rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.RATE_LIMITS === 'off',
    message: say(code),
    ...(keyGenerator && { keyGenerator })
  });

export const signIn = limiter(15, 20, 'too-many-sign-ins');
export const signUp = limiter(60, 10, 'too-many-sign-ups');
export const guest = limiter(60, 10, 'too-many-trials');
export const forgotPassword = limiter(15, 5, 'too-many-resets');
export const resetPassword = limiter(15, 10, 'too-many-attempts');
export const changePassword = limiter(15, 10, 'too-many-attempts');

/**
 * For routes that check the signed-in user's current password (changing the
 * email or the password, deleting the account), after jwtAuth. Counted per
 * account, not per address, so someone holding a stolen session cannot guess
 * the password from many addresses. One count for all three routes.
 */
export const passwordCheck = limiter(15, 10, 'too-many-attempts', (req) => 'user:' + String(req.user?._id));
