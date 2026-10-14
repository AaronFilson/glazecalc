// Two-step sign-in on the account page (docs/mfa-plan.md, item 8). STREAM A
// implements these routes; server/app.ts already mounts the router at /api/mfa.
// Replies are typed in lib/mfa.d.ts.
//
// All behind jwtAuth and notGuest. Every change to how the account signs in
// takes an IdentityProof, checked by factors.confirmIdentity: the current
// password, and once MFA is on a current factor too (decision 6). Turning MFA
// on needs a confirmed email ('mfa-needs-confirmed-email'). Adding or removing
// a factor, or new recovery codes, raises tokenVersion and renews this
// browser's cookie (session.start(res, user, 7, keepsSignIn(req))).
//
//   GET    /api/mfa                     MfaSummary
//   POST   /api/mfa/confirm/options     → { options }  a passkey challenge for an IdentityProof
//   POST   /api/mfa/totp/start  IdentityProof         → TotpStartResponse (secret held 10 minutes)
//   POST   /api/mfa/totp        { code }              → RecoveryCodesResponse ('totp-added')
//   DELETE /api/mfa/totp        IdentityProof         ('totp-removed' or 'mfa-off')
//   POST   /api/mfa/passkeys/options IdentityProof    → { options }
//   POST   /api/mfa/passkeys    { response, name }    → RecoveryCodesResponse ('passkey-added')
//   PATCH  /api/mfa/passkeys/:id { name }             ('passkey-renamed'; no password)
//   DELETE /api/mfa/passkeys/:id IdentityProof        ('passkey-removed' or 'mfa-off')
//   POST   /api/mfa/recovery-codes IdentityProof      → RecoveryCodesResponse ('recovery-codes-made')
//
// Limits: limits.changePassword per address and limits.passwordCheck per
// account on every route that checks a password; limits.secondStep and
// limits.secondStepAccount on POST /api/mfa/totp.
import express from 'express';

const mfaRouter = express.Router();
export default mfaRouter;
