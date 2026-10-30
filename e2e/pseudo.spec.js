const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

// Every page in the pseudo-locales (docs/translating.md): each message is
// accented in en-XA, and in Japanese characters in ja-XC, Arabic letters in
// ar-XD, Devanagari in hi-XE, Tamil in ta-XF, Kannada in kn-XG and Malayalam in
// ml-XH, so interface text that is none of them was never marked for
// translation. Names, numbers, units and formulas are not messages.

const PSEUDO = {
  'en-XA': /[åƀçðéƒĝĥîĵķļɱñöþǫŕšţûṽŵẋýžÅƁÇÐÉƑĜĤÎĴĶĻṀÑÖÞǪŔŠŢÛṼŴẊÝŽ]/,
  'ja-XC': /[\u3040-\u30ff\u4e00-\u9fff]/,
  'ar-XD': /[\u0600-\u06ff]/,
  'hi-XE': /[\u0900-\u097f]/,
  'ta-XF': /[\u0b80-\u0bff]/,
  'kn-XG': /[\u0c80-\u0cff]/,
  'ml-XH': /[\u0d00-\u0d7f]/
};

/** Interface text on the page that is not in the pseudo-locale: headings, labels, buttons, column heads, the menu. */
const unmarked = (page, marked) =>
  page.evaluate((source) => {
    const pattern = new RegExp(source);
    const NOT_MESSAGES = [/^Glazecalc$/, /^[\d\s.,:;%°CFKgxlbozmL()–/+×·-]*$/, /^[A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)*$/];
    const selector = 'h1, h2, h3, h4, label, legend, button, th[scope="col"], caption, summary, nav a, .lead-text';
    return [...globalThis.document.querySelectorAll(selector)]
      .filter((element) => element.checkVisibility?.() ?? true)
      .filter((element) => !element.closest('[translate="no"], .standard-table tbody, .user-content'))
      .map((element) => element.innerText.replace(/\s+/g, ' ').trim())
      .filter((text) => text && /[A-Za-z]{2}/.test(text) && !pattern.test(text))
      .filter((text) => !NOT_MESSAGES.some((not) => not.test(text)));
  }, marked.source);

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

for (const [code, marked] of Object.entries(PSEUDO)) {
  const where = code === 'en-XA' ? '' : ` (${code})`;

  test('every visitor page marks its text for translation' + where, async ({ page }) => {
    for (const path of VISITOR_PAGES) {
      await page.goto('/' + code + path);
      await expect(page.locator('h1')).toHaveText(marked);
      expect(await unmarked(page, marked), path).toEqual([]);
    }
  });

  test('every page of the notebook marks its text for translation' + where, async ({ page }) => {
    await signUpAndSignIn(page);
    for (const path of ACCOUNT_PAGES) {
      await page.goto('/' + code + path);
      await expect(page.locator('h1')).toHaveText(marked);
      expect(await unmarked(page, marked), path).toEqual([]);
    }
  });
}
