// Two-step sign-in (docs/mfa-plan.md, "Test plan"): authenticator-app codes
// computed in the test (helpers.totp), passkeys from a virtual authenticator
// (Chrome DevTools Protocol, helpers.virtualAuthenticator), recovery codes and
// the notice emails.
//
// The tests marked test.fixme wait for streams A-C (the server's factors and
// sign-in flow, and the app's pages) to be merged; the coordinator turns them
// on. Those that drive the API through the page's own request context (its
// cookies) need only the server; those under "the pages" also need the app,
// and their labels follow client/public/i18n/account/en.json as stream C
// writes it: check them when turning the tests on.
const { test, expect } = require('@playwright/test');
const {
  API,
  basicAuth,
  confirmedAccount,
  createPasskey,
  totp,
  usePasskey,
  virtualAuthenticator
} = require('./helpers');
const { nextEmail, sentTo } = require('./mail');

/** The session cookie a response set, if any. */
const sessionCookieOf = (res) =>
  res
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => h.value)
    .find((value) => value.startsWith('glazecalc_session=')) ?? null;

/** Signs in with the password through the API; returns the reply's JSON and whether a session cookie was set. */
const passwordStep = async (request, email, password) => {
  const res = await request.get(API + '/signin', { headers: { authorization: basicAuth(email, password) } });
  expect(res.status()).toBe(200);
  return { body: await res.json(), cookie: sessionCookieOf(res) };
};

/** Signed in? /api/verify answers with the account's address. */
const expectSignedIn = async (request, email) => {
  const res = await request.get(API + '/verify');
  expect(res.ok()).toBe(true);
  expect((await res.json()).email).toBe(email);
};

const signOut = async (request) => expect((await request.post(API + '/signout')).ok()).toBe(true);

// Runs now: the helpers the tests below rely on work in this browser.
test('the helpers: RFC 6238 codes, and passkeys from a virtual authenticator', async ({ page }) => {
  // RFC 6238 Appendix B, SHA-1, 8 digits: the key "12345678901234567890".
  const rfc = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  expect(totp(rfc, 59 * 1000, 8)).toBe('94287082');
  expect(totp(rfc, 1111111109 * 1000, 8)).toBe('07081804');
  expect(totp(rfc, 2000000000 * 1000, 8)).toBe('69279037');
  expect(totp(rfc, 59 * 1000)).toBe('287082');

  await page.goto('/');
  const authenticator = await virtualAuthenticator(page);
  const random = () => Buffer.from(require('crypto').randomBytes(16)).toString('base64url');
  const made = await createPasskey(page, {
    challenge: random(),
    rp: { id: 'localhost', name: 'Glazecalc' },
    user: { id: random(), name: 'helper@test.com', displayName: 'helper@test.com' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    attestation: 'none'
  });
  expect(made.type).toBe('public-key');
  expect(made.response.attestationObject).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(await authenticator.credentials()).toHaveLength(1);
  // Passkey-first: no allowCredentials, and the authenticator finds the discoverable one.
  const used = await usePasskey(page, { challenge: random(), rpId: 'localhost', userVerification: 'required' });
  expect(used.id).toBe(made.id);
  expect(used.response.userHandle).toMatch(/^[A-Za-z0-9_-]+$/);
  await authenticator.remove();
});

test.describe('two-step sign-in through the API', () => {
  test.fixme('an authenticator app: set up, sign in with a code, then with a recovery code', async ({ page }) => {
    const request = page.request;
    const { email, password } = await confirmedAccount(request);
    await passwordStep(request, email, password);

    // Set up: the password alone, as there is no factor yet.
    const start = await request.post(API + '/mfa/totp/start', { data: { password } });
    expect(start.ok()).toBe(true);
    const { secret, uri, qr } = await start.json();
    expect(uri).toMatch(/^otpauth:\/\/totp\/Glazecalc:.+\?secret=[A-Z2-7]+.*&issuer=Glazecalc/);
    expect(qr).toMatch(/^data:image\/svg\+xml;base64,/);
    const added = await request.post(API + '/mfa/totp', { data: { code: totp(secret) } });
    expect(added.ok()).toBe(true);
    const { recoveryCodes } = await added.json();
    expect(recoveryCodes).toHaveLength(10);
    for (const code of recoveryCodes) expect(code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/i);
    expect((await nextEmail(email, 1)).subject).toBe('A sign-in step was added to your Glazecalc account');

    // The password alone no longer signs in: no cookie, a pending token instead.
    await signOut(request);
    let step = await passwordStep(request, email, password);
    expect(step.cookie).toBeNull();
    expect(step.body.code).toBe('second-step');
    expect(step.body.methods).toEqual({ totp: true, passkey: false, recovery: true });
    expect((await request.get(API + '/verify')).ok()).toBe(false);
    // The pending token is never a sign-in.
    const asBearer = await request.get(API + '/verify', { headers: { authorization: 'Bearer ' + step.body.pending } });
    expect(asBearer.status()).toBe(401);

    // A wrong code, then the next step's code (the one used to set up is spent).
    const wrong = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, code: '000000' }
    });
    expect(wrong.ok()).toBe(false);
    const done = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, code: totp(secret, Date.now() + 30000) }
    });
    expect(done.ok()).toBe(true);
    expect((await done.json()).code).toBe('signed-in');
    expect(sessionCookieOf(done)).not.toBeNull();
    await expectSignedIn(request, email);
    // The token worked once.
    const again = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, code: totp(secret, Date.now() + 30000) }
    });
    expect(again.ok()).toBe(false);

    // A recovery code, in lower case and without its dash, once.
    await signOut(request);
    step = await passwordStep(request, email, password);
    const recoveryCode = recoveryCodes[0].replace('-', '').toLowerCase();
    const recovered = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, recoveryCode }
    });
    expect(recovered.ok()).toBe(true);
    await expectSignedIn(request, email);
    const used = await nextEmail(email, 2);
    expect(used.subject).toBe('A recovery code was used on your Glazecalc account');
    expect(used.text).toContain('Unused codes left: 9.');
    await signOut(request);
    step = await passwordStep(request, email, password);
    const reused = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, recoveryCode }
    });
    expect(reused.ok()).toBe(false);

    // The summary has dates and counts, never the key.
    const done2 = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, code: totp(secret, Date.now() + 60000) }
    });
    expect(done2.ok()).toBe(true);
    const summary = await (await request.get(API + '/mfa')).json();
    expect(summary).toMatchObject({ on: true, emailConfirmed: true, codesLeft: 9, passkeys: [] });
    expect(JSON.stringify(summary)).not.toContain(secret);
  });

  test.fixme('a passkey: add it, sign in with the password and the passkey, then with the passkey alone', async ({
    page
  }) => {
    const request = page.request;
    const { email, password } = await confirmedAccount(request);
    await passwordStep(request, email, password);
    await page.goto('/');
    const authenticator = await virtualAuthenticator(page);

    // Add: the password alone, as there is no factor yet.
    const options = await request.post(API + '/mfa/passkeys/options', { data: { password } });
    expect(options.ok()).toBe(true);
    const creation = (await options.json()).options;
    expect(creation.rp.id).toBe('localhost');
    const response = await createPasskey(page, creation);
    const added = await request.post(API + '/mfa/passkeys', { data: { response, name: 'Test laptop' } });
    expect(added.ok()).toBe(true);
    expect((await added.json()).recoveryCodes).toHaveLength(10);
    expect(await authenticator.credentials()).toHaveLength(1);
    const notice = await nextEmail(email, 1);
    expect(notice.subject).toBe('A sign-in step was added to your Glazecalc account');
    expect(notice.text).toContain('the passkey "Test laptop"');

    // The password, then the passkey.
    await signOut(request);
    const step = await passwordStep(request, email, password);
    expect(step.cookie).toBeNull();
    expect(step.body.methods.passkey).toBe(true);
    const assertion = await usePasskey(page, step.body.passkeyOptions);
    const done = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, passkey: assertion }
    });
    expect(done.ok()).toBe(true);
    await expectSignedIn(request, email);

    // Passkey-first: no password at all; it counts as both steps.
    await signOut(request);
    const first = await request.post(API + '/signin/passkey/options');
    expect(first.ok()).toBe(true);
    const firstOptions = (await first.json()).options;
    expect(firstOptions.allowCredentials ?? []).toEqual([]);
    expect(firstOptions.userVerification).toBe('required');
    const signedIn = await request.post(API + '/signin/passkey', {
      data: { response: await usePasskey(page, firstOptions) },
      headers: { 'X-Keep-Signed-In': '1' }
    });
    expect(signedIn.ok()).toBe(true);
    expect(sessionCookieOf(signedIn)).toMatch(/Max-Age=604800/i);
    await expectSignedIn(request, email);

    // Rename: no password needed.
    const [passkey] = (await (await request.get(API + '/mfa')).json()).passkeys;
    expect(passkey.name).toBe('Test laptop');
    expect(passkey).not.toHaveProperty('credentialId');
    const renamed = await request.patch(API + '/mfa/passkeys/' + passkey.id, { data: { name: 'Work laptop' } });
    expect(renamed.ok()).toBe(true);

    // Remove: the password alone is not enough once two-step sign-in is on (decision 6) ...
    const passwordOnly = await request.delete(API + '/mfa/passkeys/' + passkey.id, { data: { password } });
    expect(passwordOnly.ok()).toBe(false);
    // ... the password and the passkey are.
    const confirm = await request.post(API + '/mfa/confirm/options', { data: {} });
    expect(confirm.ok()).toBe(true);
    const proof = await usePasskey(page, (await confirm.json()).options);
    const removed = await request.delete(API + '/mfa/passkeys/' + passkey.id, { data: { password, passkey: proof } });
    expect(removed.ok()).toBe(true);
    expect((await removed.json()).code).toBe('mfa-off');
    // The last factor: one email saying two-step sign-in is off, not one per factor.
    await expect
      .poll(() => sentTo(email).map((m) => m.subject))
      .toContain('Two-step sign-in was turned off on your Glazecalc account');
    // Removing a factor signs out other sessions but renews this one.
    await expectSignedIn(request, email);
    await authenticator.remove();
  });

  test.fixme('needs a confirmed address, and is not for trials', async ({ page }) => {
    const request = page.request;
    const email = 'unconfirmed-' + Date.now() + '@test.com';
    expect((await request.post(API + '/signup', { data: { email, password: 'password123' } })).ok()).toBe(true);
    const unconfirmed = await request.post(API + '/mfa/totp/start', { data: { password: 'password123' } });
    expect(unconfirmed.status()).toBe(400);
    expect((await unconfirmed.json()).code).toBe('mfa-needs-confirmed-email');

    await signOut(request);
    expect((await request.post(API + '/guest')).ok()).toBe(true);
    expect((await request.get(API + '/mfa')).status()).toBe(403);
  });
});

test.describe('the pages', () => {
  test.fixme('sets up an authenticator app on the account page and signs in with a code', async ({ page }) => {
    const { email, password } = await confirmedAccount(page.request);
    await page.goto('/signin');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/recipe$/);

    await page.goto('/account');
    const section = page.getByRole('region', { name: 'Two-step sign-in' });
    await section.getByRole('button', { name: /authenticator app/i }).click();
    await section.getByLabel(/password/i).fill(password);
    await section.getByRole('button', { name: /continue|next/i }).click();
    await expect(section.getByRole('img', { name: /QR code/i })).toBeVisible();
    const secret = (await section.locator('[translate="no"]').first().innerText()).replace(/\s/g, '');
    await section.getByLabel(/code/i).fill(totp(secret));
    await section.getByRole('button', { name: /confirm|turn on/i }).click();
    // The recovery codes, once, in a list.
    await expect(section.getByRole('list').getByRole('listitem')).toHaveCount(10);
    await section.getByRole('button', { name: /saved them/i }).click();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.goto('/signin');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // The second step: no auto-submit, the field labelled, one-time-code autocomplete.
    const code = page.getByLabel(/code/i);
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(code).toHaveAttribute('inputmode', 'numeric');
    await code.fill(totp(secret, Date.now() + 30000));
    await page.getByRole('button', { name: /verify|sign in|continue/i }).click();
    await expect(page).toHaveURL(/\/recipe$/);
    // The pending token is never written to the browser's storage.
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(stored).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./);
  });

  test.fixme('adds a passkey on the account page and signs in with it alone', async ({ page }) => {
    const { email, password } = await confirmedAccount(page.request);
    await page.goto('/');
    const authenticator = await virtualAuthenticator(page);
    await page.goto('/signin');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/recipe$/);

    await page.goto('/account');
    const section = page.getByRole('region', { name: 'Two-step sign-in' });
    await section.getByRole('button', { name: /add a passkey/i }).click();
    await section.getByLabel(/name/i).fill('Test laptop');
    await section.getByLabel(/password/i).fill(password);
    await section.getByRole('button', { name: /add|continue/i }).click();
    await expect(section.getByText('Test laptop')).toBeVisible();
    expect(await authenticator.credentials()).toHaveLength(1);
    await section.getByRole('button', { name: /saved them/i }).click();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.goto('/signin');
    await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
    await expect(page).toHaveURL(/\/recipe$/);
    await authenticator.remove();
  });

  test.fixme('goes back to the password when the second step runs out', async ({ page }) => {
    const request = page.request;
    const { email, password } = await confirmedAccount(request);
    await passwordStep(request, email, password);
    const { secret } = await (await request.post(API + '/mfa/totp/start', { data: { password } })).json();
    expect((await request.post(API + '/mfa/totp', { data: { code: totp(secret) } })).ok()).toBe(true);
    await signOut(request);

    await page.goto('/signin');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Five wrong codes end the pending sign-in.
    for (let i = 0; i < 5; i++) {
      await page.getByLabel(/code/i).fill('000000');
      await page.getByRole('button', { name: /verify|sign in|continue/i }).click();
    }
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#email')).toHaveValue(email);
  });
});
