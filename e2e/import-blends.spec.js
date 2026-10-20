const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

// Paste-in import and blends for test tiles, against the real standard library.

const PASTE = [
  'Dolomite matte',
  'Cone 6 oxidation',
  '',
  'Orthoclase 40',
  'Silica 20',
  'Whiting 10',
  'Dolomite 20',
  'Kaolin (theoretical) 10',
  'Total 100',
  '',
  '---',
  'Satin white',
  'Material;Amount',
  'Custer Feldspar;45',
  'Whiting;20',
  'EPK;15',
  'Silica;20',
  '+ Tin oxide;2'
].join('\n');

/** Whether the page is wider than the window: a phone would scroll sideways. */
const scrollsSideways = (page) =>
  page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth + 1);

test('pastes two recipes, checks them, saves them, and blends them into test tiles', async ({ page }) => {
  test.setTimeout(90000);
  await signUpAndSignIn(page);
  await page.goto('/recipe');
  await page.getByRole('link', { name: 'Paste in recipes' }).click();
  await expect(page).toHaveURL(/\/import$/);
  await expect(page.locator('h1')).toHaveText('Paste in recipes');

  await page.getByLabel('Recipes to read').fill(PASTE);
  await page.getByRole('button', { name: 'Read the recipes' }).click();
  await expect(page.locator('.import-recipe')).toHaveCount(2);
  await expect(page.locator('#import-title-0')).toHaveValue('Dolomite matte');
  await expect(page.locator('#import-title-1')).toHaveValue('Satin white');
  await expect(page.locator('#import-0-0 option:checked')).toHaveText('Orthoclase');
  await expect(page.locator('#import-1-0 option:checked')).toHaveText('Custer Spar');
  await expect(page.locator('#import-1-2 option:checked')).toHaveText('EPK Kaolin');
  await expect(page.locator('#import-1-4 option:checked')).toHaveText('Tin oxide');
  await expect(page.locator('.import-totals').first()).toHaveText('Base materials add up to 100');

  await page.getByRole('button', { name: 'Save 2 recipes' }).click();
  await expect(page.locator('.server-msg')).toContainText('Saved 2 recipes.');
  await expect(page.locator('.import-saved')).toHaveCount(2);

  // Both are saved, with what was read.
  await page.getByRole('link', { name: 'Open your recipes' }).click();
  await expect(page.locator('.saved-recipe-name')).toHaveText([/Satin white/, /Dolomite matte/]);

  // A line blend between them, from the recipe's More.
  await page.getByRole('button', { name: 'More for Dolomite matte' }).click();
  await page.getByRole('link', { name: 'Make a blend from Dolomite matte' }).click();
  await expect(page).toHaveURL(/\/blends\?recipe=/);
  await expect(page.locator('#blend-corner-0 option:checked')).toHaveText('Dolomite matte');
  await page.locator('#blend-corner-1').selectOption({ label: 'Satin white' });
  await page.locator('#blend-steps').selectOption('5');
  await expect(page.locator('.blend-tile')).toHaveCount(5);
  await expect(page.locator('.blend-list-tile').nth(2).locator('h3')).toHaveText('Tile 3: 50% A, 50% B');
  await expect(page.locator('.blend-list-tile').nth(2)).toContainText('+ Tin oxide');

  // On a phone: no sideways scrolling, a triaxial blend too.
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await scrollsSideways(page)).toBe(false);
  await page.getByLabel('Triaxial (3 recipes)').check();
  await page.locator('#blend-corner-0').selectOption({ label: 'Dolomite matte' });
  await page.locator('#blend-corner-1').selectOption({ label: 'Satin white' });
  await page.locator('#blend-corner-2').selectOption({ label: 'Dolomite matte' });
  await page.locator('#blend-steps').selectOption('11');
  await expect(page.locator('.blend-tile')).toHaveCount(66);
  expect(await scrollsSideways(page)).toBe(false);

  // The chemistry table: closed until opened, then scrolling in its own box, not the page.
  const chemistry = page.locator('.blend-chemistry');
  await expect(chemistry.locator('.blend-chemistry-table')).toHaveCount(0);
  await chemistry.getByText('Chemistry per tile').click();
  await expect(chemistry.locator('tbody tr')).toHaveCount(66);
  expect(await scrollsSideways(page)).toBe(false);
  await expect(chemistry.locator('.blend-chemistry-scroll')).toHaveCSS('overflow-x', 'auto');
  await chemistry.getByText('Chemistry per tile').click();

  // Paper: the drawing and the list, without the controls.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.blend-list-panel')).toBeVisible();
  await expect(page.locator('#blend-setup-heading')).toBeHidden();
  await expect(page.locator('.blend-tile-choose').first()).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Save one tile as a recipe.
  await page.getByRole('checkbox', { name: /^Tile 1:/ }).check();
  await page.getByRole('button', { name: 'Save 1 tile' }).click();
  await expect(page.locator('.server-msg')).toContainText('Saved 1 tile as a recipe.');
  await page.goto('/recipe');
  await expect(page.locator('.saved-recipe-name')).toContainText([
    /Dolomite matte \/ Satin white \/ Dolomite matte blend, tile 1/
  ]);
});
