import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import appSecret from '../lib/app_secret.ts';

/** How long a sign-in token lasts, in days: '7d'. */
export type TokenLifetime = `${number}d`;

export interface UserFields {
  email: string;
  displayname?: string;
  password: string;
  role?: string;
  settings: string[];
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
