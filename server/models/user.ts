import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import regions from '../../lib/regions/index.js';
import languages from '../../lib/regions/languages.js';
import appSecret from '../lib/app_secret.ts';

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
 *   cones          firing to Orton cones or by temperature alone, or '' to follow the region
 *   language       the language of the app and of emails (BCP 47): one of those offered (lib/regions/languages.js)
 *   density        glaze density as specific gravity, degrees Baumé or imperial pint weight, or '' to follow the region
 *   englishTerms   'on' puts the English after key terms in a translated page, for reading English sources
 *   notice         'hidden' once the translation notice is closed
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
  cones: ['', 'orton', 'temperature'],
  language: languages.LIVE_LANGUAGES as readonly string[],
  density: ['', 'sg', 'baume', 'pint'],
  englishTerms: ['off', 'on'],
  notice: ['shown', 'hidden']
} as const;
export type Preferences = { -readonly [K in keyof typeof PREFERENCES]: (typeof PREFERENCES)[K][number] };

export interface UserFields {
  email: string;
  displayname?: string;
  password: string;
  role?: string;
  settings: string[];
  /** Choices that shape how the app shows things; any account or trial may set them. */
  preferences?: Partial<Preferences>;
  /**
   * The materials the potter has on hand, for Match with what I have: library
   * keys (a standard or own material's _id, or "name:" and its name).
   */
  shelf?: string[];
  /**
   * Goes up when the password changes; login tokens carry it, so older tokens
   * (on other devices, or a stolen one) stop working.
   */
  tokenVersion: number;
  /** A trial account (server/routes/guest_routes.ts), removed after expiresAt. */
  guest?: boolean;
  expiresAt?: Date;
  /** A trial's count of each kind of record (server/lib/guest_limits.ts). */
  trialCounts?: Map<string, number>;
}

interface UserMethods {
  /** Sets the password, hashed. Synchronous, for tests and scripts; routes use lib/password.ts. */
  hashPassword(password: string): string;
  comparePassword(password: string): boolean;
  generateToken(expiresIn?: TokenLifetime): string;
}

type UserModel = mongoose.Model<UserFields, object, UserMethods>;
export type UserDocument = mongoose.HydratedDocument<UserFields, UserMethods>;

const userSchema = new mongoose.Schema<UserFields, UserModel, UserMethods>({
  email: { type: String, required: true, trim: true, lowercase: true },
  displayname: String,
  password: { type: String, required: true },
  role: String,
  settings: [String],
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
    notice: { type: String, enum: PREFERENCES.notice }
  },
  shelf: { type: [String], default: undefined },
  tokenVersion: { type: Number, default: 0 },
  guest: Boolean,
  expiresAt: Date,
  trialCounts: { type: Map, of: Number }
});

userSchema.method('hashPassword', function (this: UserDocument, password: string) {
  this.password = bcrypt.hashSync(password, 10);
  return this.password;
});

userSchema.method('comparePassword', function (this: UserDocument, password: string) {
  return bcrypt.compareSync(password, this.password);
});

userSchema.method('generateToken', function (this: UserDocument, expiresIn: TokenLifetime = '7d') {
  return jwt.sign({ id: String(this._id), tv: this.tokenVersion || 0 }, appSecret, { algorithm: 'HS256', expiresIn });
});

// One account per email, ignoring case.
userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
// Finds expired trials, and counts the active ones.
userSchema.index({ expiresAt: 1 }, { partialFilterExpression: { guest: true } });

export default mongoose.model<UserFields, UserModel>('User', userSchema);
