const { test, expect } = require('@playwright/test');
const { addColorant, addStandardMaterial, signUpAndSignIn } = require('./helpers');

const DOLOMITE_MATTE = [
  ['Orthoclase', 40],
  ['Silica', 20],
  ['Whiting', 10],
  ['Dolomite', 20],
  ['China Clay', 10]
];

const sheet = (page) => page.locator('.print-sheet');
const printButton = (page) => page.getByRole('button', { name: 'Print', exact: true });

// The pages in a PDF: one "/Type /Page" object each ("/Type /Pages" is the list of them).
const pageCount = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;

const buildRecipe = async (page) => {
  await page.locator('#recipe-name').fill('Dolomite matte');
  for (const [name, amount] of DOLOMITE_MATTE) await addStandardMaterial(page, name, amount);
  await addColorant(page, 'Cobalt carbonate', 1);
};

test.beforeEach(async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/recipe');
});

test('prints a recipe on one page, Letter or A4, in black on white even in dark mode', async ({ page }) => {
  await buildRecipe(page);
  await printButton(page).click();
  await expect(page).toHaveURL(/\/recipe\?print=draft$/);
  await expect(page.getByRole('heading', { name: 'Print a recipe' })).toBeFocused();
  await expect(sheet(page).locator('h2')).toHaveText('Dolomite matte');

  await page.locator('#print-batch-size').fill('5000');
  await expect(page.locator('.print-batch-summary')).toHaveText(
    'Batch: 5000 g of base materials and 50 g of colorants and additives, 5050 g in all.'
  );
  await expect(sheet(page).locator('tbody tr').first()).toHaveText(/Orthoclase.*40\s*40%\s*2000\sg\s*2000\sg/);
  await expect(sheet(page).locator('.print-chemistry')).toContainText('Flux balance');

  // On paper: only the sheet, black on white, whatever the screen's theme.
  await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
  await expect(page.locator('.app-header')).toBeHidden();
  await expect(page.locator('.print-controls')).toBeHidden();
  const colors = await sheet(page).evaluate((el) => {
    const style = globalThis.getComputedStyle(el);
    return [style.color, style.backgroundColor];
  });
  expect(colors).toEqual(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']);
  for (const format of ['Letter', 'A4']) expect(pageCount(await page.pdf({ format })), format).toBe(1);

  // The batch list too, with a box to tick for each thing to weigh. (The options show on screen only.)
  await page.emulateMedia({ media: 'screen', colorScheme: 'dark' });
  await page.getByLabel(/^Just a batch list/).check();
  await expect(sheet(page).locator('.tick-box')).toHaveCount(6);
  await expect(sheet(page).locator('.print-chemistry')).toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  expect(pageCount(await page.pdf({ format: 'Letter' }))).toBe(1);
});

test('goes back to the recipe just as it was, by its own button or the browser', async ({ page }) => {
  await buildRecipe(page);
  await printButton(page).click();
  await expect(sheet(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/recipe$/);
  await expect(page.getByRole('textbox', { name: 'Amount of Dolomite', exact: true })).toHaveValue('20');
  await expect(printButton(page)).toBeFocused();

  await printButton(page).click();
  await page.getByRole('button', { name: 'Back to the recipe' }).click();
  await expect(page).toHaveURL(/\/recipe$/);
  await expect(page.locator('#recipe-name')).toHaveValue('Dolomite matte');
  await expect(printButton(page)).toBeFocused();
});

test('prints a saved recipe from the list, and a reload keeps it open', async ({ page }) => {
  await buildRecipe(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved');
  await page.getByRole('button', { name: 'Print Dolomite matte' }).click();
  await expect(page).toHaveURL(/\/recipe\?print=[0-9a-f]{24}$/);
  await page.reload();
  await expect(sheet(page).locator('h2')).toHaveText('Dolomite matte');
  await expect(page).toHaveTitle('Dolomite matte - Glazecalc');
  await page.getByRole('button', { name: 'Back to the recipe' }).click();
  await expect(page).toHaveURL(/\/recipe$/);
  await expect(page.getByRole('heading', { name: 'My saved recipes' })).toBeVisible();
});

test('weighs in pounds and ounces once that is chosen in Settings, which the account keeps', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('radio', { name: /^Pounds and ounces/ }).check();
  await expect(page.locator('.settings-status')).toHaveText('Saved: batch weights are in pounds and ounces.');
  // Kept with the account, not just on this browser.
  await page.evaluate(() => globalThis.localStorage.removeItem('weightUnit'));
  await page.reload();
  await expect(page.getByRole('radio', { name: /^Pounds and ounces/ })).toBeChecked();

  await page.goto('/recipe');
  await buildRecipe(page);
  await printButton(page).click();
  await expect(page.locator('.print-batch-size .input-group-text')).toHaveText('lb');
  await page.locator('#print-batch-size').fill('10');
  // 40% of 10 lb, and 1% of it in cobalt carbonate: 1.6 oz.
  await expect(sheet(page).locator('tbody tr').first()).toContainText('4 lb');
  await expect(page.locator('.print-batch-summary')).toHaveText(
    'Batch: 10 lb of base materials and 1.6 oz of colorants and additives, 10 lb 1.6 oz in all.'
  );
});

test('shows grams in full once chosen in Settings; on a phone a wide table scrolls within the sheet', async ({
  page
}) => {
  await page.goto('/account');
  await page.getByRole('radio', { name: /^Full precision/ }).check();
  await expect(page.locator('.settings-status')).toHaveText('Saved: grams show in full, to 5 decimal places.');

  await page.goto('/recipe');
  await buildRecipe(page);
  await printButton(page).click();
  await page.locator('#print-batch-size').fill('12345.678');
  // 40% of the batch, unrounded.
  await expect(sheet(page).locator('tbody tr').first()).toContainText('4938.2712 g');

  await page.setViewportSize({ width: 320, height: 800 });
  const overflow = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const scroller = globalThis.document.querySelector('.print-table-scroll');
    return { page: root.scrollWidth - root.clientWidth, tableScrolls: scroller.scrollWidth > scroller.clientWidth };
  });
  expect(overflow).toEqual({ page: 0, tableScrolls: true });
});
