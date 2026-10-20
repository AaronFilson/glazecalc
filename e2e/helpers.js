const { expect } = require('@playwright/test');
const API = 'http://localhost:' + (process.env.E2E_PORT || '3100') + '/api';

// The workers run at once, so an address carries the worker's process id too.
let count = 0;
const uniqueEmail = (label) => label + '-' + Date.now() + '-' + process.pid + '-' + count++ + '@test.com';

// Creates an account through the API in the page's own browser context, so the
// session cookie it sets is there when the page opens, and notes the session as
// the app does, so a test can start on a page already signed in.
const signUpAndSignIn = async (page) => {
  const email = uniqueEmail('user');
  const res = await page.request.post(API + '/signup', { data: { email, password: 'password123' } });
  if (!res.ok()) throw new Error('signup failed: ' + res.status());
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  return { email };
};

// The app sets data-app-ready on <html> once it has taken over the prerendered
// page (client/app/app.ts); a click before then does nothing, which a busy
// machine (or many workers) makes likely.
const appReady = (page) =>
  page.waitForFunction(() => globalThis.document.documentElement.hasAttribute('data-app-ready'));

// Opens the intro page and presses "Try it now" once the app has started there.
const startTrial = async (page) => {
  await page.goto('/');
  await appReady(page);
  await page.locator('.hero-actions').getByRole('button', { name: 'Try it now' }).click();
};

// Text to match as it is, inside a regular expression.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A library entry's Add button: "Add Custer Spar", with ", Discontinued 2023" after
// the name when it is no longer current.
const addButtonName = (name) => new RegExp('^Add ' + escapeRegExp(name) + '(,|$)');

// Adds a material to the recipe from the library ('Standard' or 'My materials')
// and enters its amount.
const addMaterial = async (page, name, amount, tab = 'Standard') => {
  const library = page.locator('.library', { hasText: 'Add materials' });
  await library.getByRole('button', { name: new RegExp('^' + tab) }).click();
  await library.getByRole('searchbox').fill(name);
  await library.getByRole('button', { name: addButtonName(name) }).click();
  await page.getByRole('textbox', { name: 'Amount of ' + name, exact: true }).fill(String(amount));
};
const addStandardMaterial = (page, name, amount) => addMaterial(page, name, amount, 'Standard');

// Adds a standard colorant to the recipe and enters its amount (a percent of the base, unless changed).
const addColorant = async (page, name, amount) => {
  const library = page.locator('.library', { hasText: 'Add colorants and additives' });
  await library.getByRole('button', { name: /^Standard/ }).click();
  await library.getByRole('searchbox').fill(name);
  await library.getByRole('button', { name: addButtonName(name) }).click();
  await page.getByRole('textbox', { name: 'Amount of ' + name, exact: true }).fill(String(amount));
};

// Chooses in a searchable list (client/app/shared/picker.ts) as a person does: opens it, types the name, and
// presses Enter on the first that matches. `field` is the list's text field.
const choosePicked = async (field, name) => {
  await field.click();
  await field.fill(name);
  await field.press('Enter');
};

// A field marked wrong (client/app/shared/field-checks.ts): aria-invalid, and
// the message under it is the field's description, so a screen reader says it.
const expectFieldProblem = async (page, id, message) => {
  const field = page.locator('#' + id);
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toHaveAccessibleDescription(new RegExp(escapeRegExp(message) + '$'));
  await expect(page.locator('#' + id + '-problem')).toHaveText(message);
};

// Two-step sign-in (docs/mfa-plan.md, e2e/mfa.spec.js).

/** An Authorization header for GET /api/signin. */
const basicAuth = (email, password) => 'Basic ' + Buffer.from(email + ':' + password).toString('base64');

/**
 * An account with a confirmed address (two-step sign-in needs one), made
 * through the API in the given request context. Its first email, the
 * confirmation, has been read.
 */
const confirmedAccount = async (request, password = 'password123') => {
  const { confirmLink, nextEmail } = require('./mail');
  const email = uniqueEmail('mfa');
  const res = await request.post(API + '/signup', { data: { email, password } });
  if (!res.ok()) throw new Error('signup failed: ' + res.status());
  const token = new URLSearchParams(new URL(confirmLink(await nextEmail(email))).hash.slice(1)).get('token');
  const confirmed = await request.post(API + '/email/confirm', { data: { token } });
  if (!confirmed.ok()) throw new Error('confirming the address failed: ' + confirmed.status());
  return { email, password };
};

/** RFC 4648 base32 (no padding), as authenticator apps read the key. */
const base32Decode = (text) => {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of text.toUpperCase().replace(/[\s=-]/g, '')) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error('not base32: ' + char);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

/**
 * The authenticator app's code (RFC 6238: HMAC-SHA1, 30-second steps, 6
 * digits) for a base32 key, at `time` (ms) or now. The server accepts one step
 * either side and each step once, so a test that signs in right after
 * enrolling asks for the next step: totp(secret, Date.now() + 30000).
 */
const totp = (secret, time = Date.now(), digits = 6) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 1000 / 30)));
  const hash = require('crypto').createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = hash.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
};

/**
 * A virtual passkey authenticator in this page's browser (Chrome DevTools
 * Protocol), which answers navigator.credentials as a platform passkey with
 * user verification would, with no prompt. Chromium only.
 */
const virtualAuthenticator = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true
    }
  });
  return {
    cdp,
    authenticatorId,
    /** The passkeys the authenticator holds. */
    credentials: async () => (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials,
    remove: () => cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId })
  };
};

/**
 * Makes a passkey in the page from creation options (PublicKeyCredentialCreationOptionsJSON,
 * as the server sends them) and returns the RegistrationResponseJSON the
 * server takes: what @simplewebauthn/browser's startRegistration does, for
 * tests that drive the API directly. The page must be open on the site.
 */
const createPasskey = (page, optionsJSON) =>
  page.evaluate(async (options) => {
    const toBytes = (text) => {
      const plain = text.replace(/-/g, '+').replace(/_/g, '/');
      return Uint8Array.from(atob(plain + '='.repeat((4 - (plain.length % 4)) % 4)), (c) => c.charCodeAt(0));
    };
    const toText = (buffer) =>
      btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    const credential = await navigator.credentials.create({
      publicKey: {
        ...options,
        challenge: toBytes(options.challenge),
        user: { ...options.user, id: toBytes(options.user.id) },
        excludeCredentials: (options.excludeCredentials ?? []).map((c) => ({ ...c, id: toBytes(c.id) }))
      }
    });
    const response = credential.response;
    return {
      id: credential.id,
      rawId: toText(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
      clientExtensionResults: credential.getClientExtensionResults(),
      response: {
        clientDataJSON: toText(response.clientDataJSON),
        attestationObject: toText(response.attestationObject),
        transports: response.getTransports ? response.getTransports() : [],
        publicKeyAlgorithm: response.getPublicKeyAlgorithm ? response.getPublicKeyAlgorithm() : undefined,
        authenticatorData: response.getAuthenticatorData ? toText(response.getAuthenticatorData()) : undefined
      }
    };
  }, optionsJSON);

/**
 * Uses a passkey in the page with request options (PublicKeyCredentialRequestOptionsJSON)
 * and returns the AuthenticationResponseJSON: what startAuthentication does.
 * Without allowCredentials (passkey-first), the authenticator picks a
 * discoverable passkey for the site.
 */
const usePasskey = (page, optionsJSON) =>
  page.evaluate(async (options) => {
    const toBytes = (text) => {
      const plain = text.replace(/-/g, '+').replace(/_/g, '/');
      return Uint8Array.from(atob(plain + '='.repeat((4 - (plain.length % 4)) % 4)), (c) => c.charCodeAt(0));
    };
    const toText = (buffer) =>
      btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    const credential = await navigator.credentials.get({
      publicKey: {
        ...options,
        challenge: toBytes(options.challenge),
        allowCredentials: (options.allowCredentials ?? []).map((c) => ({ ...c, id: toBytes(c.id) }))
      }
    });
    const response = credential.response;
    return {
      id: credential.id,
      rawId: toText(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
      clientExtensionResults: credential.getClientExtensionResults(),
      response: {
        clientDataJSON: toText(response.clientDataJSON),
        authenticatorData: toText(response.authenticatorData),
        signature: toText(response.signature),
        userHandle: response.userHandle ? toText(response.userHandle) : undefined
      }
    };
  }, optionsJSON);

module.exports = {
  API,
  addColorant,
  addMaterial,
  addStandardMaterial,
  appReady,
  base32Decode,
  basicAuth,
  choosePicked,
  confirmedAccount,
  createPasskey,
  expectFieldProblem,
  signUpAndSignIn,
  startTrial,
  totp,
  uniqueEmail,
  usePasskey,
  virtualAuthenticator
};
