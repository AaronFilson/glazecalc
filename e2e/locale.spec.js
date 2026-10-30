// Where the potter works, and numbers typed and read their way (docs/i18n-plan.md).
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { API, addStandardMaterial, choosePicked, signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const amount = (page, name) => page.getByRole('textbox', { name: 'Amount of ' + name, exact: true });

test.beforeEach(async ({ page }) => {
  await signUpAndSignIn(page);
});

test('a potter in Germany types 12,5; the recipe is saved plainly and reads 12.5 in US English', async ({ page }) => {
  // Where they work sets the defaults: German numbers, °C, firing by temperature.
  await page.goto('/account');
  await choosePicked(page.locator('#region'), 'Germany');
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
  await choosePicked(page.locator('#region'), 'United States');
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
  await choosePicked(page.locator('#region'), 'France');
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

test('a firing log shows its date in the calendar chosen in Settings; the date typed stays Gregorian', async ({
  page
}) => {
  await page.goto('/firing');
  await page.locator('#firing-title').fill('Bisque');
  await page.locator('#firing-date').fill('2026-10-03');
  await page.getByRole('button', { name: 'Add a row to the firing table' }).click();
  await page.getByLabel('Cone row 1').fill('04');
  await page.getByRole('button', { name: 'Save' }).click();
  const stored = page.locator('.stored-firing', { hasText: 'Bisque' });
  await expect(stored).toContainText('Saturday, October 3, 2026');

  // The Thai Buddhist era, then Japanese eras: only the date shown changes.
  await page.goto('/account');
  await expect(page.locator('#calendar-gregory')).toBeChecked();
  await page.locator('#calendar-buddhist').check();
  await expect(page.locator('.settings-status')).toHaveText('Saved: dates are shown in the Thai Buddhist era.');
  await page.goto('/firing');
  await expect(stored).toContainText('October 3, 2569 BE');
  await expect(page.locator('#firing-date')).toHaveValue('');

  await page.goto('/account');
  await page.locator('#calendar-japanese').check();
  await expect(page.locator('.settings-status')).toHaveText('Saved: dates are shown in Japanese eras.');
  await page.goto('/firing');
  await expect(stored).toContainText('October 3, 8 Reiwa');

  // Kept with the account, and saved as typed.
  const preferences = await (await page.request.get(API + '/preferences')).json();
  expect(preferences.calendar).toBe('japanese');
  const firings = await (await page.request.get(API + '/firing/getAll')).json();
  expect(firings.find((firing) => firing.title === 'Bisque').date).toMatch(/^2026-10-03/);
});

test('numbers show in the digits usual where the format is, or 0–9 when chosen; digits typed in any script save as 0–9', async ({
  page
}) => {
  // Arabic as Egypt writes it: Arabic-Indic digits, as usual there.
  await page.goto('/account');
  await page.locator('#format').selectOption('ar-EG');
  await expect(page.locator('.settings-status')).toHaveText('Saved: numbers and dates as in Arabic (Egypt).');
  await expect(page.locator('#digits-auto')).toBeChecked();
  await expect(page.locator('label[for="digits-auto"]')).toContainText('١٢٬٣٤٥٫٦');
  await expect(page.locator('label[for="digits-western"]')).toContainText('12,345.6');

  await page.goto('/recipe');
  await page.locator('#recipe-name').fill('Digits');
  await addStandardMaterial(page, 'Whiting', '20');
  // Typed in Arabic-Indic digits with the Arabic decimal mark; written back as read.
  await addStandardMaterial(page, 'Silica', '١٢٫٥');
  await amount(page, 'Silica').press('Tab');
  await expect(amount(page, 'Silica')).toHaveValue('12.5');
  await expect(page.locator('.unity-panel')).toContainText('CaO : ١٫٠٠٠');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved at');
  const recipes = await (await page.request.get(API + '/recipe/getAll')).json();
  expect(recipes.find((recipe) => recipe.title === 'Digits').materials.map((m) => m.amount)).toEqual(['20', '12.5']);

  // 0–9, chosen in Settings, whatever the format.
  await page.goto('/account');
  await page.locator('#digits-western').check();
  await expect(page.locator('.settings-status')).toHaveText('Saved: numbers are shown with the digits 0–9.');
  await page.goto('/recipe');
  await page
    .locator('.saved-recipes .saved-recipe', { hasText: 'Digits' })
    .getByRole('button', { name: 'Open' })
    .click();
  await expect(page.locator('.unity-panel')).toContainText('CaO : 1.000');
  const preferences = await (await page.request.get(API + '/preferences')).json();
  expect(preferences.digits).toBe('western');
});

test("a Bengali page shows its text's figures in Bengali digits, as its numbers, until 0–9 are chosen", async ({
  page
}) => {
  // The real Bengali messages, written as every translation is, in 0–9.
  await page.goto('/bn/account');
  const formatHelp = page.locator('.settings-group', { has: page.locator('#format') }).locator('.form-text');
  await expect(formatHelp).toHaveText('সংখ্যা ও তারিখ কীভাবে লেখা হয়: ১২,৩৪৫.৬ বা ১২.৩৪৫,৬, আর দিন ও মাসের ক্রম।');
  await expect(page.locator('label[for="temperature-C"]')).toContainText('১২৪০ °C');
  // The choice of 0–9 names them in 0–9, beside its example; the usual digits' example is Bengali.
  await expect(page.locator('label[for="digits-western"]')).toContainText('পশ্চিমা অঙ্ক, 0–9 (12,345.6)');
  await expect(page.locator('label[for="digits-auto"]')).toContainText('১২,৩৪৫.৬');

  await page.locator('#digits-western').check();
  await expect(page.locator('.settings-status')).toHaveText('সংরক্ষিত: সংখ্যা 0–9 অঙ্কে দেখানো হয়।');
  await expect(formatHelp).toHaveText('সংখ্যা ও তারিখ কীভাবে লেখা হয়: 12,345.6 বা 12.345,6, আর দিন ও মাসের ক্রম।');
  await expect(page.locator('label[for="temperature-C"]')).toContainText('1240 °C');
});

test('Marathi numbers show in Devanagari digits by default, Tamil, Kannada, Telugu, Gujarati and Malayalam in 0–9, as CLDR has them', async ({
  page
}) => {
  // [language, the usual digits' example]
  for (const [code, example] of [
    ['mr', '१२,३४५.६'],
    ['ta', '12,345.6'],
    ['kn', '12,345.6'],
    ['te', '12,345.6'],
    ['gu', '12,345.6'],
    ['ml', '12,345.6']
  ]) {
    await page.goto('/' + code + '/account');
    await expect(page.locator('html')).toHaveAttribute('lang', code);
    await expect(page.locator('label[for="digits-auto"]'), code).toContainText(example);
    await expect(page.locator('label[for="digits-western"]'), code).toContainText('12,345.6');
  }
});
