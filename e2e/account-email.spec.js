const { test, expect } = require('@playwright/test');
const { API, uniqueEmail } = require('./helpers');
const { confirmLink, nextEmail } = require('./mail');

const header = (page) => page.locator('.account-email');
const DAY = 24 * 60 * 60;

const signInOnPage = async (page, email, password, keep = false) => {
  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  if (keep) await page.getByLabel('Keep me signed in on this device').check();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
};

const sessionCookie = async (context) => (await context.cookies()).find((c) => c.name === 'glazecalc_session');

test('confirms a new account email from the emailed link', async ({ page }) => {
  const email = uniqueEmail('verify');
  await page.goto('/signup');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toBeVisible();
  const first = await nextEmail(email);
  expect(first.subject).toBe('Confirm your email for Glazecalc');

  // Asking again sends a new link, and only the newest one works.
  await page.getByRole('button', { name: 'Send the link again' }).click();
  await expect(page.locator('.server-msg')).toContainText('We have sent a new link');
  const second = await nextEmail(email, 1);

  await page.goto(confirmLink(second));
  await expect(page).toHaveURL(/\/confirm-email$/);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('.done-text')).toHaveText('Your email is confirmed.');

  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Change your email' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Confirm your email' })).toHaveCount(0);
});

test('changes the email only when the link sent to the new address is opened', async ({ page, browser }) => {
  const email = uniqueEmail('before');
  const moved = uniqueEmail('after');
  await page.request.post(API + '/signup', { data: { email, password: 'password123' } });
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));

  await page.goto('/account');
  await expect(header(page)).toHaveText(email);
  await page.locator('#new-email').fill(moved);
  await page.locator('#email-password').fill('password123');
  await page.getByRole('button', { name: 'Send the link', exact: true }).click();
  await expect(page.locator('.server-msg')).toContainText('We have sent a link to the new address');
  await page.reload();
  await expect(header(page)).toHaveText(email);

  const link = await nextEmail(moved);
  expect(link.subject).toBe('Confirm your new email for Glazecalc');

  // Another browser opens the link, as when it is read on a phone.
  const other = await browser.newPage();
  await other.goto(confirmLink(link));
  await other.getByRole('button', { name: 'Confirm' }).click();
  await expect(other.locator('.done-text')).toContainText('Your email has been changed.');
  await other.close();

  // Every device was signed out; the new address signs in.
  await page.reload();
  await expect(page).toHaveURL(/\/signin$/);
  await signInOnPage(page, moved, 'password123');
  await expect(header(page)).toHaveText(moved);
});

test('signs out on every device from the account page', async ({ page, browser }) => {
  const email = uniqueEmail('everywhere');
  await page.request.post(API + '/signup', { data: { email, password: 'password123' } });
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  const other = await browser.newPage();
  await signInOnPage(other, email, 'password123');

  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out everywhere' }).click();
  await expect(page).toHaveURL(/\/signin$/);

  await other.reload();
  await expect(other).toHaveURL(/\/signin$/);
  await other.close();
});

test('keeps the sign-in past the browser session only when asked', async ({ page }) => {
  const email = uniqueEmail('keep');
  await page.request.post(API + '/signup', { data: { email, password: 'password123' } });

  await page.goto('/signin');
  await expect(page.getByLabel('Keep me signed in on this device')).not.toBeChecked();
  await signInOnPage(page, email, 'password123');
  // A session cookie has no expiry date (Playwright shows it as -1).
  expect((await sessionCookie(page.context())).expires).toBe(-1);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await signInOnPage(page, email, 'password123', true);
  const kept = await sessionCookie(page.context());
  expect(kept.expires).toBeGreaterThan(Date.now() / 1000 + 6 * DAY);
  expect(kept.expires).toBeLessThan(Date.now() / 1000 + 8 * DAY);
});
