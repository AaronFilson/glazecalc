// Where the potter works, and numbers typed and read their way (docs/i18n-plan.md).
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { API, addStandardMaterial, signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const amount = (page, name) => page.getByRole('textbox', { name: 'Amount of ' + name, exact: true });

test.beforeEach(async ({ page }) => {
  await signUpAndSignIn(page);
});

test('a potter in Germany types 12,5; the recipe is saved plainly and reads 12.5 in US English', async ({ page }) => {
  // Where they work sets the defaults: German numbers, °C, firing by temperature.
  await page.goto('/account');
  await page.locator('#region').selectOption('DE');
  await expect(page.locator('.settings-status')).toHaveText('Saved: Germany.');
  await expect(page.locator('#temperature-C')).toBeChecked();
  await expect(page.locator('#cones-temperature')).toBeChecked();
  await expect(page.locator('#format option').first()).toContainText('12.345,6');
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);

  await page.goto('/recipe');
  await page.locator('#recipe-name').fill('Komma');
  await addStandardMaterial(page, 'Whiting', '20');
  await addStandardMaterial(page, 'Silica', '12,5');
  // Leaving the box writes it back as it was read.
  await amount(page, 'Silica').press('Tab');
  await expect(amount(page, 'Silica')).toHaveValue('12,5');
  await expect(page.locator('.unity-panel')).toContainText('CaO : 1,000');
  await expect(page.locator('.unity-panel')).toContainText('SiO₂ : 1,041');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved at');

  // Saved plainly, so it reads the same anywhere.
  const recipes = await (await page.request.get(API + '/recipe/getAll')).json();
  const komma = recipes.find((recipe) => recipe.title === 'Komma');
  expect(komma.materials.map((m) => m.amount)).toEqual(['20', '12.5']);

  // The same account, now in the United States.
  await page.goto('/account');
  await page.locator('#region').selectOption('US');
  await expect(page.locator('.settings-status')).toHaveText('Saved: United States.');
  await expect(page.locator('#temperature-F')).toBeChecked();
  await page.goto('/recipe');
  const entry = page.locator('.saved-recipes .saved-recipe', { hasText: 'Komma' });
  await entry.getByRole('button', { name: 'Open' }).click();
  await expect(amount(page, 'Silica')).toHaveValue('12.5');
  await expect(page.locator('.unity-panel')).toContainText('CaO : 1.000');
});

test('the decimal mark can differ from the region: a point, typed by a potter in France', async ({ page }) => {
  await page.goto('/account');
  await page.locator('#region').selectOption('FR');
  await expect(page.locator('.settings-status')).toHaveText('Saved: France.');
  await page.locator('#decimal-mark-point').check();
  await expect(page.locator('.settings-status')).toHaveText('Saved: amounts are typed with a point for decimals.');

  await page.goto('/recipe');
  await addStandardMaterial(page, 'Whiting', '20');
  await addStandardMaterial(page, 'Silica', '12.5');
  await amount(page, 'Silica').press('Tab');
  await expect(amount(page, 'Silica')).toHaveValue('12.5');
  // A comma is not a decimal mark now, and says so.
  await amount(page, 'Whiting').fill('20,5');
  await amount(page, 'Whiting').press('Tab');
  await expect(page.locator('#material-amount-0-problem')).toHaveText(
    'Enter a number, such as 12.5, with a point for decimals.'
  );
});
