// The searchable, grouped lists for the language and the region (client/app/shared/picker.ts), and the
// language links in the footer and on the about page, at a phone's width and a desktop's: usable by
// keyboard and screen reader (the WAI-ARIA combobox), laid out inside the window, and as right to
// left (the pseudo-locale ar-XB) as left to right.
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { LIVE_LANGUAGES } = require('../lib/regions/languages');
const { API, choosePicked, signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// Landmarks and headings, which axe tags as best practice rather than WCAG (accessibility.spec.js).
const STRUCTURE = Object.fromEntries(
  ['landmark-one-main', 'region', 'page-has-heading-one', 'heading-order'].map((rule) => [rule, { enabled: true }])
);

const accessible = async (page, label) => {
  const { violations } = await new AxeBuilder({ page }).options({ rules: STRUCTURE }).withTags(WCAG).analyze();
  expect(
    violations.map((v) => `${v.id} (${v.impact}): ${v.help} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    label
  ).toEqual([]);
};

/** How far the page reaches past the window sideways: nothing should. */
const sideways = (page) => page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.innerWidth);

/** An element's box lies inside the window's width. */
const insideWindow = async (page, locator) => {
  const box = await locator.boundingBox();
  const width = page.viewportSize().width;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
};

// Each test opens lists and runs the checks of a tool on pages with them open: more than the default 30 seconds on a busy machine.
test.describe.configure({ timeout: 90000 });

const saved = async (page) => (await (await page.request.get(API + '/preferences')).json()) ?? {};

for (const [where, viewport] of Object.entries({
  'a phone, 320 px wide': { width: 320, height: 700 },
  'a desktop': { width: 1280, height: 800 }
})) {
  test.describe(where, () => {
    test.use({ viewport });

    test('the language is chosen from a searchable list by its own name or its English name', async ({ page }) => {
      await signUpAndSignIn(page);
      await page.goto('/account');
      const field = page.getByRole('combobox', { name: 'Language', exact: true });
      await expect(field).toHaveValue('English');
      await expect(field).toHaveAttribute('aria-expanded', 'false');

      // Opened: every language offered, in groups by the part of the world, English first and apart.
      await field.click();
      await expect(field).toHaveAttribute('aria-expanded', 'true');
      const list = page.getByRole('listbox', { name: 'Language' });
      await expect(list).toBeVisible();
      await expect(list.getByRole('option')).toHaveCount(LIVE_LANGUAGES.length);
      await expect(list.getByRole('group', { name: 'Europe' }).getByRole('option', { name: /Deutsch/ })).toBeVisible();
      await expect(
        list.getByRole('group', { name: 'East Asia' }).getByRole('option', { name: /日本語/ })
      ).toBeVisible();
      // The current one is marked, for a screen reader as well as the eye, and has the focus the field names.
      const current = list.getByRole('option', { selected: true });
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(/English/);
      await expect(field).toHaveAttribute('aria-activedescendant', await current.getAttribute('id'));
      await insideWindow(page, list);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
      await accessible(page, 'the open list');

      // Typed: by the name in its own script, the English name, the start of it, and without accents.
      for (const [typed, found] of [
        ['german', 'Deutsch'],
        ['deu', 'Deutsch'],
        ['francais', 'Français'],
        ['turkish', 'Türkçe'],
        ['日本', '日本語'],
        ['indonesian', 'Bahasa Indonesia']
      ]) {
        await field.fill(typed);
        await expect(list.getByRole('option'), typed).toHaveCount(1);
        await expect(list.getByRole('option'), typed).toContainText(found);
      }
      // The result is said aloud as well: how many, and when none.
      await field.fill('portu');
      await expect(page.getByRole('status').filter({ hasText: '1 match' })).toHaveCount(1);
      await field.fill('klingon');
      await expect(list).toHaveCount(0);
      await expect(field).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('status').filter({ hasText: 'No language matches' })).toBeVisible();
      await accessible(page, 'no match');
      expect(await sideways(page)).toBeLessThanOrEqual(0);

      // Chosen with the keyboard: Enter on the first that matches. The page opens in it, and the choice is
      // saved as it always was: the language's code.
      await field.fill('french');
      await field.press('Enter');
      await expect(page).toHaveURL(/\/fr\/account$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      expect((await saved(page)).language).toBe('fr');
      // In French the same list, the current one marked, the groups' names in English until they are translated.
      await page.locator('#language').click();
      await expect(page.locator('#language')).toHaveValue('Français');
      await expect(page.getByRole('listbox').getByRole('option', { selected: true })).toContainText('Français');
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });

    test('the region is chosen from a list by continent, by its name or its English name', async ({ page }) => {
      await signUpAndSignIn(page);
      await page.goto('/account');
      const field = page.getByRole('combobox', { name: 'Where you work', exact: true });
      await expect(field).toHaveValue('Not chosen');
      await field.click();
      const list = page.getByRole('listbox', { name: 'Where you work' });
      await expect(list.locator('.picker-heading')).toHaveText(['Americas', 'Asia', 'Europe', 'Oceania']);
      await expect(list.getByRole('option').first()).toHaveText('Not chosen');
      await insideWindow(page, list);
      await accessible(page, 'the open list of regions');
      await field.fill('south kor');
      await expect(list.getByRole('option')).toHaveText(['South Korea']);
      await field.press('Enter');
      await expect(page.locator('.settings-status')).toHaveText('Saved: South Korea.');
      expect((await saved(page)).region).toBe('KR');
      await expect(field).toHaveValue('South Korea');

      // Another with the keys alone: down, down, Enter, from the choice.
      await field.focus();
      await field.press('ArrowDown');
      await expect(field).toHaveAttribute('aria-expanded', 'true');
      const before = await field.getAttribute('aria-activedescendant');
      await field.press('ArrowDown');
      expect(await field.getAttribute('aria-activedescendant')).not.toBe(before);
      // Escape closes it and leaves the choice as it was; the page itself (no menu here) is not touched.
      await field.press('Escape');
      await expect(field).toHaveAttribute('aria-expanded', 'false');
      await expect(field).toHaveValue('South Korea');
      await expect(field).toBeFocused();

      // On a page in another language: named in it, with the English name beside it, and found by that.
      await page.goto('/de/account');
      const german = page.locator('#region');
      await german.click();
      await german.fill('germany');
      const option = page.getByRole('listbox').getByRole('option');
      await expect(option).toHaveCount(1);
      await expect(option).toContainText('Deutschland');
      await expect(option).toContainText('Germany');
      await german.press('Enter');
      await expect.poll(async () => (await saved(page)).region).toBe('DE');
      expect(await sideways(page)).toBeLessThanOrEqual(0);
    });

    test('the footer and the about page list every language, grouped, and the lists fit the window', async ({
      page
    }) => {
      await page.goto('/about');
      await expect(page.locator('h1')).toBeVisible();
      const about = page.locator('main').getByRole('navigation', { name: 'Languages' });
      const grouped = (nav) => nav.locator('.language-group-name').allTextContents();
      await expect(about.getByRole('link')).toHaveCount(LIVE_LANGUAGES.length);
      expect(await grouped(about)).toEqual(expect.arrayContaining(['East Asia', 'Europe']));
      await expect(about.getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'page');
      await expect(about.getByRole('link', { name: 'Deutsch' })).toHaveAttribute('href', '/de/about');
      await expect(about.getByRole('link', { name: 'Deutsch' })).toHaveAttribute('hreflang', 'de');
      expect(await sideways(page)).toBeLessThanOrEqual(0);

      // The footer folds them into one line until asked.
      const footer = page.locator('footer');
      const nav = footer.getByRole('navigation', { name: 'Languages' });
      await expect(nav).toBeHidden();
      await footer.locator('summary').click();
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('link')).toHaveCount(LIVE_LANGUAGES.length);
      await insideWindow(page, nav);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
      await accessible(page, 'the about page with the footer list open');
      // A link is a link: it opens this page in the language.
      await nav.getByRole('link', { name: '日本語' }).click();
      await expect(page).toHaveURL(/\/ja\/about$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    });

    test('right to left: the list opens on the mirrored side, inside the window, and is as accessible', async ({
      page
    }) => {
      await signUpAndSignIn(page);
      await page.goto('/ar-XB/account');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      for (const id of ['language', 'region']) {
        const field = page.locator('#' + id);
        await field.click();
        const list = page.getByRole('listbox');
        await expect(list).toBeVisible();
        await insideWindow(page, list);
        // The list spans the field, on the same sides.
        const [f, l] = [await field.boundingBox(), await list.boundingBox()];
        expect(Math.abs(l.x + l.width - (f.x + f.width))).toBeLessThan(60);
        expect(l.x).toBeGreaterThanOrEqual(0);
        // Each name set apart, so Latin names and brackets stay in order in the right-to-left page.
        await expect(list.getByRole('option').first().locator('bdi').first()).toHaveAttribute('dir', 'auto');
        expect(await sideways(page), id).toBeLessThanOrEqual(0);
        await accessible(page, 'right to left, the open list of ' + id);
        await field.press('Escape');
      }
      // The footer's list too, and the about page's.
      await page.goto('/ar-XB/about');
      await page.locator('footer summary').click();
      expect(await sideways(page)).toBeLessThanOrEqual(0);
      await accessible(page, 'right to left, the about page with the footer list open');
    });
  });
}

test('a region chosen in a guide is for looking at only, and the list there works the same', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => globalThis.localStorage.setItem('preferredRegion', 'DE'));
  await page.goto('/guides/making-a-glaze');
  const shops = page.locator('gc-shops');
  // The open list is named as the field is, so the field is found by its role.
  const field = shops.getByRole('combobox', { name: 'Shops in', exact: true });
  await expect(field).toHaveValue('Germany');
  await choosePicked(field, 'Luxembourg');
  await expect(shops).toContainText('We found no shop selling raw glaze materials in Luxembourg.');
  await expect(field).toHaveValue('Luxembourg');
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await accessible(page, 'the guide with a region chosen');
});
