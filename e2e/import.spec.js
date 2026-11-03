// "Import my data" on the account page: a file from one account's Download my
// data carried into another, and the same file again adding nothing.
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { API, signUpAndSignIn } = require('./helpers');

const MATERIAL = {
  name: 'Studio whiting',
  rawformula: 'CaCO3',
  fields: [{ name: 'CaO', amount: '1' }],
  equivalent: 100,
  formulaweight: 56,
  loi: 44,
  molecularweight: 100,
  percentmole: 'molecular'
};

test('carries an export into another account, with its links, and skips it the second time', async ({
  page,
  browser
}) => {
  await signUpAndSignIn(page);
  const material = await (await page.request.post(API + '/materials/create', { data: MATERIAL })).json();
  const recipe = await page.request.post(API + '/recipe/create', {
    data: {
      title: 'Imported satin',
      materials: [{ ...MATERIAL, _id: material._id, amount: '20' }]
    }
  });
  expect(recipe.ok()).toBeTruthy();
  await page.goto('/account');
  const saving = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download everything (JSON)' }).click();
  const file = await (await saving).path();
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).records.recipes).toHaveLength(1);

  // Another account, in a browser of its own.
  const other = await browser.newContext();
  const theirs = await other.newPage();
  await signUpAndSignIn(theirs);
  await theirs.goto('/account');
  await expect(theirs.getByRole('heading', { name: 'Import my data' })).toBeVisible();
  await theirs.setInputFiles('#import-file', file);
  const counts = theirs.locator('.import-counts');
  await expect(counts).toContainText('1 recipe: 1 to add, 0 already here');
  await expect(counts).toContainText('1 material: 1 to add');
  await theirs.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(theirs.getByRole('heading', { name: 'Import finished' })).toBeVisible();
  await expect(theirs.locator('.import-result')).toContainText('1 recipe: 1 added, 0 replaced, 0 skipped');

  // The recipe's ingredient is the new account's own material.
  const [mine] = await (await theirs.request.get(API + '/materials/getAll')).json();
  const [imported] = await (await theirs.request.get(API + '/recipe/getAll')).json();
  expect(imported.title).toBe('Imported satin');
  expect(imported.materials[0]._id).toBe(mine._id);
  expect(mine._id).not.toBe(material._id);

  // The same file again: everything is already here.
  await theirs.goto('/account');
  await theirs.setInputFiles('#import-file', file);
  await expect(theirs.locator('.import-counts')).toContainText('1 recipe: 0 to add, 1 already here');
  await expect(theirs.locator('.import-nothing')).toHaveText('Everything in this file is already here.');
  await other.close();
});
