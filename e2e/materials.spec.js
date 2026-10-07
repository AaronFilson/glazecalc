const { test, expect } = require('@playwright/test');
const { formatFormula } = require('../lib/chemistry');
const { expectFieldProblem, signUpAndSignIn } = require('./helpers');

const standardTable = (page) => page.locator('section', { hasText: 'The standard materials:' }).locator('table');
const myTable = (page) => page.locator('section', { hasText: 'My server materials:' }).locator('table');

// Adds an oxide with the oxide picker and enters its amount.
const addOxide = async (page, oxide, amount) => {
  await page.locator('select[name="firedox-select"]').selectOption(oxide);
  await page.getByRole('button', { name: 'Add the oxide to the list' }).click();
  // The list shows the oxide with subscripts: Al₂O₃.
  const row = page.locator('li', { has: page.locator('b', { hasText: new RegExp('^' + formatFormula(oxide) + '$') }) });
  await row.locator('input.oxide-amount').fill(String(amount));
};

test.beforeEach(async ({ page, request }) => {
  await signUpAndSignIn(page);
  await page.goto('/material');
});

test('lists standard materials with corrected equivalent weights', async ({ page }) => {
  const row = (name) =>
    standardTable(page).locator('tr', { has: page.locator('td', { hasText: new RegExp('^\\s*' + name + '\\s*$') }) });
  await expect(row('Dolomite')).toContainText('92.2');
  await expect(row('Talc')).toContainText('126.42');
  await expect(row('Bone Ash')).toContainText('CaO : 3; P₂O₅ : 1');
  await expect(row('Bone Ash')).toContainText('Ca₃(PO₄)₂');
});

test('narrows the standard materials by kind and region, and says what replaced the old ones', async ({ page }) => {
  const tools = page.locator('.standard-tools');
  await tools.getByLabel('Kind').selectOption('feldspar');
  // By the name cell: other rows mention Custer Spar too ("Replaces: Custer Spar").
  const row = (name) =>
    standardTable(page).locator('tr', { has: page.locator('td:first-child', { hasText: new RegExp('^\\s*' + name) }) });
  const custer = row('Custer Spar');
  await expect(custer.locator('.status-badge')).toHaveText('Discontinued 2023');
  await expect(custer).toContainText('Use instead: G-200 EU Feldspar, Mahavir Potash Feldspar');
  await expect(custer.getByRole('link')).toHaveAttribute('href', /^https:/);
  await expect(row('G-200 EU Feldspar')).toContainText(/Replaces: [^.]*Custer Spar/);

  await tools.getByLabel('Kind').selectOption('');
  await tools.getByLabel('Sold in').selectOption('UK');
  await tools.getByLabel('Filter').fill('frit');
  await expect(row('Standard Borax Frit')).toHaveCount(1);
  // A US-only frit is left out (though another row may name it as similar); one sold in both is not.
  await expect(row('Fusion Frit F-19')).toHaveCount(0);
  await expect(row('Ferro Frit 3134')).toHaveCount(1);
});

test('saves a molecular formula and calculates its weights from the LOI', async ({ page }) => {
  await page.locator('#material-name').fill('My Talc');
  // Typed with plain numbers, shown with subscripts.
  await page.locator('#raw-formula').fill('3MgO•4SiO2•H2O');
  await addOxide(page, 'MgO', 3);
  await addOxide(page, 'SiO2', 4);
  await page.locator('#LOI').fill('4.75');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.server-msg')).toContainText('Material added');
  const row = myTable(page).locator('tr', { hasText: 'My Talc' });
  await expect(row.locator('td').nth(1)).toHaveText('126.42');
  await expect(row.locator('td').nth(2)).toHaveText('120.41');
  await expect(row).toContainText('MgO : 3; SiO₂ : 4');
  await expect(row).toContainText('3MgO•4SiO₂•H₂O');
});

test('saves a percent analysis as a unity formula', async ({ page }) => {
  await page.locator('#material-name').fill('My Spar');
  await page.locator('#radiopercent').check();
  await addOxide(page, 'K2O', 16.92);
  await addOxide(page, 'Al2O3', 18.32);
  await addOxide(page, 'SiO2', 64.76);
  await page.locator('#LOI').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.server-msg')).toContainText('Material added');
  await expect(myTable(page).locator('tr', { hasText: 'My Spar' }).locator('td').nth(1)).toHaveText('556.71');
});

test('shows the server message when a save is refused', async ({ page }) => {
  await page.route('**/materials/create', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ msg: 'Missing required information' })
    })
  );
  await page.locator('#material-name').fill('Refused');
  await addOxide(page, 'CaO', 1);
  await page.locator('#LOI').fill('44');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.errors-section')).toHaveText(/^\s*Missing required information\s*Dismiss\s*$/);
});

test('rejects an LOI of 100 percent', async ({ page }) => {
  await page.locator('#material-name').fill('Bad LOI');
  await addOxide(page, 'CaO', 1);
  await page.locator('#LOI').fill('100');
  await page.getByRole('button', { name: 'Save' }).click();

  await expectFieldProblem(page, 'LOI', 'Enter the LOI as a percent from 0 to under 100, such as 12.5.');
  await expect(page.locator('#LOI')).toBeFocused();
  await expect(page.locator('.server-msg')).toHaveCount(0);
});
