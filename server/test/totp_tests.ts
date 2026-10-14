import * as totp from '../lib/totp.ts';
import { expect } from './support/app.ts';

// RFC 6238, Appendix B: the SHA-1 seed is the ASCII "12345678901234567890".
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');
const RFC_VECTORS: Array<[number, string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130']
];

describe('TOTP (RFC 6238)', () => {
  it('gives the RFC 6238 SHA-1 test vectors, 8 digits', () => {
    for (const [seconds, code] of RFC_VECTORS) {
      expect(totp.codeAt(RFC_SECRET, totp.stepAt(seconds * 1000), 8)).to.eql(code);
    }
  });

  it('gives 6-digit codes by default, the last six of the same', () => {
    for (const [seconds, code] of RFC_VECTORS) {
      expect(totp.codeAt(RFC_SECRET, totp.stepAt(seconds * 1000))).to.eql(code.slice(2));
    }
  });

  it('counts 30-second steps', () => {
    expect(totp.STEP_SECONDS).to.eql(30);
    expect(totp.stepAt(59_999)).to.eql(1);
    expect(totp.stepAt(60_000)).to.eql(2);
  });

  it('takes a code from one step either side of now, and no further', () => {
    const now = 1111111111 * 1000;
    const step = totp.stepAt(now);
    for (const offset of [-1, 0, 1]) {
      expect(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, step + offset), now)).to.eql(step + offset);
    }
    for (const offset of [-3, -2, 2, 3]) {
      expect(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, step + offset), now)).to.eql(null);
    }
  });

  it('takes a code typed with spaces, and nothing but six digits', () => {
    const now = 59 * 1000;
    expect(totp.matchingStep(RFC_SECRET, '287 082', now)).to.eql(1);
    expect(totp.matchingStep(RFC_SECRET, ' 287082 ', now)).to.eql(1);
    for (const bad of ['', '28708', '2870822', '94287082', 'abcdef', '28708a', '287-082', '٢٨٧٠٨٢']) {
      expect(totp.matchingStep(RFC_SECRET, bad, now), bad).to.eql(null);
    }
    expect(totp.matchingStep(RFC_SECRET, 287082 as unknown as string, now)).to.eql(null);
  });

  it('refuses a code made with another secret', () => {
    const other = totp.newSecret();
    const code = totp.codeAt(other, totp.stepAt());
    const result = totp.matchingStep(RFC_SECRET, code);
    // One in a million chance of a real match; then the codes would be equal.
    if (result !== null) expect(totp.codeAt(RFC_SECRET, result)).to.eql(code);
  });

  it('makes 20-byte secrets, a new one each time', () => {
    const a = totp.newSecret();
    const b = totp.newSecret();
    expect(a).to.have.length(20);
    expect(a.equals(b)).to.eql(false);
  });

  describe('base32 (RFC 4648)', () => {
    const VECTORS: Array<[string, string]> = [
      ['', ''],
      ['f', 'MY'],
      ['fo', 'MZXQ'],
      ['foo', 'MZXW6'],
      ['foob', 'MZXW6YQ'],
      ['fooba', 'MZXW6YTB'],
      ['foobar', 'MZXW6YTBOI']
    ];

    it('writes the RFC 4648 vectors, without padding', () => {
      for (const [plain, encoded] of VECTORS) expect(totp.toBase32(Buffer.from(plain))).to.eql(encoded);
    });

    it('reads them back, ignoring case, spaces and padding', () => {
      for (const [plain, encoded] of VECTORS) {
        expect(totp.fromBase32(encoded).toString()).to.eql(plain);
        expect(totp.fromBase32(encoded.toLowerCase() + '====').toString()).to.eql(plain);
      }
      expect(totp.fromBase32('MZXW 6YTB OI').toString()).to.eql('foobar');
    });

    it('round-trips a secret', () => {
      const secret = totp.newSecret();
      const encoded = totp.toBase32(secret);
      expect(encoded).to.match(/^[A-Z2-7]{32}$/);
      expect(totp.fromBase32(encoded).equals(secret)).to.eql(true);
    });

    it('refuses other characters', () => {
      for (const bad of ['MZ1W', 'MZ0W', 'MZ8W', 'MZ-W']) expect(() => totp.fromBase32(bad)).to.throw();
    });
  });

  describe('the setup URI', () => {
    afterEach(() => {
      delete process.env.SITE_LABEL;
    });

    it('names the issuer and the account, each encoded', () => {
      expect(totp.uri('JBSWY3DPEHPK3PXP', 'potter+1@example.com')).to.eql(
        'otpauth://totp/Glazecalc:potter%2B1%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Glazecalc'
      );
    });

    it('names a staging copy, so authenticator apps keep the two apart', () => {
      process.env.SITE_LABEL = 'staging';
      expect(totp.uri('JBSWY3DPEHPK3PXP', 'a@example.com')).to.eql(
        'otpauth://totp/Glazecalc%20(staging):a%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Glazecalc%20(staging)'
      );
    });

    it('groups the secret in fours for typing', () => {
      expect(totp.grouped('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP')).to.eql('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP');
      expect(totp.grouped('ABCDEF')).to.eql('ABCD EF');
    });
  });
});
