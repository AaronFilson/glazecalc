// Two-step sign-in (docs/mfa-plan.md, "Test plan"): authenticator-app codes
// computed in the test (helpers.totp), passkeys from a virtual authenticator
// (Chrome DevTools Protocol, helpers.virtualAuthenticator), recovery codes and
// the notice emails. "Through the API" drives the server with the page's own
// request context (its cookies); "the pages" go through the app as a person
// would, with the labels in client/public/i18n/account/en.json.
const { test, expect } = require('@playwright/test');
const {
  API,
  basicAuth,
  confirmedAccount,
  createPasskey,
  totp,
  uniqueEmail,
  usePasskey,
  virtualAuthenticator
} = require('./helpers');
const { nextEmail, sentTo } = require('./mail');

const STEP = 30000;

/**
 * An authenticator app for a key, as the server sees one: it takes a code for
 * one 30-second step either side of now, and each step once, so a code just
 * used (enrolling, say) cannot sign in. next() gives a code for a step newer
 * than the last one given, waiting for the clock when it must (at most one step).
 */
const authenticatorApp = (secret) => {
  let last = -Infinity;
  return {
    secret,
    async next() {
      for (;;) {
        const now = Math.floor(Date.now() / STEP);
        const step = Math.max(last + 1, now);
        if (step <= now + 1) {
          last = step;
          return totp(secret, step * STEP);
        }
        await new Promise((resolve) => setTimeout(resolve, (step - 1) * STEP - Date.now() + 250));
      }
    }
  };
};

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

/** Sets up an authenticator app through the API (the account signed in, two-step sign-in off). */
const enrolApp = async (request, password) => {
  const start = await request.post(API + '/mfa/totp/start', { data: { password } });
  expect(start.ok()).toBe(true);
  const { secret, setupId } = await start.json();
  const app = authenticatorApp(secret);
  const added = await request.post(API + '/mfa/totp', { data: { setupId, code: await app.next() } });
  expect(added.ok()).toBe(true);
  return { app, recoveryCodes: (await added.json()).recoveryCodes };
};

/** Fills the password form on the sign-in page and sends it. */
const passwordOnPage = async (page, email, password) => {
  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
};

/** Presses "Finish signing in" and waits for the server's answer. */
const sendSecondStep = async (page) => {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/signin/second-step')),
    page.getByRole('button', { name: 'Finish signing in' }).click()
  ]);
  return res;
};

const subjects = (email) => sentTo(email).map((m) => m.subject);
const ADDED = 'A sign-in step was added to your Glazecalc account';
const REMOVED = 'A sign-in step was removed from your Glazecalc account';
const OFF = 'Two-step sign-in was turned off on your Glazecalc account';
const RECOVERY_USED = 'A recovery code was used on your Glazecalc account';

const section = (page) => page.getByRole('region', { name: 'Two-step sign-in' });

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
  test('an authenticator app: set up, sign in with a code, then with a recovery code', async ({ page }) => {
    // Codes are taken once per 30-second step, so this may wait for the clock.
    test.setTimeout(120000);
    const request = page.request;
    const { email, password } = await confirmedAccount(request);

    // Set up: the password alone, as there is no factor yet.
    const start = await request.post(API + '/mfa/totp/start', { data: { password } });
    expect(start.ok()).toBe(true);
    const { secret, uri, qr, setupId } = await start.json();
    expect(uri).toMatch(/^otpauth:\/\/totp\/Glazecalc:.+\?secret=[A-Z2-7]+.*&issuer=Glazecalc/);
    expect(qr).toMatch(/^data:image\/svg\+xml;base64,/);
    const app = authenticatorApp(secret);
    const added = await request.post(API + '/mfa/totp', { data: { setupId, code: await app.next() } });
    expect(added.ok()).toBe(true);
    const { recoveryCodes } = await added.json();
    expect(recoveryCodes).toHaveLength(10);
    for (const code of recoveryCodes) expect(code).toMatch(/^[0-9A-Z]{5}-[0-9A-Z]{5}$/i);
    expect((await nextEmail(email, 1)).subject).toBe(ADDED);

    // The password alone no longer signs in: no cookie, a pending token instead.
    await signOut(request);
    let step = await passwordStep(request, email, password);
    expect(step.cookie).toBeNull();
    expect(step.body.code).toBe('second-step');
    expect(step.body.methods).toEqual({ totp: true, passkey: false, recovery: true });
    // /verify answers without an account when there is no sign-in.
    expect((await (await request.get(API + '/verify')).json()).email).toBeUndefined();
    // The pending token is never a sign-in.
    const asBearer = await request.get(API + '/verify', { headers: { authorization: 'Bearer ' + step.body.pending } });
    expect(asBearer.status()).toBe(401);

    // A wrong code, then a right one (the one used to set up is spent).
    const wrong = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, code: '000000' }
    });
    expect(wrong.status()).toBe(401);
    expect((await wrong.json()).code).toBe('code-wrong');
    const done = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, code: await app.next() }
    });
    expect(done.ok()).toBe(true);
    expect((await done.json()).code).toBe('signed-in');
    expect(sessionCookieOf(done)).not.toBeNull();
    await expectSignedIn(request, email);
    // The token worked once.
    const again = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, code: await app.next() }
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
    expect(used.subject).toBe(RECOVERY_USED);
    expect(used.text).toContain('Unused codes left: 9.');
    await signOut(request);
    step = await passwordStep(request, email, password);
    const reused = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, recoveryCode }
    });
    expect(reused.ok()).toBe(false);

    // The summary has dates and counts, never the key.
    const done2 = await request.post(API + '/signin/second-step', {
      data: { pending: step.body.pending, code: await app.next() }
    });
    expect(done2.ok()).toBe(true);
    const summary = await (await request.get(API + '/mfa')).json();
    expect(summary).toMatchObject({ on: true, emailConfirmed: true, codesLeft: 9, passkeys: [] });
    expect(JSON.stringify(summary)).not.toContain(secret);
  });

  test('a passkey: add it, sign in with the password and the passkey, then with the passkey alone', async ({
    page
  }) => {
    const request = page.request;
    const { email, password } = await confirmedAccount(request);
    await page.goto('/');
    const authenticator = await virtualAuthenticator(page);

    // Add: the password alone, as there is no factor yet. It gives a grant
    // that asks for the options and saves the passkey.
    const granted = await request.post(API + '/mfa/passkeys/grant', { data: { password } });
    expect(granted.ok()).toBe(true);
    const { grant } = await granted.json();
    const options = await request.post(API + '/mfa/passkeys/options', { data: { grant } });
    expect(options.ok()).toBe(true);
    const creation = (await options.json()).options;
    expect(creation.rp.id).toBe('localhost');
    const response = await createPasskey(page, creation);
    const added = await request.post(API + '/mfa/passkeys', { data: { grant, response, name: 'Test laptop' } });
    expect(added.ok()).toBe(true);
    expect((await added.json()).recoveryCodes).toHaveLength(10);
    expect(await authenticator.credentials()).toHaveLength(1);
    const notice = await nextEmail(email, 1);
    expect(notice.subject).toBe(ADDED);
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
    // The last factor: one email saying two-step sign-in is off, not a removal notice.
    await expect.poll(() => subjects(email)).toContain(OFF);
    expect(subjects(email)).not.toContain(REMOVED);
    // Removing a factor signs out other sessions but renews this one.
    await expectSignedIn(request, email);
    await authenticator.remove();
  });

  test('needs a confirmed address, and is not for trials', async ({ page }) => {
    const request = page.request;
    const email = uniqueEmail('unconfirmed');
    expect((await request.post(API + '/signup', { data: { email, password: 'password123' } })).ok()).toBe(true);
    const unconfirmed = await request.post(API + '/mfa/totp/start', { data: { password: 'password123' } });
    expect(unconfirmed.status()).toBe(400);
    expect((await unconfirmed.json()).code).toBe('mfa-needs-confirmed-email');
    const passkey = await request.post(API + '/mfa/passkeys/grant', { data: { password: 'password123' } });
    expect((await passkey.json()).code).toBe('mfa-needs-confirmed-email');

    await signOut(request);
    expect((await request.post(API + '/guest')).ok()).toBe(true);
    expect((await request.get(API + '/mfa')).status()).toBe(403);
  });
});

test.describe('the pages', () => {
  test('sets up an authenticator app on the account page, then signs in with a code and with a recovery code', async ({
    page
  }) => {
    test.setTimeout(120000);
    const { email, password } = await confirmedAccount(page.request);
    await signOut(page.request);
    await passwordOnPage(page, email, password);
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/account');
    await expect(section(page).locator('.mfa-status')).toContainText('Two-step sign-in is off.');
    await section(page).getByRole('button', { name: 'Set up an authenticator app' }).click();
    // Two-step sign-in is off: the password alone.
    await expect(section(page).getByRole('group', { name: 'And your second step' })).toHaveCount(0);
    await section(page).getByLabel('Your password').fill(password);
    await section(page).getByRole('button', { name: 'Continue' }).click();
    await expect(
      section(page).getByRole('img', { name: 'QR code for adding Glazecalc to an authenticator app' })
    ).toBeVisible();
    const app = authenticatorApp((await section(page).locator('.totp-key').innerText()).replace(/\s/g, ''));
    await section(page)
      .getByLabel('Enter the 6-digit code the app now shows for Glazecalc')
      .fill(await app.next());
    await section(page).getByRole('button', { name: 'Finish setting up' }).click();
    // The recovery codes, once, in a list.
    const list = section(page).getByRole('list', { name: 'Your recovery codes' });
    await expect(list.getByRole('listitem')).toHaveCount(10);
    const recoveryCodes = await list.getByRole('listitem').allInnerTexts();
    await section(page).getByRole('button', { name: 'I have saved them' }).click();
    await expect(list).toHaveCount(0);
    await expect(section(page).locator('.mfa-status')).toContainText('Two-step sign-in is on.');
    await expect.poll(() => subjects(email)).toContain(ADDED);

    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await passwordOnPage(page, email, password);
    // The second step: the field labelled, one-time-code autocomplete, no auto-submit.
    const code = page.getByLabel('Code from your authenticator app');
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(code).toHaveAttribute('inputmode', 'numeric');
    await code.fill(await app.next());
    await expect(page).toHaveURL(/\/signin$/);
    // The pending token is never written to the browser's storage.
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(stored).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./);
    await page.getByRole('button', { name: 'Finish signing in' }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator('.account-email')).toHaveText(email);

    // A recovery code instead.
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await passwordOnPage(page, email, password);
    await page.getByRole('button', { name: 'Use a recovery code instead' }).click();
    await page.getByLabel('Recovery code').fill(recoveryCodes[0]);
    await page.getByRole('button', { name: 'Finish signing in' }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect.poll(() => subjects(email)).toContain(RECOVERY_USED);
    await page.goto('/account');
    await expect(section(page)).toContainText('9 of 10 recovery codes left.');
  });

  // Run in the page (page.evaluate, addInitScript).
  /* global window, document, getComputedStyle */
  test('prints the recovery codes alone, black on white', async ({ page }) => {
    const { email, password } = await confirmedAccount(page.request);
    await signOut(page.request);
    // Printing is the browser's: here it only records that it was asked.
    await page.addInitScript(() => {
      window.print = () => {
        window.printedWith = document.body.className;
      };
    });
    await passwordOnPage(page, email, password);
    await expect(page).toHaveURL(/\/home$/);
    await page.goto('/account');
    await section(page).getByRole('button', { name: 'Set up an authenticator app' }).click();
    await section(page).getByLabel('Your password').fill(password);
    await section(page).getByRole('button', { name: 'Continue' }).click();
    const app = authenticatorApp((await section(page).locator('.totp-key').innerText()).replace(/\s/g, ''));
    await section(page)
      .getByLabel('Enter the 6-digit code the app now shows for Glazecalc')
      .fill(await app.next());
    await section(page).getByRole('button', { name: 'Finish setting up' }).click();
    const list = section(page).getByRole('list', { name: 'Your recovery codes' });
    await expect(list.getByRole('listitem')).toHaveCount(10);
    await expect(section(page).getByText('Paste it straight into your password manager')).toBeVisible();

    await section(page).getByRole('button', { name: 'Print the codes' }).click();
    expect(await page.evaluate(() => window.printedWith)).toContain('gc-printing-codes');
    // As the page prints while the class is on: the codes, a title and a note;
    // nothing else (by CSS: the named regions around them are hidden now).
    await page.evaluate(() => document.body.classList.add('gc-printing-codes'));
    await page.emulateMedia({ media: 'print' });
    const printed = page.locator('.recovery-codes-print');
    await expect(printed.locator('li').first()).toBeVisible();
    await expect(printed.getByText('Glazecalc recovery codes for ' + email)).toBeVisible();
    await expect(printed.getByText('Keep this page somewhere safe.')).toBeVisible();
    for (const hidden of [
      '.recovery-codes-panel h3',
      '.recovery-codes-panel .panel-buttons',
      '.clipboard-note',
      'h1'
    ]) {
      await expect(page.locator(hidden).first()).toBeHidden();
    }
    expect(
      await printed
        .locator('li')
        .first()
        .evaluate((el) => getComputedStyle(el).color)
    ).toBe('rgb(0, 0, 0)');
    await page.screenshot({ path: test.info().outputPath('printed.png'), fullPage: true });
    // Done printing: the page as it was.
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    expect(await page.evaluate(() => document.body.classList.contains('gc-printing-codes'))).toBe(false);
    await page.emulateMedia({ media: 'screen' });
    await expect(printed.getByText('Glazecalc recovery codes for ' + email)).toBeHidden();
    await expect(list.getByRole('listitem')).toHaveCount(10);
  });

  test('adds a passkey on the account page, signs in with it alone, renames it and removes it', async ({ page }) => {
    test.setTimeout(60000);
    const { email, password } = await confirmedAccount(page.request);
    await signOut(page.request);
    await page.goto('/');
    const authenticator = await virtualAuthenticator(page);
    await passwordOnPage(page, email, password);
    await expect(page).toHaveURL(/\/home$/);

    await page.goto('/account');
    await section(page).getByRole('button', { name: 'Add a passkey' }).click();
    await section(page).getByLabel('Name for the passkey').fill('Test laptop');
    await section(page).getByLabel('Your password').fill(password);
    await section(page).getByRole('button', { name: 'Continue' }).click();
    // The browser makes the passkey with a click of its own.
    const create = section(page).getByRole('button', { name: 'Now add the passkey' });
    await expect(create).toBeFocused();
    await create.click();
    // The first second step: recovery codes, once.
    await expect(section(page).getByRole('list', { name: 'Your recovery codes' }).getByRole('listitem')).toHaveCount(
      10
    );
    await section(page).getByRole('button', { name: 'I have saved them' }).click();
    await expect(section(page).locator('.passkey-name')).toHaveText(['Test laptop']);
    expect(await authenticator.credentials()).toHaveLength(1);

    // Passkey-first, no password. The sign-in page asks for a passkey from the
    // email field's suggestions (autofill), which the virtual authenticator
    // answers at once, as picking the passkey there would.
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator('.account-email')).toHaveText(email);
    // Where the browser has no passkey autofill: the button.
    await page.addInitScript(() => {
      globalThis.PublicKeyCredential.isConditionalMediationAvailable = async () => false;
    });
    await page.reload();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/signin$/);
    await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator('.account-email')).toHaveText(email);

    // Rename, without the password.
    await page.goto('/account');
    await section(page).getByRole('button', { name: 'Rename Test laptop' }).click();
    await section(page).getByLabel('New name for "Test laptop"').fill('Work laptop');
    await section(page).getByRole('button', { name: 'Save the name' }).click();
    await expect(section(page).locator('.passkey-name')).toHaveText(['Work laptop']);

    // Remove the last one: the password and the passkey; two-step sign-in turns off.
    await section(page).getByRole('button', { name: 'Remove Work laptop' }).click();
    await expect(section(page).locator('.last-factor')).toBeVisible();
    await expect(section(page).getByText('Your browser asks for your passkey when you continue.')).toBeVisible();
    await section(page).getByLabel('Your password').fill(password);
    await section(page).getByRole('button', { name: 'Remove the passkey' }).click();
    await expect(section(page).locator('.mfa-status')).toContainText('Two-step sign-in is off.');
    await expect(section(page).locator('.passkey-name')).toHaveCount(0);
    // One email says it is off; none for the passkey on its own.
    await expect.poll(() => subjects(email)).toContain(OFF);
    expect(subjects(email)).not.toContain(REMOVED);
    // Still signed in here: the change renewed this browser's session.
    await page.reload();
    await expect(page.locator('.account-email')).toHaveText(email);
    await authenticator.remove();
  });

  test('changes the email with the password and a code once two-step sign-in is on', async ({ page }) => {
    // Codes are taken once per 30-second step, so this may wait for the clock.
    test.setTimeout(120000);
    const { password } = await confirmedAccount(page.request);
    const { app } = await enrolApp(page.request, password);
    const moved = uniqueEmail('mfa-moved');
    // The password alone is not enough now (decision 6).
    const alone = await page.request.post(API + '/email/change', { data: { email: moved, password } });
    expect(alone.status()).toBe(400);
    expect((await alone.json()).code).toBe('factor-needed');

    await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
    await page.goto('/account');
    await expect(section(page).locator('.mfa-status')).toContainText('Two-step sign-in is on.');
    // The form asks for the new address only; the password comes with the second step.
    await expect(page.locator('#email-password')).toHaveCount(0);
    await page.locator('#new-email').fill(moved);
    await page.locator('#email-submit').click();
    await expect(page.locator('#email-confirm-password')).toBeFocused();
    await page.locator('#email-confirm-password').fill(password);
    await page.locator('#email-confirm-code').fill(await app.next());
    await page.getByRole('button', { name: 'Send the link', exact: true }).click();
    await expect(page.locator('.server-msg')).toContainText('We have sent a link to the new address');
    expect((await nextEmail(moved)).subject).toBe('Confirm your new email for Glazecalc');
  });

  test('is not offered during a trial, and asks for a confirmed email first', async ({ page }) => {
    await page.goto('/');
    await page.locator('.hero-actions').getByRole('button', { name: 'Try it now' }).click();
    await expect(page.locator('.trial-bar')).toBeVisible();
    await page.goto('/account');
    await expect(page.locator('h1')).toBeVisible();
    await expect(section(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Set up an authenticator app' })).toHaveCount(0);
    await page.locator('.trial-bar').getByRole('button', { name: 'Discard trial' }).click();
    await page.locator('.trial-bar').getByRole('button', { name: 'Discard it' }).click();
    await expect(page.locator('.trial-bar')).toHaveCount(0);

    // An account whose email is not confirmed yet.
    const email = uniqueEmail('unconfirmed');
    await page.goto('/signup');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('password123');
    await page.locator('#confirmation').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto('/account');
    await expect(section(page).locator('.needs-email')).toContainText('Confirm your email first');
    await expect(section(page).getByRole('button', { name: 'Set up an authenticator app' })).toHaveCount(0);
    await expect(section(page).getByRole('button', { name: 'Add a passkey' })).toHaveCount(0);
  });

  test('a wrong code at the second step does not end a trial on this browser', async ({ page, request }) => {
    test.setTimeout(120000);
    // An account with an authenticator app, set up in another browser.
    const { email, password } = await confirmedAccount(request);
    const { app } = await enrolApp(request, password);

    await page.goto('/');
    await page.locator('.hero-actions').getByRole('button', { name: 'Try it now' }).click();
    await expect(page.locator('.trial-bar')).toBeVisible();
    await passwordOnPage(page, email, password);
    await page.getByLabel('Code from your authenticator app').fill('000000');
    expect((await sendSecondStep(page)).status()).toBe(401);
    const field = page.getByLabel('Code from your authenticator app');
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('gc-second-step')).toContainText('That code is not correct.');
    // Still on the second step, and still in the trial.
    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.locator('.trial-bar')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('session'))).toBe('trial');

    // The right code signs in, and the trial goes into the account.
    await page.getByLabel('Code from your authenticator app').fill(await app.next());
    await page.getByRole('button', { name: 'Finish signing in' }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.locator('.account-email')).toHaveText(email);
    await expect(page.locator('.trial-bar')).toHaveCount(0);
  });

  test('goes back to the password when the second step has had too many wrong codes', async ({ page }) => {
    const request = page.request;
    const { email, password } = await confirmedAccount(request);
    await enrolApp(request, password);
    await signOut(request);

    await passwordOnPage(page, email, password);
    // Five wrong codes end the pending sign-in.
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Code from your authenticator app').fill('000000');
      await sendSecondStep(page);
    }
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#email')).toHaveValue(email);
  });
});
