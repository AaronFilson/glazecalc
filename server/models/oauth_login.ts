import mongoose from 'mongoose';

// A sign-in with Google or GitHub under way (server/routes/oauth_routes.ts,
// docs/adr/0015-provider-sign-in.md). The browser holds a random value in the
// short glazecalc_oauth cookie; this record is found by its SHA-256 (keyHash),
// so the database alone cannot finish anyone's sign-in.
//
// Started (GET /api/auth/:provider/start, or POST /api/auth/:provider/link
// from the account page), it holds what the provider's answer is checked
// against: the state, the OpenID Connect nonce and the PKCE verifier. The
// callback spends those and writes what the answer came to (outcome); the
// page then finishes it with POST /api/auth/finish, which starts the session,
// asks for the second step or links the provider. It lives
// OAUTH_LOGIN_MINUTES, then MongoDB deletes it.
export type OAuthOutcome = 'signin' | 'create' | 'link-needed' | 'link' | 'error';

export interface OAuthLoginFields {
  keyHash: string;
  provider: string;
  /** Sent to the provider and checked on the way back (with the cookie, against login CSRF). */
  state?: string;
  nonce?: string;
  /** The PKCE code verifier: the provider gets its SHA-256 at the start, and the verifier with the code. */
  verifier?: string;
  /** The page to go to once signed in, in its language (/de/recipe); checked with isPage. */
  next: string;
  /** "Keep me signed in on this device" when the provider button was pressed. */
  keep: boolean;
  /** A trial on this browser at the start, merged into the account at the end. */
  trialId?: mongoose.Types.ObjectId;
  /** Linking from the account page: the account, and its tokenVersion then. */
  linkUserId?: mongoose.Types.ObjectId;
  linkTokenVersion?: number;
  /** What the provider's answer came to; absent until the callback. */
  outcome?: OAuthOutcome;
  /** 'signin': the account the provider account is linked to. */
  userId?: mongoose.Types.ObjectId;
  /** The provider's id for the person and its verified email ('create', 'link-needed', 'link'). */
  subject?: string;
  email?: string;
  /** 'error': the message code to show. */
  error?: string;
  expiresAt: Date;
}

/** How long a provider sign-in may take, start to finish. */
export const OAUTH_LOGIN_MINUTES = 10;

const oauthLoginSchema = new mongoose.Schema<OAuthLoginFields>(
  {
    keyHash: { type: String, required: true, unique: true },
    provider: { type: String, required: true },
    state: String,
    nonce: String,
    verifier: String,
    next: { type: String, required: true },
    keep: { type: Boolean, default: false },
    trialId: mongoose.Schema.Types.ObjectId,
    linkUserId: { type: mongoose.Schema.Types.ObjectId, index: true },
    linkTokenVersion: Number,
    outcome: { type: String, enum: ['signin', 'create', 'link-needed', 'link', 'error'] },
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    subject: String,
    email: String,
    error: String,
    expiresAt: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB deletes them once they expire.
oauthLoginSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OAuthLogin = mongoose.model<OAuthLoginFields>('OAuthLogin', oauthLoginSchema);
export default OAuthLogin;
