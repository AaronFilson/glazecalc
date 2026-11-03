const { test, expect } = require('@playwright/test');

// Settings kept in the browser a year unused: a notice first, then removed (client/app/core/settings-expiry.ts).

const YEAR = 365 * 24 * 60 * 60 * 1000;

test('settings a year unused are kept with the notice, or removed at the next load', async ({ page }) => {
  await page.goto('/about');
  const seed = (used) =>
    page.evaluate((u) => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('settingsDates', JSON.stringify({ used: u, notice: 1 }));
    }, used);
  const keep = page.getByRole('button', { name: 'Keep my settings' });

  // Kept: the notice goes, and the year starts again.
  await seed(Date.now() - YEAR - 1000);
  await page.reload();
  await keep.click();
  await expect(keep).toHaveCount(0);
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  await expect(keep).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  // Ignored: removed at the next load.
  await seed(Date.now() - YEAR - 1000);
  await page.reload();
  await expect(keep).toBeVisible();
  await page.reload();
  await expect(page.locator('main')).toBeVisible();
  await expect(keep).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('settingsDates'))).toBeNull();
});
