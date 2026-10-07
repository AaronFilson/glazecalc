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

// The palettes in Settings, light and dark: contrast of buttons, links, tabs and choices.
test('every palette, light and dark', async ({ page }) => {
  test.setTimeout(120000);
  await signUpAndSignIn(page);
  for (const palette of ['tenmoku', 'celadon', 'cobalt', 'oxblood', 'shino', 'ash']) {
    for (const theme of ['light', 'dark']) {
      const res = await page.request.put(API + '/preferences', { data: { palette, theme } });
      expect(res.ok()).toBe(true);
      for (const path of ['/recipe', '/account']) {
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoProblems(page, palette + ' ' + theme + ' ' + path);
      }
    }
  }
});

for (const colorScheme of ['light', 'dark']) {
  test.describe(colorScheme + ' mode', () => {
    test.use({ colorScheme });

    test('the public pages', async ({ page }) => {
      for (const path of PUBLIC_PAGES) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoProblems(page, colorScheme + ' ' + path);
      }
      // Fields marked with problems: the outline and the message in this mode's colors.
      await page.goto('/signup');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
      await expectNoProblems(page, colorScheme + ' /signup with problems marked');
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
      // The print view: the whole recipe, then the batch list.
      await page.getByRole('button', { name: 'Print', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Print a recipe' })).toBeFocused();
      await expectNoProblems(page, colorScheme + ' /recipe print view');
      await page.getByLabel(/^Just a batch list/).check();
      await expectNoProblems(page, colorScheme + ' /recipe print view, batch list');
      await page.getByRole('button', { name: 'Back to the recipe' }).click();
      // The compare view.
      await page.getByRole('button', { name: 'Compare', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Compare two recipes' })).toBeFocused();
      await expectNoProblems(page, colorScheme + ' /recipe compare view');
      await page.getByRole('button', { name: 'Back to the recipe' }).click();
      // The recipe's fields marked with problems.
      await page.locator('#recipe-name').fill('');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.locator('#recipe-name')).toHaveAttribute('aria-invalid', 'true');
      await expectNoProblems(page, colorScheme + ' /recipe with problems marked');
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
