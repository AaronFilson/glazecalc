// Removing a saved record: every list uses the same Remove button, which asks
// first in place. These run it on the materials page.
const { test, expect } = require('@playwright/test');
const standardData = require('../data');
const { API, signUpAndSignIn } = require('./helpers');

const WHITING = standardData.load('materials').find((material) => material.name === 'Whiting');

const saveMaterial = async (page, name) => {
  const material = { ...WHITING, name };
  delete material._id;
  const res = await page.request.post(API + '/materials/create', { data: material });
  expect(res.ok()).toBeTruthy();
};

const mine = (page) => page.locator('section', { hasText: 'My server materials:' });
const removeButton = (page, name) => page.getByRole('button', { name: 'Remove ' + name, exact: true });

test.beforeEach(async ({ page }) => {
  await signUpAndSignIn(page);
  await saveMaterial(page, 'Whiting, bag 1');
  await saveMaterial(page, 'Whiting, bag 2');
  await page.goto('/material');
  await expect(mine(page).locator('tr', { hasText: 'Whiting, bag 2' })).toBeVisible();
});

test('asks before removing; Cancel and Escape keep the record', async ({ page }) => {
  const row = mine(page).locator('tr', { hasText: 'Whiting, bag 1' });
  await removeButton(page, 'Whiting, bag 1').click();
  // Named by the question itself, so a screen reader reads all of it.
  const question = row.getByRole('group', { name: /^Remove "Whiting, bag 1"\? Saved recipes keep/ });
  await expect(question).toContainText(
    `Remove "Whiting, bag 1"? Saved recipes keep their own copy, so they won't change. This can't be undone.`
  );
  // It starts on the safe answer.
  await expect(question.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(question).toHaveCount(0);
  await expect(removeButton(page, 'Whiting, bag 1')).toBeFocused();

  await removeButton(page, 'Whiting, bag 1').click();
  await row.getByRole('button', { name: 'Cancel' }).click();
  await expect(question).toHaveCount(0);
  await page.reload();
  await expect(mine(page).locator('tr', { hasText: 'Whiting, bag 1' })).toBeVisible();
});

test('says why, in the question, when the server cannot remove it', async ({ page }) => {
  await page.route('**/api/materials/delete/**', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"msg":"The database is not answering."}' })
  );
  const row = mine(page).locator('tr', { hasText: 'Whiting, bag 1' });
  await removeButton(page, 'Whiting, bag 1').click();
  await row.getByRole('button', { name: 'Yes, remove' }).click();
  await expect(row.getByRole('alert')).toHaveText('The database is not answering.');
  await expect(row).toBeVisible();
  // The question is still open, to try again or cancel.
  await expect(row.getByRole('button', { name: 'Yes, remove' })).toBeVisible();
});

test('removes with the keyboard alone, and the focus moves on', async ({ page }) => {
  await removeButton(page, 'Whiting, bag 1').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Yes, remove' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.server-msg')).toContainText('Removed "Whiting, bag 1".');
  // On to the next record's Remove button, not back to the top of the page.
  await expect(removeButton(page, 'Whiting, bag 2')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.server-msg')).toContainText('Removed "Whiting, bag 2".');
  // The list goes with its last record, so the focus goes to the page's heading.
  await expect(mine(page)).toHaveCount(0);
  await expect(page.locator('h1')).toBeFocused();

  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await expect(mine(page)).toHaveCount(0);
});
