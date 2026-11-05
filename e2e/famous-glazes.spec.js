// Famous glazes (docs/famous-glazes.md): a published glaze's page renders, prerendered, with its history
// notice and its lead-free version marked "calculated, not yet test-fired"; an unpublished glaze, the tests'
// fixture and any other slug are the not-found page. The fixture's page renders when the published file
// (the English one, /i18n/famous-glazes/en.json) is stubbed to hold it, as it would once published.
const { test, expect } = require('@playwright/test');
const famous = require('../lib/famous-glazes');

const fixture = famous.loadGlazes(famous.FIXTURE_DIR).find((glaze) => glaze.slug === 'fixture-celadon');

test.describe('famous glazes', () => {
  test('a published glaze has its page, prerendered, history only with its lead-free version', async ({ page }) => {
    const response = await page.goto('/famous-glazes/iznik');
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<h1');
    expect(html).toContain('History only');
    await expect(page.locator('h1')).toHaveText('İznik');
    await expect(page.locator('#famous-history')).toBeVisible();
    await expect(page.locator('#famous-untested')).toContainText('Calculated, not yet test-fired.');
    // The proposal's own materials make the version until a region is chosen.
    await expect(page.locator('#famous-local-recipe')).toContainText('Ferro Frit');
    await page.locator('#famous-region').selectOption('UK');
    await expect(page.locator('#famous-local-recipe')).toContainText('Tin oxide');
    await expect(page.locator('#famous-signup')).toHaveAttribute('href', '/signup?next=%2Ffamous-glazes%2Fiznik');
  });

  test('the index lists the published glazes', async ({ page }) => {
    expect((await page.goto('/famous-glazes')).status()).toBe(200);
    await expect(page.locator('.famous-list a')).toHaveText(['İznik', 'Oribe', 'Shino']);
  });

  test('Shino and Oribe have pages with their traditional recipes, marked not yet test-fired', async ({ page }) => {
    const response = await page.goto('/famous-glazes/shino');
    expect(response.status()).toBe(200);
    await expect(page.locator('h1')).toHaveText('Shino');
    await expect(page.locator('#famous-recipe')).toBeVisible();
    await expect(page.locator('body')).toContainText('Kamado Feldspar');
    await expect(page.locator('#famous-untested')).toContainText('Calculated, not yet test-fired.');
    expect((await page.goto('/famous-glazes/oribe')).status()).toBe(200);
    await expect(page.locator('body')).toContainText('1230–1280 °C');
    await expect(page.locator('body')).toContainText('Copper oxide');
  });

  test('the fixture and an unknown slug are not found', async ({ request }) => {
    for (const address of ['/famous-glazes/nope', '/famous-glazes/fixture-celadon', '/de/famous-glazes/nope']) {
      expect((await request.get(address)).status(), address).toBe(404);
    }
    const map = await (await request.get('/sitemaps/en.xml')).text();
    expect(map).toContain('/famous-glazes/iznik</loc>');
    expect(map).toContain('/famous-glazes/shino</loc>');
  });

  test("the fixture's page renders from the published file, and opens its recipe", async ({ page }) => {
    await page.route('**/i18n/famous-glazes/en.json', (route) =>
      route.fulfill({ json: [famous.glazeIn(famous.resolveGlaze(fixture), 'en')] })
    );
    // The server has no such page (404, its index.html not prerendered), so the app reads the stubbed file.
    await page.goto('/famous-glazes/fixture-celadon');
    await expect(page.locator('h1')).toHaveText('Fixture celadon');
    await expect(page.locator('#famous-unity tr').first()).toBeVisible();
    await expect(page.locator('#famous-untested')).toHaveCount(0);
    await page.locator('#famous-open').click();
    await expect(page).toHaveURL(/\/recipe$/);
    await expect(page.locator('body')).toContainText('Custer Spar');
  });
});
