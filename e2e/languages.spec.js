const { test, expect } = require('@playwright/test');
const { LANGUAGES, LIVE_LANGUAGES } = require('../lib/regions/languages');
const { signUpAndSignIn } = require('./helpers');

// Every page in every language offered (docs/i18n-plan.md, the layout gate):
// in the language, with the translation notice, and laid out at a phone's
// width without scrolling sideways, however long the language's words.

const TRANSLATED = LIVE_LANGUAGES.filter((code) => code !== 'en');

const VISITOR_PAGES = [
  '/',
  '/about',
  '/privacy',
  '/advice',
  '/guides',
  '/guides/glazing-basics',
  '/guides/making-a-glaze',
  '/guides/safe-mixing',
  '/guides/home-safety',
  '/guides/firing',
  '/signin',
  '/signup',
  '/forgot'
];
const ACCOUNT_PAGES = ['/home', '/recipe', '/material', '/additive', '/firing', '/notes', '/trash', '/account'];

/** How far the page is wider than the window, and the widest elements that make it so. */
const overflow = (page) =>
  page.evaluate(() => {
    const doc = globalThis.document.documentElement;
    const width = doc.clientWidth;
    const wide = [...globalThis.document.querySelectorAll('body *')]
      .filter((element) => element.getBoundingClientRect().right > width + 1)
      .filter((element) => !element.closest('.guide-table-scroll, .table-responsive, [class*="scroll"]'))
      .slice(0, 3)
      .map(
        (element) => `${element.tagName.toLowerCase()}.${element.className}: ${element.textContent.trim().slice(0, 40)}`
      );
    return { by: doc.scrollWidth - width, wide };
  });

const visit = async (page, code, path) => {
  await page.goto('/' + code + path);
  await expect(page.locator('html')).toHaveAttribute('lang', code);
  await expect(page.locator('h1')).toBeVisible();
  // Let fonts and late parts settle before measuring.
  await page.waitForLoadState('networkidle');
  const { by, wide } = await overflow(page);
  expect(by, `${code}${path} is wider than a phone by ${by}px: ${wide.join(' | ')}`).toBeLessThanOrEqual(0);
};

test.describe('pages in each language offered', () => {
  test.skip(!TRANSLATED.length, 'Only English is offered.');
  test.use({ viewport: { width: 360, height: 740 } });

  for (const code of TRANSLATED) {
    const name = LANGUAGES.find((language) => language.code === code).english;

    test(`${name}: every visitor page, at a phone's width`, async ({ page }) => {
      test.setTimeout(120_000);
      for (const path of VISITOR_PAGES) await visit(page, code, path);
      // The notice says the page was translated by AI.
      await expect(page.locator('gc-translation-notice aside')).toBeVisible();
    });

    test(`${name}: every page of the notebook, at a phone's width`, async ({ page }) => {
      test.setTimeout(120_000);
      await signUpAndSignIn(page);
      for (const path of ACCOUNT_PAGES) await visit(page, code, path);
    });
  }
});
