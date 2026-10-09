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

test('the pseudo-locale accents every message, which shows any left unmarked', async ({ page }) => {
  await page.goto('/en-XA/about');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA');
  const nav = page.getByRole('navigation', { name: /Ṁåîñ/ });
  await expect(nav.getByRole('link', { name: /^\[Åƀöûţ ·+\]$/ })).toHaveAttribute('href', '/en-XA/about');
});
