const { test, expect } = require('@playwright/test');
const { addColorant, addStandardMaterial, signUpAndSignIn } = require('./helpers');

const OLD_CELADON = [
  ['Custer Spar', 30],
  ['Silica', 30],
  ['Whiting', 20],
  ['EPK Kaolin', 20]
];

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
    'Swapped one for one: Custer Spar became G-200 EU Feldspar, EPK Kaolin became Wilco UPF Kaolin.'
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
