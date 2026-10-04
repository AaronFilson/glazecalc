const { test, expect } = require('@playwright/test');
const { API, uniqueEmail } = require('./helpers');

const header = (page) => page.locator('header.header-text').filter({ hasText: 'Welcome' });

test('signs up, logs out, and signs back in', async ({ page }) => {
  const email = uniqueEmail('signup');

  await page.goto('/#/signup');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password123');
  await page.getByRole('button', { name: 'Create New User' }).click();
  await expect(page).toHaveURL(/#\/home$/);
  await expect(header(page)).toContainText('Hello ' + email);

  await page.getByRole('button', { name: 'logout' }).click();
  await expect(page).toHaveURL(/#\/signin$/);
  await expect(header(page)).toHaveCount(0);

  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/#\/home$/);
  await expect(header(page)).toContainText('Hello ' + email);
});

test('keeps the create button disabled until the passwords match', async ({ page }) => {
  await page.goto('/#/signup');
  await page.locator('#email').fill(uniqueEmail('mismatch'));
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password124');
  await expect(page.getByRole('button', { name: 'Create New User' })).toBeDisabled();
});

test('shows an error for a wrong password', async ({ page, request }) => {
  const email = uniqueEmail('wrongpass');
  await request.post(API + '/signup', { data: { email, password: 'password123' } });

  await page.goto('/#/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.locator('.errors-section')).toContainText('incorrect password');
  await expect(page).toHaveURL(/#\/signin$/);
});

test('refuses a second account with the same email', async ({ page, request }) => {
  const email = uniqueEmail('duplicate');
  await request.post(API + '/signup', { data: { email, password: 'password123' } });

  await page.goto('/#/signup');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password123');
  await page.getByRole('button', { name: 'Create New User' }).click();
  await expect(page.locator('.errors-section')).toContainText('already exists');
});

test('warns on app pages when not signed in', async ({ page }) => {
  await page.goto('/#/recipe');
  await expect(page.locator('header.header-text')).toContainText('not signed in');
});

test('sends unknown routes to the not-found page', async ({ page }) => {
  await page.goto('/#/no-such-page');
  await expect(page.getByText('Page Not Found.')).toBeVisible();
});
