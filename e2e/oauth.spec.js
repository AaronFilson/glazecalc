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

test('links and unlinks GitHub on the account page, confirmed with the password', async ({ page, request }) => {
  const { email, password } = await confirmedAccount(request);
  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
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
});
