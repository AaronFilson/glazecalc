const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

const standardTable = (page) => page.locator('section', { hasText: 'The standard materials:' }).locator('table');
const myTable = (page) => page.locator('section', { hasText: 'My server materials:' }).locator('table');

// Adds an oxide with the oxide picker and enters its amount.
const addOxide = async (page, oxide, amount) => {
  await page.locator('select[name="firedox-select"]').selectOption(oxide);
  await page.getByRole('button', { name: 'Add the oxide to the list' }).click();
  const row = page.locator('li', { has: page.locator('b', { hasText: new RegExp('^' + oxide + '$') }) });
  await row.locator('input[name="amount"]').fill(String(amount));
};

test.beforeEach(async ({ page, request }) => {
  await signUpAndSignIn(page, request);
  await page.goto('/#/material');
});

test('lists standard materials with corrected equivalent weights', async ({ page }) => {
  const row = (name) => standardTable(page).locator('tr', { has: page.locator('td', { hasText: new RegExp('^' + name + '$') }) });
  await expect(row('Dolomite')).toContainText('92.2');
  await expect(row('Talc')).toContainText('126.42');
  await expect(row('Bone Ash')).toContainText('P2O5');
});

test('saves a molecular formula and calculates its weights from the LOI', async ({ page }) => {
  await page.locator('#material-name').fill('My Talc');
  await addOxide(page, 'MgO', 3);
  await addOxide(page, 'SiO2', 4);
  await page.locator('#LOI').fill('4.75');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.server-msg')).toContainText('Material added');
  const row = myTable(page).locator('tr', { hasText: 'My Talc' });
  await expect(row.locator('td').nth(1)).toHaveText('126.42');
  await expect(row.locator('td').nth(2)).toHaveText('120.41');
  await expect(row).toContainText('MgO : 3');
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
  await page.route('**/materials/create', (route) => route.fulfill({
    status: 400, contentType: 'application/json', body: JSON.stringify({ msg: 'Missing required information' })
  }));
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

  await expect(page.locator('.errors-section')).toContainText('LOI');
  await expect(page.locator('.server-msg')).toHaveCount(0);
});
