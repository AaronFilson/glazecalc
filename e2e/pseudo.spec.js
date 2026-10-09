const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

// Every page in the pseudo-locale (docs/translating.md): each message is
// accented there, so interface text that is not accented was never marked
// for translation. Names, numbers, units and formulas are not messages.

const ACCENTED = /[åƀçðéƒĝĥîĵķļɱñöþǫŕšţûṽŵẋýžÅƁÇÐÉƑĜĤÎĴĶĻṀÑÖÞǪŔŠŢÛṼŴẊÝŽ]/;

/** Interface text on the page that is not accented: headings, labels, buttons, column heads, the menu. */
const unmarked = (page) =>
  page.evaluate((accented) => {
    const pattern = new RegExp(accented);
    const NOT_MESSAGES = [/^Glazecalc$/, /^[\d\s.,:;%°CFKgxlbozmL()–/+×·-]*$/, /^[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)*$/];
    const selector = 'h1, h2, h3, h4, label, legend, button, th[scope="col"], caption, summary, nav a, .lead-text';
    return [...globalThis.document.querySelectorAll(selector)]
      .filter((element) => element.checkVisibility?.() ?? true)
      .filter((element) => !element.closest('[translate="no"], .standard-table tbody, .user-content'))
      .map((element) => element.innerText.replace(/\s+/g, ' ').trim())
      .filter((text) => text && /[A-Za-z]{2}/.test(text) && !pattern.test(text))
      .filter((text) => !NOT_MESSAGES.some((not) => not.test(text)));
  }, ACCENTED.source);

const VISITOR_PAGES = [
  '/',
  '/about',
  '/privacy',
  '/advice',
  '/guides',
  '/guides/firing',
  '/guides/home-safety',
  '/signin',
  '/signup',
  '/forgot'
];
const ACCOUNT_PAGES = ['/home', '/recipe', '/material', '/additive', '/firing', '/notes', '/trash', '/account'];

test('every visitor page marks its text for translation', async ({ page }) => {
  for (const path of VISITOR_PAGES) {
    await page.goto('/en-XA' + path);
    await expect(page.locator('h1')).toHaveText(ACCENTED);
    expect(await unmarked(page), path).toEqual([]);
  }
});

test('every page of the notebook marks its text for translation', async ({ page }) => {
  await signUpAndSignIn(page);
  for (const path of ACCOUNT_PAGES) {
    await page.goto('/en-XA' + path);
    await expect(page.locator('h1')).toHaveText(ACCENTED);
    expect(await unmarked(page), path).toEqual([]);
  }
});
