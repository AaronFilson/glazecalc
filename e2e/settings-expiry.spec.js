const { test, expect } = require('@playwright/test');

// Settings kept in the browser: every visit counts as use, and nothing is removed on its own. A return after
// nearly a year away shows a notice with a button to clear them (client/app/core/settings-expiry.ts).

const YEAR = 365 * 24 * 60 * 60 * 1000;

test('a return after nearly a year: using Glazecalc keeps the settings, or "Clear my settings" removes them', async ({
  page
}) => {
  await page.goto('/about');
  const seed = (used) =>
    page.evaluate((u) => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('settingsDates', JSON.stringify({ used: u, notice: 1 }));
    }, used);
  const clear = page.getByRole('button', { name: 'Clear my settings' });
  const notice = page.locator('.settings-expiry-notice');

  // Used: the notice shows for this return, and goes when closed; the settings stay, and the next visit is quiet.
  await seed(Date.now() - YEAR - 1000);
  await page.reload();
  await expect(notice).toContainText("You haven't used Glazecalc in this browser for nearly a year.");
  await notice.getByRole('button', { name: 'Close' }).click();
  await expect(clear).toHaveCount(0);
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  await expect(clear).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  // Left alone: still kept at the next load, never removed on its own.
  await seed(Date.now() - 3 * YEAR);
  await page.reload();
  await expect(clear).toBeVisible();
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  await expect(clear).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  // Cleared: the settings and their dates go, and the page reloads with the defaults.
  await seed(Date.now() - YEAR - 1000);
  await page.reload();
  await clear.click();
  await expect(page.locator('main')).toBeVisible();
  await expect(clear).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('settingsDates'))).toBeNull();
});
