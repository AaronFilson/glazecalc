// A standard material's page in another language (docs/prerender-compression-and-material-pages-plan.md,
// Part B): its own address for search engines, with the others beside it, and the two ways on from it for a
// visitor who comes from a search: a recipe with the material in it at once (a trial, not asked), or an
// account, after which they are back on the page.
const { test, expect } = require('@playwright/test');
const { LIVE_LANGUAGES, REFERENCE_LANGUAGES } = require('../lib/regions/languages');
const { uniqueEmail } = require('./helpers');
const { nextEmail } = require('./mail');

const PAGE = '/de/materials/silica';
const offered = LIVE_LANGUAGES.filter((code) => REFERENCE_LANGUAGES.includes(code));

test.describe('a material page in German', () => {
  test('is its own page for search engines, as sent: German, canonical to itself, with each language beside it', async ({
    request
  }) => {
    const response = await request.get(PAGE);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-language']).toBe('de');
    const html = await response.text();
    expect(html).toContain('<html lang="de"');
    expect(html).toMatch(/<link rel="canonical" href="[^"]*\/de\/materials\/silica" \/>/);
    expect(html).not.toContain('noindex');
    for (const code of offered) expect(html, code).toContain(`hreflang="${code}"`);
    expect(html).toMatch(/hreflang="x-default" href="[^"]*\/materials\/silica"/);
    // Drawn in German before any script: no notice that it is in English, no note in English.
    expect(html).not.toContain('class="guide-note"');
    expect(html).not.toMatch(/<p\b[^>]*\blang="en"/);
    expect(html).toContain('"inLanguage":"de"');
    expect(html).toContain('/de/materials/silica"');
  });

  test('is in the German sitemap, which the sitemap index names', async ({ request }) => {
    const index = await (await request.get('/sitemap.xml')).text();
    expect(index).toContain('<sitemapindex');
    expect(index).toMatch(/<loc>[^<]*\/sitemaps\/de\.xml<\/loc>/);
    const german = await (await request.get('/sitemaps/de.xml')).text();
    expect(german).toMatch(/<loc>[^<]*\/de\/materials\/silica<\/loc>/);
  });

  test('its main button opens a recipe with the material in it, starting a trial without asking', async ({ page }) => {
    await page.goto(PAGE);
    await page.waitForFunction(() => globalThis.document.documentElement.hasAttribute('data-app-ready'));
    await page.locator('#material-try').click();
    await expect(page).toHaveURL(/\/de\/recipe$/);
    await expect(page.locator('.recipe-materials .recipe-row').first()).toContainText('Silica');
    await expect(page.locator('.recipe-materials .recipe-row')).toHaveCount(1);
    await expect(page.locator('#recipe-name')).toHaveValue('Silica');
    // Signed in as a trial, which the menu shows.
    await expect.poll(() => page.evaluate(() => globalThis.localStorage.getItem('session'))).toBe('trial');
  });

  test('its sign-up button makes an account and comes back to the page, and so does the confirmation email', async ({
    page
  }) => {
    const email = uniqueEmail('material-signup');
    await page.goto(PAGE);
    await page.waitForFunction(() => globalThis.document.documentElement.hasAttribute('data-app-ready'));
    await page.locator('#material-signup').click();
    await expect(page).toHaveURL(/\/de\/signup\?next=%2Fmaterials%2Fsilica$/);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('password123');
    await page.locator('#confirmation').fill('password123');
    await page.locator('#main form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/de\/materials\/silica$/);
    await expect(page.locator('h1')).toHaveText('Silica');
    // Signed in with an account now: no offer to make one.
    await expect(page.locator('#material-signup')).toHaveCount(0);

    // The link in the email carries the page, and goes back to it in German once the address is confirmed.
    const link = /(https?:\/\/\S+\/confirm-email#\S+)/.exec((await nextEmail(email)).text)[1];
    expect(link).toMatch(/#token=[\w-]+&next=%2Fmaterials%2Fsilica$/);
    await page.goto(link);
    await expect(page).toHaveURL(/\/confirm-email$/);
    await page.locator('#main button.btn-success').click();
    await expect(page).toHaveURL(/\/de\/materials\/silica$/);
  });
});
