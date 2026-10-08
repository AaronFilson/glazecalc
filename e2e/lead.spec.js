// The Lead setting and Replace lead (docs/adr/0011-replacing-lead.md).
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { addColorant, addStandardMaterial, signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const expectNoProblems = async (page, label) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(
    violations.map((v) => v.id + ': ' + v.help),
    label
  ).toEqual([]);
};
const amount = (page, name) => page.getByRole('textbox', { name: 'Amount of ' + name, exact: true });

test.beforeEach(async ({ page }) => {
  await signUpAndSignIn(page);
});

test('lead is off until its warning is confirmed; a lead glaze is then rebuilt without it', async ({ page }) => {
  // Off unless chosen: no material with lead is listed to add.
  await page.goto('/recipe');
  const library = page.locator('.library', { hasText: 'Add materials' });
  await library.getByRole('button', { name: /^Standard/ }).click();
  await library.getByRole('searchbox').fill('lead');
  await expect(library.getByRole('button', { name: /^Add Lead, Red/ })).toHaveCount(0);
  await expect(library.locator('.library-hidden')).toContainText('with lead are not listed: lead is off in Settings.');

  // Turning it on asks first.
  await library.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('radio', { name: /^On: materials with lead/ }).check();
  await expect(page.locator('#lead-confirm')).toBeFocused();
  await expectNoProblems(page, 'the lead confirmation');
  await page.getByRole('button', { name: 'Turn lead on' }).click();
  await expect(page.locator('.settings-status')).toHaveText('Saved: materials with lead can be added and suggested.');

  // An old honey glaze: red lead, clay and flint, with iron.
  await page.goto('/recipe');
  await page.locator('#recipe-name').fill('Honey glaze');
  await addStandardMaterial(page, 'Lead, Red', 55);
  await addStandardMaterial(page, 'China Clay', 15);
  await addStandardMaterial(page, 'Silica', 30);
  await addColorant(page, 'Red iron oxide', 4);
  await expect(page.locator('.recipe-lead')).toContainText('Contains lead: PbO 1.000 in the unity formula');

  await page.getByRole('button', { name: 'Replace lead' }).click();
  await expect(page.getByRole('heading', { name: 'Replace the lead' })).toBeFocused();
  await expect(page.getByLabel('Fired to cone')).toHaveValue('04');
  // The frit that fits best is chosen to start with.
  await expect(page.locator('#lead-base-0')).toBeChecked();
  await expectNoProblems(page, 'the Replace lead question');

  await page.getByRole('button', { name: 'Replace lead and compare' }).click();
  await expect(page.getByRole('heading', { name: 'Compare two recipes' })).toBeFocused();
  await expect(page.locator('#compare-title')).toHaveText('Honey glaze and Honey glaze without lead');
  await expect(page.locator('.compare-recipe').nth(1)).toContainText('Lead replaced for cone 04 on');
  // The calculated expansion, old against new: crazing is the commonest failure of a converted glaze.
  const expansionRow = page.locator('.compare-table tbody tr', { hasText: 'Expansion' });
  await expect(expansionRow.locator('td').nth(0)).toHaveText(/^\d\.\d\d$/);
  await expect(expansionRow.locator('td').nth(1)).toHaveText(/^\d\.\d\d$/);
  await expect(page.locator('.compare-recipe').nth(1)).toContainText(
    'An iron honey glaze is less warm without lead, and can turn olive.'
  );

  await page.getByRole('button', { name: 'Back to the recipe' }).click();
  await expect(page.locator('#recipe-name')).toHaveValue('Honey glaze without lead');
  await expect(amount(page, 'Lead, Red')).toHaveCount(0);
  await expect(page.locator('.recipe-lead')).toHaveCount(0);
  // The colorant is carried over as it was.
  await expect(amount(page, 'Red iron oxide')).toHaveValue('4');
});

test('keeps the colour of a lead glaze on a lead-free base, 85 frit to 15 kaolin', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('radio', { name: /^On: materials with lead/ }).check();
  await page.getByRole('button', { name: 'Turn lead on' }).click();
  await expect(page.locator('.settings-status')).toHaveText('Saved: materials with lead can be added and suggested.');
  await page.goto('/recipe');
  await addStandardMaterial(page, 'Lead, Red', 60);
  await addStandardMaterial(page, 'China Clay', 10);
  await addStandardMaterial(page, 'Silica', 30);
  await addColorant(page, 'Copper carbonate', 3);

  await page.getByRole('button', { name: 'Replace lead' }).click();
  await page.getByRole('radio', { name: /^Keep the colour on a lead-free base/ }).check();
  const base = (await page.locator('label[for="lead-base-0"]').innerText()).replace(/ \(\d+% boron.*$/, '');
  await page.getByRole('button', { name: 'Replace lead and compare' }).click();
  await expect(page.locator('.compare-recipe').nth(1)).toContainText(
    'Copper turns bluer, toward turquoise, without lead.'
  );
  await page.getByRole('button', { name: 'Back to the recipe' }).click();
  await expect(amount(page, base)).toHaveValue('85');
  await expect(amount(page, 'China Clay')).toHaveValue('15');
  await expect(amount(page, 'Copper carbonate')).toHaveValue('3');
});

test('says how a lead glaze was rebuilt: the base frit and clay kept, the rest open to change', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('radio', { name: /^On: materials with lead/ }).check();
  await page.getByRole('button', { name: 'Turn lead on' }).click();
  await expect(page.locator('.settings-status')).toHaveText('Saved: materials with lead can be added and suggested.');
  await page.goto('/recipe');
  await addStandardMaterial(page, 'Lead, Red', 55);
  await addStandardMaterial(page, 'China Clay', 15);
  await addStandardMaterial(page, 'Silica', 30);

  await page.getByRole('button', { name: 'Replace lead' }).click();
  const base = (await page.locator('label[for="lead-base-0"]').innerText()).replace(/ \(\d+% boron.*$/, '');
  await page.getByRole('button', { name: 'Replace lead and compare' }).click();
  const report = page.locator('.swap-report');
  await expect(report).toContainText('lead-free formula for the firing');
  // The base frit and the clay are the app's: no Leave it out.
  await expect(report.locator('.swap-uses li', { hasText: base })).toHaveCount(1);
  await expect(report.getByRole('button', { name: 'Leave out ' + base })).toHaveCount(0);
  await expect(report.getByRole('button', { name: 'Leave out China Clay' })).toHaveCount(0);
  // What to watch for, in plain words.
  await expect(report.locator('.swap-cautions')).toContainText('expansion');
  await expectNoProblems(page, 'the rebuild report');
});
