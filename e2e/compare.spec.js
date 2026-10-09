const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { addColorant, addStandardMaterial, signUpAndSignIn } = require('./helpers');

const OLD_CELADON = [
  ['Custer Spar', 30],
  ['Silica', 30],
  ['Whiting', 20],
  ['EPK Kaolin', 20]
];

// An old raw glaze: niter, which dissolves in water, for its potash.
const NITER_GLAZE = [
  ['Niter', 10],
  ['Whiting', 20],
  ['China Clay', 20],
  ['Silica', 40],
  ['Talc', 10]
];

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const amount = (page, name) => page.getByRole('textbox', { name: 'Amount of ' + name, exact: true });

const compareRow = (page, label) =>
  page.locator('.compare-table tbody tr', { has: page.locator('th', { hasText: new RegExp('^' + label + '$') }) });

// The pages in a PDF: one "/Type /Page" object each.
const pageCount = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;

test.beforeEach(async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/recipe');
});

test('tries modern materials for an old recipe, compares the two, prints them, and keeps both', async ({ page }) => {
  await page.locator('#recipe-name').fill('Old celadon');
  for (const [name, amount] of OLD_CELADON) await addStandardMaterial(page, name, amount);
  await addColorant(page, 'Red iron oxide', 1.5);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved');

  await expect(page.locator('.recipe-swap')).toContainText('Custer Spar (Discontinued 2023)');
  await expect(page.locator('.recipe-swap')).toContainText('EPK Kaolin (Hard to get since 2025)');
  await page.getByRole('button', { name: 'Try modern materials and compare' }).click();
  await expect(page).toHaveURL(/\/recipe\?compare=[0-9a-f]{24},draft$/);
  await expect(page.getByRole('heading', { name: 'Compare two recipes' })).toBeFocused();
  await expect(page.locator('#compare-title')).toHaveText('Old celadon and Old celadon with modern materials');
  // Custer is potash spar with some soda; G-200 EU has less soda.
  await expect(compareRow(page, 'Na₂O').locator('td').nth(2)).toHaveText(/^\u2212\d/);
  await expect(page.locator('.compare-recipe').nth(1)).toContainText(
    'Swapped one for one: Custer Spar became G-200 EU Feldspar and EPK Kaolin became Wilco UPF Kaolin.'
  );

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.compare-controls')).toBeHidden();
  for (const format of ['Letter', 'A4']) expect(pageCount(await page.pdf({ format })), format).toBe(1);
  await page.emulateMedia({ media: 'screen' });

  // Back to the new recipe, not saved yet; saving it keeps the old one as it was.
  await page.getByRole('button', { name: 'Back to the recipe' }).click();
  await expect(page).toHaveURL(/\/recipe$/);
  await expect(page.locator('#recipe-name')).toHaveValue('Old celadon with modern materials');
  await expect(page.locator('.recipe-status')).toHaveText('Not saved yet');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.saved-recipes')).toContainText('Old celadon with modern materials');
  await expect(page.locator('.saved-recipe b', { hasText: /^Old celadon$/ })).toHaveCount(1);
});

test('compares saved recipes picked from the list, and colorants counted alike', async ({ page }) => {
  for (const [title, whiting] of [
    ['Twenty', 20],
    ['Thirty', 30]
  ]) {
    await page.locator('#recipe-name').fill(title);
    await addStandardMaterial(page, 'Silica', 50);
    await addStandardMaterial(page, 'Whiting', whiting);
    await addStandardMaterial(page, 'Custer Spar', 30);
    await page.getByRole('button', { name: 'Save and add next recipe' }).click();
    await expect(page.locator('.saved-recipes')).toContainText(title);
  }
  await page.getByRole('button', { name: 'Compare Twenty' }).click();
  await expect(page.locator('#compare-title')).toHaveText('Twenty and Thirty');
  await expect(compareRow(page, 'CaO').locator('td').nth(2)).toHaveText(/^\+\d/);

  await page.locator('#compare-right').selectOption({ label: 'Twenty' });
  await expect(page.locator('#compare-title')).toHaveText('Twenty and Twenty');
  await expect(compareRow(page, 'CaO').locator('td').nth(2)).toHaveText('same');
  // Choosing the other recipe replaced the address: Back leaves the comparison.
  await page.goBack();
  await expect(page).toHaveURL(/\/recipe$/);
  await expect(page.getByRole('button', { name: 'Compare Twenty' })).toBeFocused();
});

test('suggests amounts when a swap is not like for like, asking what brings back what it leaves short', async ({
  page
}) => {
  await page.locator('#recipe-name').fill('Niter glaze');
  for (const [name, amount] of NITER_GLAZE) await addStandardMaterial(page, name, amount);
  await expect(page.locator('.recipe-swap')).toContainText(
    'Niter (Historical): Ferro Frit 3110 is what is used now, but it is not like for like'
  );
  await page.getByRole('button', { name: 'Suggest amounts and compare' }).click();
  await expect(page.getByRole('heading', { name: 'Bring back what the old materials gave' })).toBeFocused();
  await expect(page.locator('.recipe-suggest legend')).toContainText('Niter gave potash (K₂O)');
  // The material that fits best is chosen to start with.
  await expect(page.locator('.recipe-suggest input[type=radio]').first()).toBeChecked();
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);

  await page.getByRole('button', { name: 'Work it out and compare' }).click();
  await expect(page.getByRole('heading', { name: 'Compare two recipes' })).toBeFocused();
  await expect(page.locator('#compare-title')).toHaveText('Niter glaze and Niter glaze with modern materials');
  await expect(page.locator('.compare-recipe').nth(1)).toContainText(
    'Amounts worked out to bring the unity formula back: Niter became Ferro Frit 3110.'
  );
  // The fluxes the frit and feldspar do not bring stay as they were.
  for (const oxide of ['CaO', 'MgO']) {
    await expect(compareRow(page, oxide).locator('td').nth(2)).toHaveText(/^(same|[+−]0\.00\d)$/);
  }

  await page.getByRole('button', { name: 'Back to the recipe' }).click();
  await expect(page.locator('#recipe-name')).toHaveValue('Niter glaze with modern materials');
  await expect(amount(page, 'Niter')).toHaveCount(0);
  // What did not need changing is as it was.
  await expect(amount(page, 'Whiting')).toHaveValue('20');
  await expect(amount(page, 'Talc')).toHaveValue('10');
  await page.getByRole('button', { name: 'Undo the swap' }).click();
  await expect(amount(page, 'Niter')).toHaveValue('10');
});

test('says how a suggestion was made, and works it out again leaving one out or trying others', async ({ page }) => {
  for (const [name, amount] of NITER_GLAZE) await addStandardMaterial(page, name, amount);
  await page.getByRole('button', { name: 'Suggest amounts and compare' }).click();
  // Materials to try, before working it out: added from the library, perhaps as a must.
  await page.getByRole('button', { name: 'Materials to try (0)' }).click();
  const tries = page.locator('.recipe-suggest .try-materials');
  await tries.getByRole('button', { name: /^Standard/ }).click();
  await tries.getByRole('searchbox').fill('wollastonite');
  await tries.getByRole('button', { name: 'Add Wollastonite (NYAD 400)' }).click();
  await expect(tries.locator('.try-list')).toContainText('Wollastonite (NYAD 400)');
  await expect(page.getByRole('button', { name: 'Materials to try (1)' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);
  await page.getByRole('button', { name: 'Work it out and compare' }).click();

  // How it was made, with the comparison: what each material supplies.
  const report = page.locator('.swap-report');
  await expect(report.getByRole('heading', { name: 'How the new recipe was made' })).toBeVisible();
  const feldspar = report.locator('.swap-uses li', { hasText: /Feldspar|Spar/ }).first();
  await expect(feldspar).toContainText('the potash');
  const usedName = (await feldspar.locator('b').innerText()).trim();
  const report1 = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(report1.violations.map((v) => v.id + ': ' + v.help)).toEqual([]);

  // Leave it out: worked out again from the recipe as it was, without it.
  await feldspar.getByRole('button', { name: 'Leave out ' + usedName }).click();
  await expect(report.getByRole('heading', { name: 'How the new recipe was made' })).toBeFocused();
  await expect(report).toContainText('Left out: ' + usedName + '.');
  await expect(report.locator('.swap-uses li b', { hasText: usedName })).toHaveCount(0);
  await expect(page.locator('#compare-title')).toHaveText('Untitled recipe and Untitled recipe with modern materials');

  // Allowed again, the first choice comes back.
  await report.getByRole('button', { name: 'Allow them again' }).click();
  await expect(report.locator('.swap-uses li b', { hasText: usedName })).toHaveCount(1);

  // Under Materials too, once back at the recipe; Undo puts the old recipe back.
  await page.getByRole('button', { name: 'Back to the recipe' }).click();
  await expect(page.locator('.recipe-swap .swap-report')).toContainText(usedName);
  await page.getByRole('button', { name: 'Undo the swap' }).click();
  await expect(amount(page, 'Niter')).toHaveValue('10');
  await expect(page.locator('.swap-report')).toHaveCount(0);
});

test('makes a recipe from what is on hand, kept with the account for next time', async ({ page }) => {
  await page.locator('#recipe-name').fill('Celadon');
  for (const [name, amount] of OLD_CELADON) await addStandardMaterial(page, name, amount);
  await page.getByRole('button', { name: 'Match with what I have' }).click();
  await expect(page.getByRole('heading', { name: 'Make it from what you have' })).toBeFocused();

  // What is on hand: this recipe's materials but the Custer, and Minspar instead.
  await page.getByRole('button', { name: 'Add the materials in this recipe' }).click();
  const onHand = page.locator('.recipe-shelf .try-list');
  await expect(onHand.locator('li')).toHaveCount(4);
  await expect(page.locator('.recipe-shelf-status')).toHaveText('Saved with your account.');
  await page.getByRole('button', { name: 'Remove Custer Spar from your materials on hand' }).click();
  const library = page.locator('.recipe-shelf .library');
  await library.getByRole('button', { name: /^Standard/ }).click();
  await library.getByRole('searchbox').fill('minspar');
  await library.getByRole('button', { name: 'Add Minspar 200' }).click();
  await expect(onHand).toContainText('Minspar 200');
  await expect(onHand).not.toContainText('Custer Spar');
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);

  await page.getByRole('button', { name: 'Match and compare' }).click();
  await expect(page.getByRole('heading', { name: 'Compare two recipes' })).toBeFocused();
  await expect(page.locator('#compare-title')).toHaveText('Celadon and Celadon from what I have');
  await expect(page.locator('.swap-report')).toContainText('Minspar 200');
  await page.getByRole('button', { name: 'Back to the recipe' }).click();
  await expect(amount(page, 'Custer Spar')).toHaveCount(0);
  await expect(amount(page, 'Minspar 200')).toHaveCount(1);

  // Kept with the account: there again after a reload.
  await page.reload();
  await addStandardMaterial(page, 'Silica', 30);
  await page.getByRole('button', { name: 'Match with what I have' }).click();
  await expect(onHand).toContainText('Minspar 200');
  await expect(onHand.locator('li')).toHaveCount(4);
});
