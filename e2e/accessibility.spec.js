// Automated accessibility checks (axe-core) on every page, signed out, signed
// in and during a trial, in light and dark mode. They catch what a tool can:
// contrast, labels, landmarks, heading order and ARIA misuse. Keyboard use and
// how a screen reader words things still need a person.
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { addStandardMaterial, signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Fails with one line per problem and the elements it was found on.
const expectNoProblems = async (page, label) => {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const problems = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  );
  expect(problems, label).toEqual([]);
};

const PUBLIC_PAGES = ['/', '/advice', '/about', '/privacy', '/signin', '/signup', '/forgot', '/no-such-page'];
const APP_PAGES = ['/home', '/material', '/additive', '/firing', '/notes', '/advice', '/account', '/trash'];

for (const colorScheme of ['light', 'dark']) {
  test.describe(colorScheme + ' mode', () => {
    test.use({ colorScheme });

    test('the public pages', async ({ page }) => {
      for (const path of PUBLIC_PAGES) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoProblems(page, colorScheme + ' ' + path);
      }
    });

    test('the app pages, signed in', async ({ page, request }) => {
      await signUpAndSignIn(page);
      for (const path of APP_PAGES) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoProblems(page, colorScheme + ' ' + path);
      }
      // The calculator with a recipe worked out, and the phone menu open.
      await page.goto('/recipe');
      await addStandardMaterial(page, 'Whiting', 20);
      await addStandardMaterial(page, 'Silica', 30);
      await page.getByRole('button', { name: 'Compute recipe into Unity' }).click();
      await expect(page.locator('gc-unity-formula')).toBeVisible();
      await expectNoProblems(page, colorScheme + ' /recipe with a result');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Menu' }).click();
      await expectNoProblems(page, colorScheme + ' phone menu');
    });

    test('a trial', async ({ page }) => {
      await page.goto('/');
      await page.locator('.hero-actions').getByRole('button', { name: 'Try it now' }).click();
      await expect(page.locator('.trial-bar')).toBeVisible();
      await expectNoProblems(page, colorScheme + ' trial /recipe');
      await page.locator('.trial-bar').getByRole('button', { name: 'Discard trial' }).click();
      await expectNoProblems(page, colorScheme + ' trial, discarding');
      await page.locator('.trial-bar').getByRole('button', { name: 'Keep trying' }).click();
      for (const path of ['/signup', '/signin', '/account']) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoProblems(page, colorScheme + ' trial ' + path);
      }
    });
  });
}
