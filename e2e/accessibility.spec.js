// Automated accessibility checks (axe-core) on every page, signed out, signed
// in and during a trial, in light and dark mode. They catch what a tool can:
// contrast, labels, landmarks, heading order and ARIA misuse. Keyboard use and
// how a screen reader words things still need a person.
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { API, addColorant, addStandardMaterial, signUpAndSignIn } = require('./helpers');

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
      // The calculator with a recipe worked out.
      await page.goto('/recipe');
      await addStandardMaterial(page, 'Whiting', 20);
      await addStandardMaterial(page, 'Silica', 30);
      await addColorant(page, 'Cobalt carbonate', 1);
      await expect(page.locator('.unity-panel gc-unity-formula')).toBeVisible();
      await expectNoProblems(page, colorScheme + ' /recipe with a result');
      // The question about unsaved changes, open.
      await page.getByRole('button', { name: 'New recipe' }).click();
      await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
      await expectNoProblems(page, colorScheme + ' /recipe unsaved question');
      // A saved record's Remove question, open.
      const note = { title: 'Kiln', content: 'Element 3', relatedCollection: 'Notes', relatedId: 'general notes' };
      expect((await page.request.post(API + '/notes/create', { data: note })).ok()).toBeTruthy();
      await page.goto('/notes');
      await page.getByRole('button', { name: 'Remove Kiln' }).click();
      await expect(page.getByRole('button', { name: 'Yes, remove' })).toBeVisible();
      await expectNoProblems(page, colorScheme + ' remove question');
      // The phone menu, open.
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
