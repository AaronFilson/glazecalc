// What the guides say for where the potter works (docs/i18n-plan.md, Phase 4):
// shops, the materials sold there, the silica limit and the food-contact rules,
// each from lib/regions, for the region in Settings or another chosen to look at.
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.beforeEach(async ({ page }) => {
  // A visitor in Germany, as Settings would keep it in this browser.
  await page.addInitScript(() => globalThis.localStorage.setItem('preferredRegion', 'DE'));
});

const accessible = async (page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);
};

test('a potter in Germany is shown shops there, and what is sold there closest to US materials', async ({ page }) => {
  await page.goto('/guides/making-a-glaze');
  const shops = page.locator('gc-shops');
  await expect(shops.locator('caption')).toContainText('Some shops selling raw glaze materials in Germany');
  await expect(shops.getByRole('link', { name: 'Carl Jäger Tonindustriebedarf' })).toHaveAttribute(
    'href',
    /^https:\/\/shop\.carl-jaeger\.de\//
  );
  // Another country's, to look at; Settings are not changed.
  await shops.getByLabel('Shops in', { exact: true }).selectOption('LU');
  await expect(shops).toContainText('We found no shop selling raw glaze materials in Luxembourg.');
  await expect(shops.locator('caption')).toContainText('Shops elsewhere that say they deliver to Luxembourg');

  // The standard library, compared by chemistry: a US feldspar and what Europe sells closest to it.
  const equivalents = page.locator('gc-local-equivalents');
  await expect(equivalents.locator('caption')).toContainText('Materials not sold in the EU');
  const custer = equivalents.locator('tbody tr', { hasText: 'Custer Spar' });
  await expect(custer).toContainText('Feldspath potassique FP325 (Ceradel)');
  await expect(custer).toContainText(/differs by \d+,\d g per 100 g/);
  await accessible(page);
});

test("the silica limit and the food-contact rules are Germany's, and another country's on request", async ({
  page
}) => {
  await page.goto('/guides/safe-mixing');
  const silica = page.locator('gc-silica-limit');
  await expect(silica.locator('tbody th')).toHaveText(['Quartz and cristobalite']);
  await expect(silica.locator('tbody td')).toHaveText(['0,05 mg/m³']);
  await expect(silica).toContainText('An assessment criterion, not a binding limit.');
  await expect(silica.getByRole('link', { name: /Bundesanstalt für Arbeitsschutz und Arbeitsmedizin/ })).toBeVisible();
  await accessible(page);

  await page.goto('/guides/glazing-basics');
  const food = page.locator('gc-food-limits');
  await expect(food.getByRole('link', { name: /Bedarfsgegenständeverordnung/ })).toBeVisible();
  await expect(food.locator('tbody tr').first()).toContainText('0,8 mg/dm²');
  // The Netherlands' limits since 2026 are far lower.
  await food.getByLabel('Rules in', { exact: true }).selectOption('NL');
  await expect(food.locator('tbody tr').first()).toContainText('6 µg/dm²');
  await expect(food).toContainText('In force from 29 May 2026.');
  await accessible(page);
});

test.describe('a potter in Japan', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => globalThis.localStorage.setItem('preferredRegion', 'JP'));
  });

  test("is shown Japan's lines, its silica yardstick and its ceramic limits, at phone width too", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/guides/home-safety');
    const lines = page.locator('gc-poison-lines');
    await expect(lines.locator('a[href="tel:119"]')).toBeVisible();
    await expect(lines.locator('a[href="tel:+81727272499"]')).toHaveText('072-727-2499');
    await expect(lines.locator('a[href="tel:+81298529999"]')).toHaveText('029-852-9999');
    await expect(lines.locator('a[href="tel:%238000"]')).toHaveText('#8000');
    await expect(lines).toContainText('Only for acute poisoning that has actually happened');
    await accessible(page);

    await page.goto('/guides/safe-mixing');
    const silica = page.locator('gc-silica-limit');
    await expect(silica.locator('tbody td')).toHaveText(['3.0 / (1.19Q + 1) mg/m³', '0.025 mg/m³', '0.03 mg/m³']);
    await expect(silica).toContainText('A control concentration (管理濃度)');
    await expect(silica).toContainText('DS2 or RS2');
    await accessible(page);

    await page.goto('/guides/glazing-basics');
    const food = page.locator('gc-food-limits');
    await expect(food.locator('tbody tr').first()).toContainText('8 µg/cm²');
    await expect(food.locator('tbody tr')).toHaveCount(5);
    await expect(food).toContainText('no more than the limit');
    // Nothing on the page is wider than the phone.
    const overflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await accessible(page);
  });
});

test.describe('a potter in Türkiye', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => globalThis.localStorage.setItem('preferredRegion', 'TR'));
  });

  test("is shown Türkiye's lines, its silica formula and its ceramic limits, at phone width too", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/guides/home-safety');
    const lines = page.locator('gc-poison-lines');
    await expect(lines.locator('a[href="tel:112"]')).toBeVisible();
    await expect(lines.locator('a[href="tel:114"]')).toHaveText('114');
    await expect(lines).toContainText('UZEM');
    await accessible(page);

    await page.goto('/guides/safe-mixing');
    const silica = page.locator('gc-silica-limit');
    await expect(silica.locator('tbody td')).toHaveText(['10 / (Q + 2) mg/m³', '0.098 mg/m³', '0.049 mg/m³']);
    await expect(silica).toContainText('A binding limit.');
    await expect(silica).toContainText('FFP2');
    await accessible(page);

    await page.goto('/guides/glazing-basics');
    const food = page.locator('gc-food-limits');
    await expect(food.locator('tbody tr')).toHaveCount(3);
    await expect(food).toContainText('2012/30');
    await expect(food).toContainText('At least three samples');
    // Nothing on the page is wider than the phone.
    const overflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await accessible(page);
  });
});

test.describe('a potter in Taiwan', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => globalThis.localStorage.setItem('preferredRegion', 'TW'));
  });

  test("is shown Taiwan's poison centre, the 2027 silica limit with its date, and limits in ppm, at phone width", async ({
    page
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/guides/home-safety');
    const lines = page.locator('gc-poison-lines');
    await expect(lines.locator('a[href="tel:119"]')).toBeVisible();
    await expect(lines.locator('a[href="tel:+886228717121"]')).toHaveText('02-2871-7121');
    await accessible(page);

    await page.goto('/guides/safe-mixing');
    const silica = page.locator('gc-silica-limit');
    await expect(silica.locator('tbody td')).toHaveText(['0.1 mg/m³']);
    await expect(silica).toContainText('It applies from January 1, 2027.');
    await expect(silica).toContainText('Until 31 December 2026 an earlier table applies');
    await accessible(page);

    await page.goto('/guides/glazing-basics');
    const food = page.locator('gc-food-limits');
    await expect(food.locator('tbody tr')).toHaveCount(3);
    await expect(food).toContainText('ppm here is milligrams per litre');
    // Korea's, chosen to look at: no national poison line, and its five kinds of piece.
    await food.getByLabel('Rules in', { exact: true }).selectOption('KR');
    await expect(food.locator('tbody tr')).toHaveCount(5);
    const overflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth - globalThis.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await accessible(page);
  });
});

test.describe('a potter in Malaysia', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => globalThis.localStorage.setItem('preferredRegion', 'MY'));
  });

  test('is shown the poison centre with its hours, and told no shop was found', async ({ page }) => {
    await page.goto('/guides/home-safety');
    const lines = page.locator('gc-poison-lines');
    await expect(lines.locator('a[href="tel:+6046536999"]')).toHaveText('04-6536 999');
    await expect(lines).toContainText('Monday to Friday 8:00 to 22:00');
    await accessible(page);

    await page.goto('/guides/making-a-glaze');
    const shops = page.locator('gc-shops');
    await expect(shops).toContainText('We found no shop selling raw glaze materials in Malaysia.');
    // Singapore's, chosen to look at.
    await shops.getByLabel('Shops in', { exact: true }).selectOption('SG');
    await expect(shops.getByRole('link', { name: 'Sam Mui Kuang Pottery' })).toHaveAttribute(
      'href',
      'http://smkpottery.com/'
    );
    await accessible(page);
  });
});
