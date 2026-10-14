// A passkey authenticator in software, for the server tests (docs/mfa-plan.md,
// test plan): an ES256 key from node:crypto, 'none' attestation, and the CBOR
// written by hand. It answers the options the server sends as a browser and
// authenticator would, and can be told to get things wrong: another origin,
// another relying party, no user verification, a counter that goes back.
import crypto from 'node:crypto';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON
} from '@simplewebauthn/server';

// CBOR (RFC 8949), only what WebAuthn needs: integers, byte and text strings,
// arrays and maps. A Map keeps integer keys, as COSE keys have.
type Cbor = number | string | Buffer | Cbor[] | Map<Cbor, Cbor> | { [key: string]: Cbor };

const head = (major: number, length: number): Buffer => {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 0x100) return Buffer.from([(major << 5) | 24, length]);
  if (length < 0x10000) {
    const out = Buffer.alloc(3);
    out[0] = (major << 5) | 25;
    out.writeUInt16BE(length, 1);
    return out;
  }
  const out = Buffer.alloc(5);
  out[0] = (major << 5) | 26;
  out.writeUInt32BE(length, 1);
  return out;
};

export const cbor = (value: Cbor): Buffer => {
  if (typeof value === 'number') return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (typeof value === 'string') {
    const bytes = Buffer.from(value, 'utf8');
    return Buffer.concat([head(3, bytes.length), bytes]);
  }
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  if (Array.isArray(value)) return Buffer.concat([head(4, value.length), ...value.map(cbor)]);
  const entries: Array<[Cbor, Cbor]> = value instanceof Map ? [...value.entries()] : Object.entries(value);
  return Buffer.concat([head(5, entries.length), ...entries.flatMap(([k, v]) => [cbor(k), cbor(v)])]);
};

const FLAG_UP = 0x01;
const FLAG_UV = 0x04;
const FLAG_AT = 0x40;

const sha256 = (data: Buffer | string): Buffer => crypto.createHash('sha256').update(data).digest();
const b64url = (data: Buffer | string): string => Buffer.from(data).toString('base64url');

export interface SoftOptions {
  /** The relying party the authenticator thinks it is talking to. */
  rpId: string;
  /** The page's origin, as the browser would write it into clientDataJSON. */
  origin: string;
}

/** Anything to get wrong in one ceremony. */
export interface Twist {
  origin?: string;
  rpId?: string;
  challenge?: string;
  /** Whether the user was verified (a PIN or a fingerprint); true unless said. */
  userVerified?: boolean;
  /** The signature counter to report, in place of the next one. */
  counter?: number;
  /** The user handle to send; null sends none. */
  userHandle?: string | null;
  /** Spoil the signature. */
  badSignature?: boolean;
}

/** One authenticator holding one passkey. */
export class SoftAuthenticator {
  readonly credentialId: Buffer = crypto.randomBytes(16);
  private readonly keys = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  /** The last counter reported; 0 means the authenticator does not count. */
  counter = 0;
  /** Set by register from the options' user.id. */
  userHandle: string | null = null;
  private readonly site: SoftOptions;
  /** Whether the counter goes up with each use (some authenticators always report 0). */
  private readonly counts: boolean;

  constructor(site: SoftOptions, { counts = true }: { counts?: boolean } = {}) {
    this.site = site;
    this.counts = counts;
  }

  get id(): string {
    return b64url(this.credentialId);
  }

  private coseKey(): Buffer {
    const jwk = this.keys.publicKey.export({ format: 'jwk' });
    return cbor(
      new Map<Cbor, Cbor>([
        [1, 2], // kty: EC2
        [3, -7], // alg: ES256
        [-1, 1], // crv: P-256
        [-2, Buffer.from(jwk.x!, 'base64url')],
        [-3, Buffer.from(jwk.y!, 'base64url')]
      ])
    );
  }

  private nextCounter(twist: Twist): number {
    if (twist.counter !== undefined) return twist.counter;
    if (this.counts) this.counter += 1;
    return this.counter;
  }

  private authData(rpId: string, flags: number, counter: number, attested?: Buffer): Buffer {
    const count = Buffer.alloc(4);
    count.writeUInt32BE(counter);
    return Buffer.concat([sha256(rpId), Buffer.from([flags]), count, ...(attested ? [attested] : [])]);
  }

  /** Answers registration options: a new passkey, as navigator.credentials.create would. */
  register(options: PublicKeyCredentialCreationOptionsJSON, twist: Twist = {}): RegistrationResponseJSON {
    this.userHandle = options.user.id;
    const clientDataJSON = JSON.stringify({
      type: 'webauthn.create',
      challenge: twist.challenge ?? options.challenge,
      origin: twist.origin ?? this.site.origin,
      crossOrigin: false
    });
    const idLength = Buffer.alloc(2);
    idLength.writeUInt16BE(this.credentialId.length);
    const attested = Buffer.concat([Buffer.alloc(16), idLength, this.credentialId, this.coseKey()]);
    const flags = FLAG_UP | FLAG_AT | (twist.userVerified === false ? 0 : FLAG_UV);
    const authData = this.authData(twist.rpId ?? this.site.rpId, flags, this.nextCounter(twist), attested);
    const attestationObject = cbor({ fmt: 'none', attStmt: {}, authData });
    return {
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      response: {
        clientDataJSON: b64url(clientDataJSON),
        attestationObject: b64url(attestationObject),
        transports: ['internal']
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform'
    };
  }

  /** Answers a challenge with this passkey, as navigator.credentials.get would. */
  assert(challenge: string, twist: Twist = {}): AuthenticationResponseJSON {
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: 'webauthn.get',
        challenge: twist.challenge ?? challenge,
        origin: twist.origin ?? this.site.origin,
        crossOrigin: false
      })
    );
    const flags = FLAG_UP | (twist.userVerified === false ? 0 : FLAG_UV);
    const authenticatorData = this.authData(twist.rpId ?? this.site.rpId, flags, this.nextCounter(twist));
    let signature = crypto.sign(
      'sha256',
      Buffer.concat([authenticatorData, sha256(clientDataJSON)]),
      this.keys.privateKey
    );
    if (twist.badSignature) {
      signature = Buffer.from(signature);
      signature[signature.length - 1] ^= 0xff;
    }
    const userHandle = twist.userHandle === undefined ? this.userHandle : twist.userHandle;
    return {
      id: this.id,
      rawId: this.id,
      type: 'public-key',
      response: {
        clientDataJSON: b64url(clientDataJSON),
        authenticatorData: b64url(authenticatorData),
        signature: b64url(signature),
        ...(userHandle ? { userHandle } : {})
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform'
    };
  }
}
