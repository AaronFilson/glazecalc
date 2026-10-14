import crypto from 'node:crypto';
import * as mfaKey from '../lib/mfa_key.ts';
import { expect } from './support/app.ts';

const ALICE = '64f0c0ffee0000000000a11c';
const BOB = '64f0c0ffee0000000000b0b0';

// Swaps a character in one part of v1.<iv>.<tag>.<ciphertext>.
const spoil = (stored: string, part: number): string => {
  const parts = stored.split('.');
  const text = parts[part]!;
  parts[part] = (text[0] === 'A' ? 'B' : 'A') + text.slice(1);
  return parts.join('.');
};

describe('the MFA key', () => {
  const saved = process.env.MFA_KEY;
  afterEach(() => {
    if (saved === undefined) delete process.env.MFA_KEY;
    else process.env.MFA_KEY = saved;
  });

  it('round-trips a secret for one account', () => {
    const stored = mfaKey.encrypt('JBSWY3DPEHPK3PXP', ALICE);
    expect(mfaKey.decrypt(stored, ALICE)).to.eql('JBSWY3DPEHPK3PXP');
  });

  it('stores v1.<iv>.<tag>.<ciphertext>, base64url, with a new iv each time', () => {
    const a = mfaKey.encrypt('JBSWY3DPEHPK3PXP', ALICE);
    const b = mfaKey.encrypt('JBSWY3DPEHPK3PXP', ALICE);
    expect(a).to.match(/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/);
    expect(a).to.not.eql(b);
    expect(a).to.not.include('JBSWY3DPEHPK3PXP');
  });

  it('refuses a ciphertext moved to another account', () => {
    const stored = mfaKey.encrypt('JBSWY3DPEHPK3PXP', ALICE);
    expect(() => mfaKey.decrypt(stored, BOB)).to.throw();
  });

  it('refuses a ciphertext, tag or iv that was changed', () => {
    const stored = mfaKey.encrypt('JBSWY3DPEHPK3PXP', ALICE);
    for (const part of [1, 2, 3]) expect(() => mfaKey.decrypt(spoil(stored, part), ALICE)).to.throw();
  });

  it('refuses anything that is not its own format', () => {
    const stored = mfaKey.encrypt('JBSWY3DPEHPK3PXP', ALICE);
    for (const bad of ['', 'JBSWY3DPEHPK3PXP', stored.replace(/^v1/, 'v2'), stored + '.x', 'v1...']) {
      expect(() => mfaKey.decrypt(bad, ALICE), bad).to.throw();
    }
  });

  it('refuses a ciphertext made with another key', () => {
    const stored = mfaKey.encrypt('JBSWY3DPEHPK3PXP', ALICE);
    process.env.MFA_KEY = crypto.randomBytes(32).toString('base64');
    expect(() => mfaKey.decrypt(stored, ALICE)).to.throw();
  });

  it('uses MFA_KEY when set, and refuses one that is not 32 bytes', () => {
    const configured = crypto.randomBytes(32);
    process.env.MFA_KEY = configured.toString('base64');
    expect(mfaKey.key().equals(configured)).to.eql(true);
    process.env.MFA_KEY = crypto.randomBytes(16).toString('base64');
    expect(() => mfaKey.key()).to.throw(/32 bytes/);
  });

  it('uses a fixed development key without MFA_KEY, so a restart keeps enrolments', () => {
    delete process.env.MFA_KEY;
    const a = mfaKey.key();
    expect(a).to.have.length(32);
    expect(mfaKey.key().equals(a)).to.eql(true);
  });

  it('refuses to run in production without MFA_KEY', () => {
    delete process.env.MFA_KEY;
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => mfaKey.key()).to.throw(/MFA_KEY/);
    } finally {
      process.env.NODE_ENV = env;
    }
  });

  it('hashes with HMAC: the same text the same way, and differently under another key', () => {
    const a = mfaKey.hmac('ABCDE12345');
    expect(a).to.match(/^[0-9a-f]{64}$/);
    expect(mfaKey.hmac('ABCDE12345')).to.eql(a);
    expect(mfaKey.hmac('ABCDE12346')).to.not.eql(a);
    // Not a plain hash anyone could compute without the key.
    expect(a).to.not.eql(crypto.createHash('sha256').update('ABCDE12345').digest('hex'));
    process.env.MFA_KEY = crypto.randomBytes(32).toString('base64');
    expect(mfaKey.hmac('ABCDE12345')).to.not.eql(a);
  });
});
