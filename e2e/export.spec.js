// "Download my data" on the account page: the files it saves.
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { API, signUpAndSignIn } = require('./helpers');

const download = async (page, name) => {
  const saving = page.waitForEvent('download');
  await page.getByRole('link', { name }).click();
  const file = await saving;
  return { file, text: fs.readFileSync(await file.path(), 'utf8') };
};

test('saves everything as a JSON file, and recipes as CSV', async ({ page }) => {
  const { email } = await signUpAndSignIn(page);
  const saved = await page.request.post(API + '/notes/create', {
    data: { content: 'Remember the cone 6 test', relatedCollection: 'Notes', relatedId: 'general notes' }
  });
  expect(saved.ok()).toBeTruthy();
  const recipe = await page.request.post(API + '/recipe/create', {
    data: { title: 'Export glaze', materials: [{ name: 'Whiting', amount: '20' }] }
  });
  expect(recipe.ok()).toBeTruthy();

  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Download my data' })).toBeVisible();

  const everything = await download(page, 'Download everything (JSON)');
  expect(everything.file.suggestedFilename()).toMatch(/^glazecalc-data-\d{4}-\d\d-\d\d\.json$/);
  const data = JSON.parse(everything.text);
  expect(data.version).toBe(1);
  expect(data.account.email).toBe(email);
  expect(data.records.notes[0].content).toBe('Remember the cone 6 test');
  expect(data.records.recipes[0].title).toBe('Export glaze');
  expect(everything.text).not.toMatch(/tokenVersion|"password"/);

  const recipes = await download(page, 'Recipes (CSV)');
  expect(recipes.file.suggestedFilename()).toMatch(/^glazecalc-recipes-.*\.csv$/);
  expect(recipes.text).toContain('Export glaze');
  expect(recipes.text).toContain('Whiting,20');
});
