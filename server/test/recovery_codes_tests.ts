import * as recoveryCodes from '../lib/recovery_codes.ts';
import User from '../models/user.ts';
import { expect, makeUser } from './support/app.ts';

const SHOWN = /^[0-9a-hjkmnp-tv-z]{5}-[0-9a-hjkmnp-tv-z]{5}$/;

/** An account with two-step sign-in on (an authenticator entry) and a fresh set of codes. */
const withCodes = async () => {
  const { user } = await makeUser();
  const made = recoveryCodes.make();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        mfa: {
          totp: { secret: 'v1.x.y.z', lastStep: 0, addedAt: new Date() },
          passkeys: [],
          recoveryCodes: made.stored,
          recoveryMadeAt: new Date()
        }
      }
    }
  );
  return { user, codes: made.codes };
};

describe('recovery codes', () => {
  it('makes 10 codes of 10 Crockford base32 characters, shown as xxxxx-xxxxx', () => {
    const { codes, stored } = recoveryCodes.make();
    expect(codes).to.have.length(10);
    expect(new Set(codes).size).to.eql(10);
    for (const code of codes) expect(code).to.match(SHOWN);
    expect(stored).to.have.length(10);
  });

  it('stores only a keyed hash of each code', () => {
    const { codes, stored } = recoveryCodes.make();
    for (const [i, code] of codes.entries()) {
      expect(stored[i]!.hash).to.match(/^[0-9a-f]{64}$/);
      expect(stored[i]!.hash).to.eql(recoveryCodes.hashOf(recoveryCodes.normalize(code)!));
      expect(JSON.stringify(stored)).to.not.include(code.replace('-', '').toUpperCase());
      expect(stored[i]!.usedAt).to.eql(undefined);
    }
  });

  it('reads a code however it is typed', () => {
    expect(recoveryCodes.normalize('abcde-12345')).to.eql('ABCDE12345');
    expect(recoveryCodes.normalize('ABCDE12345')).to.eql('ABCDE12345');
    expect(recoveryCodes.normalize(' abcde 12345 ')).to.eql('ABCDE12345');
    expect(recoveryCodes.normalize('ab-cd-e1-23-45')).to.eql('ABCDE12345');
    // Crockford: I and L are 1, O is 0.
    expect(recoveryCodes.normalize('iLoab-cdefg')).to.eql('110ABCDEFG');
    // From a Chinese or Japanese input method: full-width letters, digits, dash and space.
    expect(recoveryCodes.normalize('ａｂｃｄｅ－１２３４５')).to.eql('ABCDE12345');
    expect(recoveryCodes.normalize('ＡＢＣＤＥ　１２３４５')).to.eql('ABCDE12345');
    expect(recoveryCodes.normalize('abcdeー12345')).to.eql('ABCDE12345');
    expect(recoveryCodes.normalize('abcde–12345')).to.eql('ABCDE12345');
  });

  it('refuses what cannot be a code', () => {
    for (const bad of ['', 'abcde-1234', 'abcde-123456', 'abcde-1234u', 'abcde-1234!', 'a'.repeat(200)]) {
      expect(recoveryCodes.normalize(bad), bad).to.eql(null);
    }
    expect(recoveryCodes.normalize(12345 as unknown as string)).to.eql(null);
  });

  it('uses a code once, and says how many are left', async () => {
    const { user, codes } = await withCodes();
    expect(await recoveryCodes.use(user._id, codes[0]!)).to.eql(9);
    expect(await recoveryCodes.use(user._id, codes[0]!)).to.eql(null);
    expect(await recoveryCodes.use(user._id, codes[1]!.toUpperCase().replace('-', ''))).to.eql(8);
    const after = await User.findById(user._id).lean();
    expect(recoveryCodes.left(after!)).to.eql(8);
    expect(after!.mfa!.recoveryCodes.filter((code) => code.usedAt)).to.have.length(2);
  });

  it('uses a code only once even when two requests send it at the same moment', async () => {
    const { user, codes } = await withCodes();
    const results = await Promise.all([1, 2, 3].map(() => recoveryCodes.use(user._id, codes[2]!)));
    expect(results.filter((left) => left === 9)).to.have.length(1);
    expect(results.filter((left) => left === null)).to.have.length(2);
  });

  it("refuses a wrong code, and another account's code", async () => {
    const alice = await withCodes();
    const bob = await withCodes();
    expect(await recoveryCodes.use(alice.user._id, 'zzzzz-zzzzz')).to.eql(null);
    expect(await recoveryCodes.use(alice.user._id, bob.codes[0]!)).to.eql(null);
    expect(await recoveryCodes.use(alice.user._id, 'not a code')).to.eql(null);
    expect(recoveryCodes.left((await User.findById(alice.user._id).lean())!)).to.eql(10);
  });

  it('counts none for an account without them', () => {
    expect(recoveryCodes.left({})).to.eql(0);
  });
});
