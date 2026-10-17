// Signing in with Google and GitHub (docs/adr/0015-provider-sign-in.md)
// through the fake provider (server/test/support/fake_provider.ts), which
// listens on E2E_OAUTH_PORT; playwright.config.js points the server at it
// (OAUTH_TEST_BASE) with its client ids and secrets. The browser goes to the
// provider and back as it would to Google or GitHub, cookies and all.
const { test, expect } = require('@playwright/test');
const { confirmedAccount, uniqueEmail } = require('./helpers');
const { nextEmail } = require('./mail');
const { FakeProvider } = require('../server/test/support/fake_provider.ts');

const fake = new FakeProvider();
let subjects = 0;
const subject = () => String(7000000 + (Date.now() % 100000) * 10 + subjects++);

test.beforeAll(async () => {
  await fake.start(Number(process.env.E2E_OAUTH_PORT));
});

test.afterAll(async () => {
  await fake.stop();
});

test('makes an account with a verified Google email and signs in to it', async ({ page }) => {
  const email = uniqueEmail('google');
  fake.next.google = { sub: subject(), email, emailVerified: true };
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/account');
  await expect(page.getByText('Signed in as ' + email)).toBeVisible();
  // Made with Google: no password yet, and the section says how to set one.
  await expect(page.getByRole('heading', { name: 'Google and GitHub' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Email me a link to set a password' })).toBeVisible();
});

test('signs in to an account in the language the button was pressed in', async ({ page }) => {
  fake.next.github = { sub: subject(), email: uniqueEmail('github'), emailVerified: true };
  await page.goto('/de/signin');
  await page.locator('[data-provider="github"]').click();
  await expect(page).toHaveURL(/\/de\/home$/);
});

test('says when the provider sign-in was turned down', async ({ page }) => {
  // No one set to sign in: the fake answers access_denied, as when the person cancels.
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Continue with GitHub' }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByText('Signing in with GitHub was cancelled.')).toBeVisible();
});

test('links Google to an account with the same email only after signing in to it', async ({ page, request }) => {
  const { email, password } = await confirmedAccount(request);
  const sub = subject();
  fake.next.google = { sub, email, emailVerified: true };
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByText('A Glazecalc account already uses the email from Google.')).toBeVisible();

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.locator('.providers-section')).toContainText('Google is linked. You can now sign in with it.');
  const notice = await nextEmail(email, 1);
  expect(notice.subject).toBe('A new way to sign in was added to your Glazecalc account');

  // From now on Google signs in to it.
  await page.context().clearCookies();
  await page.goto('/signin');
  fake.next.google = { sub, email, emailVerified: true };
  await page.getByRole('link', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

/** Signs in on a page with the email and password. */
const signInOnPage = async (page, email, password) => {
  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
};

test('links and unlinks GitHub on the account page, confirmed with the password', async ({
  page,
  request,
  browser
}) => {
  const { email, password } = await confirmedAccount(request);
  await signInOnPage(page, email, password);
  // The same account on another device.
  const other = await browser.newPage();
  await signInOnPage(other, email, password);
  await page.goto('/account');
  await expect(page.getByText('Signed in as ' + email)).toBeVisible();
  const section = page.locator('.providers-section');
  fake.next.github = { sub: subject(), email: uniqueEmail('elsewhere'), emailVerified: true };
  await section.getByRole('button', { name: 'Link GitHub' }).click();
  await section.locator('#provider-confirm-password').fill(password);
  await section.locator('.identity-confirm').getByRole('button', { name: 'Link GitHub' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(section).toContainText('GitHub is linked. You can now sign in with it.');
  await expect(section.locator('.provider-list li', { hasText: 'GitHub' })).toContainText('Linked on');

  await section.getByRole('button', { name: 'Unlink GitHub' }).click();
  await section.locator('#provider-confirm-password').fill(password);
  await section.locator('.identity-confirm').getByRole('button', { name: 'Unlink GitHub' }).click();
  await expect(section).toContainText('GitHub is unlinked. You can no longer sign in with it.');
  await expect(section.locator('.provider-list li', { hasText: 'GitHub' })).toContainText('Not linked');

  // Unlinking signed out the other device, but not this one; linking had signed out neither.
  await page.reload();
  await expect(page.getByText('Signed in as ' + email)).toBeVisible();
  await other.goto('/account');
  await expect(other).toHaveURL(/\/signin$/);
  await other.close();
});

test('an account made with Google confirms a change by signing in with Google again', async ({ page }) => {
  const email = uniqueEmail('again');
  const google = { sub: subject(), email, emailVerified: true };
  fake.next.google = google;
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/account');
  const section = page.locator('.providers-section');
  await expect(section.locator('.provider-list li', { hasText: 'Google' })).toContainText('Linked on');

  // Deleting asks for a fresh Google sign-in, not a password.
  await page.locator('#delete-submit').click();
  const confirm = page.locator('.confirm-step .identity-confirm');
  await expect(confirm.locator('input[type="password"]')).toHaveCount(0);
  // Without it, the change is refused.
  await confirm.getByRole('button', { name: 'Delete my account' }).click();
  await expect(confirm).toContainText('Please sign in again first');

  fake.next.google = google;
  await confirm.getByRole('button', { name: 'Sign in again with Google' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(section).toContainText('You signed in again with Google.');

  await page.locator('#delete-submit').click();
  await expect(confirm).toContainText('You can make one change without a password in the next 5 minutes.');
  await confirm.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL(/\/$/);

  // The account is gone: Google now makes a new one.
  await page.goto('/signin');
  fake.next.google = google;
  await page.getByRole('link', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("another person's Google account cannot confirm a change", async ({ page }) => {
  fake.next.google = { sub: subject(), email: uniqueEmail('owner'), emailVerified: true };
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/account');
  const section = page.locator('.providers-section');
  await expect(section.locator('.provider-list li', { hasText: 'Google' })).toContainText('Linked on');

  await page.locator('#delete-submit').click();
  fake.next.google = { sub: subject(), email: uniqueEmail('someone-else'), emailVerified: true };
  await page
    .locator('.confirm-step .identity-confirm')
    .getByRole('button', { name: 'Sign in again with Google' })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(section).toContainText('That Google account is not linked to this Glazecalc account');
  await page.locator('#delete-submit').click();
  await expect(page.locator('.confirm-step .identity-confirm')).toContainText('confirm it is you by signing in again');
});
