const { test, expect } = require('@playwright/test');
const { API, uniqueEmail } = require('./helpers');

const header = (page) => page.locator('.account-email');

test('signs up, logs out, and signs back in', async ({ page }) => {
  const email = uniqueEmail('signup');

  await page.goto('/signup');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(header(page)).toHaveText(email);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(header(page)).toHaveCount(0);

  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(header(page)).toHaveText(email);
});

test('keeps the create button disabled until the passwords match', async ({ page }) => {
  await page.goto('/signup');
  await page.locator('#email').fill(uniqueEmail('mismatch'));
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password124');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled();
});

test('shows an error for a wrong password', async ({ page, request }) => {
  const email = uniqueEmail('wrongpass');
  await request.post(API + '/signup', { data: { email, password: 'password123' } });

  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.errors-section')).toContainText('Email or password is incorrect.');
  await expect(page).toHaveURL(/\/signin$/);
});

test('refuses a second account with the same email', async ({ page, request }) => {
  const email = uniqueEmail('duplicate');
  await request.post(API + '/signup', { data: { email, password: 'password123' } });

  await page.goto('/signup');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('.errors-section')).toContainText('already exists');
});

test('shows visitors the intro page, and sends app pages to sign in', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Free glaze chemistry for potters.');
  await expect(page.locator('.unity-result')).toContainText('Ratio of Silica to Alumina : 9.11');
  for (const path of ['/home', '/recipe', '/account']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/signin$/);
  }
});

test('the intro page leads to sign up and sign in, and signed-in users skip it', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero-actions').getByRole('link', { name: 'Create a free account' }).click();
  await expect(page).toHaveURL(/\/signup$/);
  const email = uniqueEmail('intro');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
});

test('sends unknown routes to the not-found page', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.locator('h1')).toHaveText('Page not found');
  await expect(page.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/');
});

test('old /#/ links from before 2026 still open the right page', async ({ page }) => {
  await page.goto('/#/signup');
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();

  // An old reset email: the page opens with its form, and the token leaves the address bar.
  await page.goto('/#/reset?token=old-email-link');
  await expect(page).toHaveURL(/\/reset$/);
  await expect(page.getByRole('button', { name: 'Save new password' })).toBeVisible();
});

test('a sign-in that expired while the site was closed goes to the sign-in page, without errors', async ({ page }) => {
  // The browser still has the app's note but no longer the cookie (it lasts 7 days).
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  await page.goto('/recipe');
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.locator('h1')).toHaveText('Sign in');
  await expect(page.locator('.errors-section')).toHaveCount(0);
  await expect(page.locator('.nav-account')).toContainText('Create a free account');
});
