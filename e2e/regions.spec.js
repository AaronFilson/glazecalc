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
