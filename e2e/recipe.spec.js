const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const chemistry = require('../lib/chemistry');
const { API, addStandardMaterial, signUpAndSignIn } = require('./helpers');

const standard = {};
fs.readFileSync(path.join(__dirname, '..', 'materials.json'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
  .forEach((material) => standard[material.name] = material);

const DOLOMITE_MATTE = [['Orthoclase', 40], ['Silica', 20], ['Whiting', 10], ['Dolomite', 20], ['China Clay', 10]];
const LABELS = { K2O: 'K₂O', CaO: 'CaO', MgO: 'MgO', Al2O3: 'Al₂O₃', SiO2: 'SiO₂' };

const unitySection = (page) => page.locator('section.tech-info', { hasText: 'Unity formula of the glaze recipe' });

test.beforeEach(async ({ page, request }) => {
  await signUpAndSignIn(page, request);
  await page.goto('/#/recipe');
  // Wait for the standard materials to load into the picker.
  await expect(page.locator('select[name="std-mats"] option', { hasText: 'Dolomite' })).toHaveCount(1);
});

test('computes the unity formula of a dolomite matte', async ({ page }) => {
  for (const [name, amount] of DOLOMITE_MATTE) await addStandardMaterial(page, name, amount);
  await page.getByRole('button', { name: 'Compute recipe into Unity' }).click();

  const section = unitySection(page);
  // The old equivalent-weight bug reported MgO 0.194 for this recipe.
  await expect(section).toContainText('MgO : 0.279');
  const expected = chemistry.calculateUMF(DOLOMITE_MATTE.map(([name, amount]) => ({ material: standard[name], amount })));
  for (const oxide of Object.keys(LABELS)) {
    await expect(section).toContainText(new RegExp(LABELS[oxide] + '\\s*:\\s*' + expected.umf[oxide].toFixed(3)));
  }
  await expect(section).toContainText('Ratio of Silica to Alumina : ' + expected.siAlRatio.toFixed(2));
});

test('saves a recipe and shows its unity formula in the saved list', async ({ page }) => {
  await page.locator('#recipe-name').fill('Dolomite Matte');
  for (const [name, amount] of DOLOMITE_MATTE) await addStandardMaterial(page, name, amount);
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.server-msg')).toContainText('Recipe added');
  const saved = page.locator('section.tech-info', { hasText: 'My saved recipes:' }).locator('li', { hasText: 'Dolomite Matte' }).first();
  await saved.getByRole('button', { name: 'Expand to View' }).click();
  await expect(saved).toContainText('Dolomite : 20');
  await expect(saved).toContainText('MgO : 0.279');

  // The saved recipe is still there after a reload.
  await page.reload();
  await expect(page.locator('section.tech-info', { hasText: 'My saved recipes:' })).toContainText('Dolomite Matte');
});

test('saves the analysis of the amounts at save time, not at compute time', async ({ page }) => {
  await page.locator('#recipe-name').fill('Edited After Compute');
  for (const [name, amount] of DOLOMITE_MATTE) await addStandardMaterial(page, name, amount);
  await page.getByRole('button', { name: 'Compute recipe into Unity' }).click();
  await expect(unitySection(page)).toContainText('MgO : 0.279');

  // Remove the dolomite by setting it to zero, then save without recomputing.
  const dolomite = page.locator('li', { has: page.locator('b', { hasText: /^Dolomite$/ }) });
  await dolomite.locator('input.material-amount').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.server-msg')).toContainText('Recipe added');
  const saved = page.locator('li', { hasText: 'Edited After Compute' }).first();
  await saved.getByRole('button', { name: 'Expand to View' }).click();
  await expect(saved).not.toContainText('MgO');
});

test('uses my own materials and lists additives with the result', async ({ page, request }) => {
  // A user material saved through the API, as the materials page would.
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const myWhiting = { ...standard['Whiting'], name: 'My Whiting' };
  delete myWhiting._id;
  const res = await request.post(API + '/materials/create', { headers: { token }, data: myWhiting });
  expect(res.ok()).toBeTruthy();
  await page.reload();

  await page.locator('#recipe-name').fill('Mine');
  await page.locator('select[name="my-mats"]').selectOption({ label: 'My Whiting' });
  await page.getByRole('button', { name: 'Add my material to recipe' }).click();
  await expect(page.locator('input.material-amount')).toHaveCount(1);
  await page.locator('input.material-amount').fill('20');
  await addStandardMaterial(page, 'Silica', 30);
  await page.locator('select[name="std-adds"]').selectOption({ label: 'Cobalt carbonate' });
  await page.getByRole('button', { name: 'Add standard additive / colorant' }).click();
  await page.locator('input.additive-amount').fill('0.5');
  await page.getByRole('button', { name: 'Compute recipe into Unity' }).click();

  const section = unitySection(page);
  await expect(section).toContainText('CaO : 1.000');
  // Additives are listed but not part of the unity formula.
  await expect(section).toContainText('Cobalt carbonate : 0.5');
  await expect(section).not.toContainText('CoO');

  await page.getByRole('button', { name: 'Save' }).click();
  const saved = page.locator('.saved-recipe', { hasText: 'Mine' });
  await saved.getByRole('button', { name: 'Expand to View' }).click();
  await expect(saved).toContainText('My Whiting : 20');
  await expect(saved).toContainText('Cobalt carbonate : 0.5');
});

test('removes a material from the recipe and a saved recipe from the list', async ({ page }) => {
  await page.locator('#recipe-name').fill('Short lived');
  await addStandardMaterial(page, 'Whiting', 20);
  await addStandardMaterial(page, 'Dolomite', 10);
  await page.locator('li', { has: page.locator('b', { hasText: /^Dolomite$/ }) })
    .getByRole('button', { name: 'Remove from recipe' }).click();
  await expect(page.locator('.recipe-materials li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.saved-recipe', { hasText: 'Short lived' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove toggle' }).click();
  await page.locator('.saved-recipe', { hasText: 'Short lived' }).getByRole('button', { name: 'Remove from the server' }).click();
  await expect(page.locator('.server-msg')).toContainText('removing the recipe');
  await expect(page.locator('.saved-recipe', { hasText: 'Short lived' })).toHaveCount(0);
});

test('refuses to save a recipe with no flux', async ({ page }) => {
  await page.locator('#recipe-name').fill('Just Silica');
  await addStandardMaterial(page, 'Silica', 100);
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.errors-section')).toContainText('no flux');
  await expect(page.locator('.server-msg')).toHaveCount(0);
  await expect(page.locator('section.tech-info', { hasText: 'My saved recipes:' })).not.toContainText('Just Silica');
});

test('asks for an amount for every material', async ({ page }) => {
  await page.locator('select[name="std-mats"]').selectOption({ label: 'Whiting' });
  await page.getByRole('button', { name: 'Add standard material to recipe' }).click();
  await page.getByRole('button', { name: 'Compute recipe into Unity' }).click();

  await expect(page.locator('.errors-section')).toContainText('Invalid amount for material Whiting');
});
