const path = require('path');
const { test, expect } = require('@playwright/test');

// Pages in other languages (docs/adr/0013-translations.md): the language from
// the URL, the page's lang and direction, links that stay in the language,
// and a right-to-left page with its layout mirrored. Arabic is not offered
// yet, so its messages come from a test file here.

const arabic = async (page) => {
  await page.route('**/i18n/ar.json', (route) => route.fulfill({ path: path.join(__dirname, 'fixtures', 'ar.json') }));
};

test('English stays at the plain paths, left to right', async ({ page }) => {
  await page.goto('/guides');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About' })).toHaveAttribute(
    'href',
    '/about'
  );
  await expect(page).toHaveTitle('Guides - Glazecalc');
});

test('a right-to-left page mirrors its layout, and its links stay in the language', async ({ page }) => {
  await arabic(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/ar/guides');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page).toHaveTitle('أدلة - Glazecalc');

  const nav = page.getByRole('navigation', { name: 'القائمة الرئيسية' });
  await expect(nav.getByRole('link', { name: 'حول' })).toHaveAttribute('href', '/ar/about');
  // A message not yet translated shows the English.
  await expect(page.getByRole('link', { name: 'تسجيل الدخول' }).first()).toBeVisible();

  // Mirrored: the name of the app is on the right and the account links on the left.
  const brand = await nav.getByRole('link', { name: 'Glazecalc' }).boundingBox();
  const create = await nav.getByRole('link', { name: 'أنشئ حسابًا مجانيًا' }).boundingBox();
  expect(brand.x).toBeGreaterThan(640);
  expect(create.x).toBeLessThan(640);

  // Following a link keeps the language, without a new page load.
  await nav.getByRole('link', { name: 'حول' }).click();
  await expect(page).toHaveURL(/\/ar\/about$/);
  await expect(page).toHaveTitle('حول - Glazecalc');
  await expect(html).toHaveAttribute('dir', 'rtl');
});

test('a right-to-left guide keeps its gaps beside the rules and in its tables, on the mirrored side', async ({
  page
}) => {
  await page.goto('/ar-XB/guides/firing');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // The rule is on the right, and the text keeps its distance from it.
  const callout = page.locator('.guide-callout').first();
  await expect(callout).toHaveCSS('padding-right', '12px');
  await expect(callout).toHaveCSS('padding-left', '0px');
  const cell = page.locator('.guide-table td').first();
  await expect(cell).toHaveCSS('padding-left', '12px');
  await expect(cell).toHaveCSS('padding-right', '0px');
});

test('a guide links its sections at its own address, in its language, and a new page opens at its top', async ({
  page
}) => {
  await page.goto('/de/guides/firing');
  const section = page.locator('.guide h2').nth(1);
  const id = await section.getAttribute('id');
  const link = page.locator('.guide-contents a').nth(1);
  // Copied, shared or opened in a new tab, it is this section of the German guide.
  await expect(link).toHaveAttribute('href', '/de/guides/firing#' + id);
  await link.click();
  await expect(section).toBeFocused();
  await expect(page).toHaveURL(new RegExp('/de/guides/firing#' + id + '$'));
  // Opened at that address, the guide shows the section.
  await page.goto('/de/guides');
  await page.goto('/de/guides/firing#' + id);
  await expect(section).toBeInViewport();
  // A link to another guide, far down the page: it opens at its top, with the focus on its title.
  const other = page.locator('.guide a[href="/de/guides/safe-mixing"]').first();
  await other.scrollIntoViewIfNeeded();
  await other.click();
  await expect(page).toHaveURL(/\/de\/guides\/safe-mixing$/);
  await expect(page.locator('h1')).toBeFocused();
  expect(await page.evaluate(() => globalThis.scrollY)).toBe(0);
});

test('the pseudo-locale accents every message, which shows any left unmarked', async ({ page }) => {
  await page.goto('/en-XA/about');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA');
  const nav = page.getByRole('navigation', { name: /Ṁåîñ/ });
  await expect(nav.getByRole('link', { name: /^\[Åƀöûţ ·+\]$/ })).toHaveAttribute('href', '/en-XA/about');
});
