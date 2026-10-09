// "Try it now": using the app as a trial, then keeping or discarding the work.
const { test, expect } = require('@playwright/test');
const { API, addStandardMaterial, uniqueEmail } = require('./helpers');

const trialBar = (page) => page.locator('.trial-bar');

// Starts a trial from the intro page and saves a recipe in it; returns the trial's name.
const startTrialWithRecipe = async (page) => {
  await page.goto('/');
  await page.locator('.hero-actions').getByRole('button', { name: 'Try it now' }).click();
  await expect(page).toHaveURL(/\/recipe$/);
  await expect(trialBar(page)).toContainText("You're trying Glazecalc as");
  const name = (await trialBar(page).locator('strong').textContent()).trim();
  expect(name).toMatch(/^[a-z]+ [a-z]+ [a-z]+$/);

  await page.locator('#recipe-name').fill('Trial matte');
  await addStandardMaterial(page, 'Whiting', 20);
  await addStandardMaterial(page, 'Silica', 30);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.saved-recipe', { hasText: 'Trial matte' })).toBeVisible();
  return name;
};

test('a visitor tries the calculator, keeps the trial across a reload, and keeps the work by signing up', async ({
  page
}) => {
  const name = await startTrialWithRecipe(page);
  await expect(page.locator('.account-email')).toHaveText(name);
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);

  await page.reload();
  await expect(trialBar(page)).toContainText(name);
  await expect(page.locator('.saved-recipe', { hasText: 'Trial matte' })).toBeVisible();

  await trialBar(page).getByRole('link', { name: 'Create an account to keep it' }).click();
  await expect(page.locator('h1')).toHaveText('Keep your work');
  const email = uniqueEmail('kept');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(trialBar(page)).toHaveCount(0);
  await expect(page.locator('.account-email')).toHaveText(email);
  await page.locator('.nav-links').getByRole('link', { name: 'Recipes' }).click();
  await expect(page.locator('.saved-recipe', { hasText: 'Trial matte' })).toBeVisible();

  // A normal account now: sign out, and back in with the new password.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('.account-email')).toHaveText(email);
});

test('discarding a trial removes it and returns to the intro page', async ({ page }) => {
  await startTrialWithRecipe(page);
  await trialBar(page).getByRole('button', { name: 'Discard trial' }).click();
  await expect(trialBar(page)).toContainText('Discard everything you made in this trial?');
  await trialBar(page).getByRole('button', { name: 'Discard it' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('h1')).toHaveText('Free glaze chemistry for potters.');
  await expect(trialBar(page)).toHaveCount(0);
  await page.goto('/recipe');
  await expect(page).toHaveURL(/\/signin$/);
});

test('a trial that has run out leads back to the intro page, which says so', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('session', 'trial');
    localStorage.setItem('trial', JSON.stringify({ name: 'rusty humble jugs', expiresAt: '2020-01-01T00:00:00Z' }));
  });
  await page.goto('/recipe');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.hero-text .server-msg')).toContainText('Your trial has ended.');
  await expect(trialBar(page)).toHaveCount(0);
  // The note is for the visit that found the trial over; the next one is a plain intro page.
  await page.reload();
  await expect(page.locator('.hero-text .server-msg')).toHaveCount(0);
});

test('a trial the server has removed ends at the next request', async ({ page }) => {
  await startTrialWithRecipe(page);
  // Discard it behind the page's back, as the sweeper would after it expired.
  const me = await (await page.request.get('/api/verify')).json();
  expect((await page.request.delete('/api/deleteuser/' + me.id)).ok()).toBe(true);

  await page.locator('.nav-links').getByRole('link', { name: 'Notes' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.hero-text .server-msg')).toContainText('Your trial has ended.');
});

test('signing in to an existing account brings the trial along', async ({ page, request }) => {
  const email = uniqueEmail('merge');
  expect((await request.post(API + '/signup', { data: { email, password: 'password123' } })).ok()).toBe(true);
  const name = await startTrialWithRecipe(page);

  await page.locator('.nav-account').getByRole('link', { name }).click();
  await page.goto('/signin');
  await expect(page.locator('.trial-note')).toContainText('Signing in brings what you made as ' + name + ' into it.');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(trialBar(page)).toHaveCount(0);
  await page.locator('.nav-links').getByRole('link', { name: 'Recipes' }).click();
  await expect(page.locator('.saved-recipe', { hasText: 'Trial matte' })).toBeVisible();
});

test('the sign-in lives in a cookie that scripts on the page cannot read', async ({ page, context }) => {
  await startTrialWithRecipe(page);
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === 'glazecalc_session');
  expect(session).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api' });
  expect(await page.evaluate(() => globalThis.document.cookie)).not.toContain('glazecalc_session');
  // A note that there is a session, the trial's name, and the display settings' copies: nothing that signs in.
  const settings = [
    'cones',
    'decimalMark',
    'density',
    'englishTerms',
    'format',
    'gramPrecision',
    'language',
    'lead',
    'notice',
    'palette',
    'preferredRegion',
    'temperature',
    'theme',
    'weightUnit'
  ];
  const stored = await page.evaluate(() => Object.keys(localStorage).sort());
  expect(stored.filter((key) => !settings.includes(key))).toEqual(['session', 'trial']);
});
