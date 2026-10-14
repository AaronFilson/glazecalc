const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

// What this browser knows acts before the first paint (the script in client/index.html), so the HTML every
// visitor gets, prerendered or not, never shows the wrong page for a moment.

test('a saved language opens an English page in it', async ({ page }) => {
  await page.addInitScript(() => globalThis.localStorage.setItem('language', 'de'));
  await page.goto('/guides');
  await expect(page).toHaveURL(/\/de\/guides$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('h1')).toHaveText('Anleitungen');
});

test('a signed-in reader sent from / to /home never sees the landing page', async ({ page }) => {
  await signUpAndSignIn(page);
  // Every frame until the page changes: is any of the landing page's text on screen?
  await page.addInitScript(() => {
    globalThis.landingShown = false;
    const look = () => {
      const landing = globalThis.document.querySelector('gc-landing-page');
      if (landing && globalThis.getComputedStyle(landing).visibility !== 'hidden') globalThis.landingShown = true;
      if (!globalThis.location.pathname.endsWith('/home')) globalThis.requestAnimationFrame(look);
    };
    globalThis.requestAnimationFrame(look);
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(() => globalThis.landingShown)).toBe(false);
});

test('a stored session the server does not confirm shows the landing page after all', async ({ page }) => {
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Free glaze chemistry for potters.');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-session', /./);
});
