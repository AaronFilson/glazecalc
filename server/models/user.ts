import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import regions from '../../lib/regions/index.js';
import languages from '../../lib/regions/languages.js';
import limits from '../../lib/recipe/limits.js';
import appSecret from '../lib/app_secret.ts';
import { PASSKEY_NAME_MAX } from '../../lib/mfa.js';
import type { SecondStepMethods } from '../../lib/mfa.js';

/** How long a sign-in token lasts, in days: '7d'. */
export type TokenLifetime = `${number}d`;

/**
 * Choices about how the app shows things, and the values each may take; the
 * first is the default.
 *   weightUnit     batch weights in grams, or in pounds and ounces
 *   gramPrecision  grams to a tenth (hundredths under 10 g), or in full
 *   theme          light or dark as the device is set, or always one
 *   palette        the colors of buttons, links and tabs, named for glazes
 *   lead           whether materials with lead may be added to recipes and suggested
 *   region         where the potter works (lib/regions), or '' until chosen: the
 *                  poison line and rules in the guides, the materials sold there,
 *                  and the defaults below
 *   format         numbers and dates as the language and region write them
 *                  ('auto'), or as a named locale (de-DE)
 *   decimalMark    typing amounts with either mark, or only a comma or a point
 *   temperature    °C or °F, or '' to follow the region
 *   cones          firing to Orton cones, to SK cones (JIS R 8101) or by temperature alone, or '' to follow the region
 *   language       the language of the app and of emails (BCP 47): one of those offered (lib/regions/languages.js)
 *   density        glaze density as specific gravity, degrees Baumé or imperial pint weight, or '' to follow the region
 *   englishTerms   'on' puts the English after key terms in a translated page, for reading English sources
 *   notice         'hidden' once the translation notice is closed
 *   recipeHelp     the recipe page's help: open for an account with no recipes yet ('auto'), or as chosen
 *   limitSet       the limits the recipe page shows a glaze against (lib/recipe/limits.js): Hesselberth & Roy's or the app's own
 *   currency       the one currency the account's prices are in (ISO 4217), or '' to follow the region
 *                  (lib/regions currencyFor); prices are never converted
 *   calendar       the calendar dates are shown in: the Gregorian, the Thai Buddhist era or Japan's eras
 *                  (lib/regions CALENDARS); dates are typed and saved in the Gregorian
 */
export const PREFERENCES = {
  weightUnit: ['g', 'lb'],
  gramPrecision: ['single', 'full'],
  theme: ['system', 'light', 'dark'],
  palette: ['tenmoku', 'celadon', 'cobalt', 'oxblood', 'shino', 'ash'],
  lead: ['off', 'on'],
  region: ['', ...regions.REGION_CODES],
  format: ['auto', ...regions.FORMAT_LOCALES],
  decimalMark: ['either', 'comma', 'point'],
  temperature: ['', 'C', 'F'],
  cones: ['', 'orton', 'temperature', 'sk'],
  language: languages.LIVE_LANGUAGES as readonly string[],
  density: ['', 'sg', 'baume', 'pint'],
  englishTerms: ['off', 'on'],
  notice: ['shown', 'hidden'],
  recipeHelp: ['auto', 'shown', 'hidden'],
  limitSet: [
    limits.DEFAULT_LIMIT_SET,
    ...Object.keys(limits.LIMIT_SETS).filter((id) => id !== limits.DEFAULT_LIMIT_SET)
  ],
  currency: ['', ...regions.CURRENCIES],
  calendar: regions.CALENDARS
} as const;
export type Preferences = { -readonly [K in keyof typeof PREFERENCES]: (typeof PREFERENCES)[K][number] };

/**
 * A passkey (WebAuthn credential) the account signs in with
 * (server/lib/webauthn.ts). The entry's _id is the id the app and the routes
 * use; the credential id, public key and counter never leave the server.
 */
export interface Passkey {
  _id: mongoose.Types.ObjectId;
  /** base64url, as the browser sends it; unique across all accounts. */
  credentialId: string;
  /** COSE public key. */
  publicKey: Buffer;
  /** The authenticator's signature counter: a lower one than stored is refused. */
  counter: number;
  transports: string[];
  /** 'singleDevice' or 'multiDevice' (synced). */
  deviceType: string;
  backedUp: boolean;
  /** Chosen by the user, at most PASSKEY_NAME_MAX (lib/mfa.js) characters. */
  name: string;
  addedAt: Date;
  lastUsedAt?: Date;
}

/** A material's price per kilogram, by its library key (see UserFields.prices). */
export interface Price {
  key: string;
  perKg: number;
}

/** A recovery code: only HMAC-SHA256(MFA_KEY, normalized code) is kept (server/lib/recovery_codes.ts). */
export interface RecoveryCode {
  hash: string;
  usedAt?: Date;
}

/**
 * Two-step sign-in (docs/mfa-plan.md, item 5). Absent until the first factor
 * is added. "On" means an authenticator app or at least one passkey (mfaOn);
 * removing the last factor removes the recovery codes too.
 */
export interface MfaFields {
  /** The WebAuthn user handle: 16 random bytes, base64url; never the ObjectId. */
  handle?: string;
  /** The authenticator app. */
  totp?: {
    /** The base32 secret, encrypted: v1.<iv>.<tag>.<ciphertext> (server/lib/mfa_key.ts). */
    secret: string;
    /** The last 30-second step a code was accepted for: a code is never taken twice. */
    lastStep: number;
    addedAt: Date;
    lastUsedAt?: Date;
  };
  /** At most PASSKEY_LIMIT (lib/mfa.js). */
  passkeys: Passkey[];
  recoveryCodes: RecoveryCode[];
  recoveryMadeAt?: Date;
  /**
   * When the owner's script (server/clear_mfa.ts --notify) told the address
   * that two-step sign-in will be turned off; --clear refuses before 7 days.
   */
  clearRequestedAt?: Date;
  /**
   * When the owner was last emailed that someone entered the password but did
   * not finish the second step (server/lib/second_step.ts noticeUnfinished):
   * at most one such email a day.
   */
  unfinishedNoticeAt?: Date;
  /** Wrong codes from the authenticator app (server/lib/code_lock.ts). */
  codeGuesses?: CodeGuesses;
}

/**
 * A provider account the person signs in with (server/lib/oauth.ts, docs/adr/0015-provider-sign-in.md):
 * found by the provider and its subject, the provider's own unchanging id for
 * the person (Google's sub, GitHub's numeric id, Microsoft's tenant id and sub
 * as tid:sub, docs/adr/0023-microsoft-sign-in.md), never by an email. Nothing
 * else from the provider is kept: no name, no picture, no provider token.
 */
export interface Identity {
  /** 'google', 'github' or 'microsoft' (server/lib/oauth.ts PROVIDERS). */
  provider: string;
  subject: string;
  /**
   * provider:subject (google:1234, microsoft:<tid>:<sub>), what the unique index and the lookups use:

   * an index on the two fields of one array would pair every provider with every
   * subject in it, so two accounts could clash over a pair neither has.
   */
  uid: string;
  linkedAt: Date;
  lastUsedAt?: Date;
}

/** Wrong codes counted against an account (server/lib/code_lock.ts). */
export interface CodeGuesses {
  /** The account's tokenVersion they were counted under: a new one starts again. */
  version: number;
  /** Wrong codes in this round. */
  wrong: number;
  /** Rounds used up: how long the next refusal lasts. */
  rounds: number;
  /** The last wrong code. */
  at?: Date;
  /** Codes are refused until then. */
  lockedUntil?: Date;
  /** Goes up with every write, for compare-and-set. */
  n?: number;
}

export interface UserFields {
  email: string;
  /**
   * A trial's generated name ("speckled quiet kilns"), kept when the trial
   * becomes an account. The app sets no other and shows an account by its
   * email; PUT /api/usersettings still takes one, for API callers.
   */
  displayname?: string;
  password: string;
  role?: string;
  /** Choices that shape how the app shows things; any account or trial may set them. */
  preferences?: Partial<Preferences>;
  /**
   * The materials the potter has on hand, for Match with what I have: library
   * keys (a standard or own material's _id, or "name:" and its name).
   */
  shelf?: string[];
  /**
   * What the potter pays for materials, for cost per batch: a price per
   * kilogram by library key (as the shelf's), in the account's one currency
   * (preferences.currency). Business data, private to the account: never in
   * a record, so never shared with one; exported and deleted with the account.
   */
  prices?: Price[];
  /**
   * Goes up when the password changes; login tokens carry it, so older tokens
   * (on other devices, or a stolen one) stop working.
   */
  tokenVersion: number;
  /**
   * Set on accounts made since email verification began, until the link sent to
   * the address is opened (server/routes/email_routes.ts). Accounts without it,
   * the older ones included, count as verified.
   */
  emailUnverified?: boolean;
  /**
   * When the address last changed: when the link sent to the new one was
   * opened (server/routes/email_routes.ts). server/clear_mfa.ts refuses for 30
   * days after it. Absent until the first change.
   */
  emailChangedAt?: Date;
  /** A trial account (server/routes/guest_routes.ts), removed after expiresAt. */
  guest?: boolean;
  expiresAt?: Date;
  /** A trial's count of each kind of record (server/lib/guest_limits.ts). */
  trialCounts?: Map<string, number>;
  /** Two-step sign-in; never settable through /api/usersettings, never sent whole. */
  mfa?: MfaFields;
  /** Provider accounts it signs in with, at most one per provider (server/routes/oauth_routes.ts). */
  identities?: Identity[];
  /**
   * Made by signing in with a provider: the password is a random one nobody
   * knows, until one is set through the reset email (server/routes/password_routes.ts).
   * Absent on every other account.
   */
  passwordless?: boolean;
}

interface UserMethods {
  /** Sets the password, hashed. Synchronous, for tests and scripts; routes use lib/password.ts. */
  hashPassword(password: string): string;
  comparePassword(password: string): boolean;
  generateToken(expiresIn?: TokenLifetime, keep?: boolean): string;
}

type UserModel = mongoose.Model<UserFields, object, UserMethods>;
export type UserDocument = mongoose.HydratedDocument<UserFields, UserMethods>;

const passkeySchema = new mongoose.Schema<Passkey>({
  credentialId: { type: String, required: true },
  publicKey: { type: Buffer, required: true },
  counter: { type: Number, default: 0 },
  transports: { type: [String], default: [] },
  deviceType: String,
  backedUp: Boolean,
  name: { type: String, required: true, maxlength: PASSKEY_NAME_MAX },
  addedAt: { type: Date, required: true },
  lastUsedAt: Date
});

const mfaSchema = new mongoose.Schema<MfaFields>(
  {
    handle: String,
    totp: {
      type: new mongoose.Schema(
        {
          secret: { type: String, required: true },
          lastStep: { type: Number, default: 0 },
          addedAt: Date,
          lastUsedAt: Date
        },
        { _id: false }
      ),
      default: undefined
    },
    passkeys: { type: [passkeySchema], default: [] },
    recoveryCodes: { type: [new mongoose.Schema({ hash: String, usedAt: Date }, { _id: false })], default: [] },
    recoveryMadeAt: Date,
    clearRequestedAt: Date,
    unfinishedNoticeAt: Date,
    codeGuesses: {
      type: new mongoose.Schema(
        { version: Number, wrong: Number, rounds: Number, at: Date, lockedUntil: Date, n: Number },
        { _id: false }
      ),
      default: undefined
    }
  },
  { _id: false }
);

/** At most this many materials on the shelf, by the website (PUT /api/shelf) or an assistant (add_to_shelf). */
export const SHELF_MOST = 500;
/** The longest key the shelf takes. */
export const SHELF_KEY_LONGEST = 200;

const userSchema = new mongoose.Schema<UserFields, UserModel, UserMethods>({
  email: { type: String, required: true, trim: true, lowercase: true },
  displayname: String,
  password: { type: String, required: true },
  role: String,
  // The old app's `settings` list, never used, is no longer read or written.
  // Documents that still have it load as before; the field is simply ignored.
  preferences: {
    weightUnit: { type: String, enum: PREFERENCES.weightUnit },
    gramPrecision: { type: String, enum: PREFERENCES.gramPrecision },
    theme: { type: String, enum: PREFERENCES.theme },
    palette: { type: String, enum: PREFERENCES.palette },
    lead: { type: String, enum: PREFERENCES.lead },
    region: { type: String, enum: PREFERENCES.region },
    format: { type: String, enum: PREFERENCES.format },
    decimalMark: { type: String, enum: PREFERENCES.decimalMark },
    temperature: { type: String, enum: PREFERENCES.temperature },
    cones: { type: String, enum: PREFERENCES.cones },
    language: { type: String, enum: PREFERENCES.language },
    density: { type: String, enum: PREFERENCES.density },
    englishTerms: { type: String, enum: PREFERENCES.englishTerms },
    notice: { type: String, enum: PREFERENCES.notice },
    recipeHelp: { type: String, enum: PREFERENCES.recipeHelp },
    limitSet: { type: String, enum: PREFERENCES.limitSet },
    currency: { type: String, enum: PREFERENCES.currency },
    calendar: { type: String, enum: PREFERENCES.calendar }
  },
  shelf: { type: [String], default: undefined },
  prices: {
    type: [new mongoose.Schema<Price>({ key: { type: String, required: true }, perKg: Number }, { _id: false })],
    default: undefined
  },
  tokenVersion: { type: Number, default: 0 },
  emailUnverified: Boolean,
  emailChangedAt: Date,
  guest: Boolean,
  expiresAt: Date,
  trialCounts: { type: Map, of: Number },
  mfa: { type: mfaSchema, default: undefined },
  identities: {
    type: [
      new mongoose.Schema<Identity>(
        {
          provider: { type: String, required: true },
          subject: { type: String, required: true },
          uid: { type: String, required: true },
          linkedAt: { type: Date, required: true },
          lastUsedAt: Date
        },
        { _id: false }
      )
    ],
    default: undefined
  },
  passwordless: Boolean
});

userSchema.method('hashPassword', function (this: UserDocument, password: string) {
  this.password = bcrypt.hashSync(password, 10);
  return this.password;
});

userSchema.method('comparePassword', function (this: UserDocument, password: string) {
  return bcrypt.compareSync(password, this.password);
});

// { id, tv, ss, sid }: the user, their token version, ss when the sign-in is for
// this browser session only (server/lib/session.ts), so a renewed cookie keeps
// its kind, and a random id, so that no two sign-in tokens are the same even
// when made in the same second: what is tied to one session (a provider
// reauth, jwt_auth.ts sessionKeyOf) is tied to that token alone.
userSchema.method('generateToken', function (this: UserDocument, expiresIn: TokenLifetime = '7d', keep = true) {
  return jwt.sign(
    {
      id: String(this._id),
      tv: this.tokenVersion || 0,
      ...(keep ? {} : { ss: true }),
      sid: crypto.randomBytes(12).toString('base64url')
    },
    appSecret,
    { algorithm: 'HS256', expiresIn }
  );
});

// One account per email, ignoring case.
userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
// Finds expired trials, and counts the active ones.
userSchema.index({ expiresAt: 1 }, { partialFilterExpression: { guest: true } });
// One account per passkey, and passkey-first sign-in finds the account by it.
userSchema.index(
  { 'mfa.passkeys.credentialId': 1 },
  { unique: true, partialFilterExpression: { 'mfa.passkeys.credentialId': { $exists: true } } }
);

// One account per provider account, and provider sign-in finds the account by it.
userSchema.index(
  { 'identities.uid': 1 },
  { unique: true, partialFilterExpression: { 'identities.uid': { $exists: true } } }
);

/** Whether the account has two-step sign-in on: an authenticator app or a passkey. */
export const mfaOn = (user: Pick<UserFields, 'mfa'>): boolean => Boolean(user.mfa?.totp || user.mfa?.passkeys?.length);

/** The second steps the account can take at sign-in (lib/mfa.d.ts). */
export const factorMethods = (user: Pick<UserFields, 'mfa'>): SecondStepMethods => ({
  totp: Boolean(user.mfa?.totp),
  passkey: Boolean(user.mfa?.passkeys?.length),
  recovery: mfaOn(user) && (user.mfa?.recoveryCodes ?? []).some((code) => !code.usedAt)
});

export default mongoose.model<UserFields, UserModel>('User', userSchema);
