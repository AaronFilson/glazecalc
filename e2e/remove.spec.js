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

const mine = (page) => page.locator('section', { hasText: 'My materials' });
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
    `Remove "Whiting, bag 1"? Saved recipes keep their own copy, so they won't change. You can put it back from the Trash for 30 days.`
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
  await expect(page.locator('.server-msg')).toContainText('Moved "Whiting, bag 1" to the Trash.');
  // On to the next record's Remove button, not back to the top of the page.
  await expect(removeButton(page, 'Whiting, bag 2')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.server-msg')).toContainText('Moved "Whiting, bag 2" to the Trash.');
  // The table goes with its last record, so the focus goes to the list's heading, which says it is empty.
  await expect(mine(page).locator('table')).toHaveCount(0);
  await expect(page.locator('#my-materials-heading')).toBeFocused();
  await expect(mine(page)).toContainText('None yet.');

  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await expect(mine(page)).toContainText('None yet.');
});

test('Undo puts a removed record back, and the Trash puts back or deletes for good', async ({ page }) => {
  await removeButton(page, 'Whiting, bag 1').click();
  await page.getByRole('button', { name: 'Yes, remove' }).click();
  const notice = page.locator('.server-msg li', { hasText: 'Moved "Whiting, bag 1" to the Trash.' });
  await notice.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('.server-msg')).toContainText('Put "Whiting, bag 1" back.');
  await expect(mine(page).locator('tr', { hasText: 'Whiting, bag 1' })).toBeVisible();

  // Both go to the Trash; one comes back from there, the other is deleted for good.
  for (const name of ['Whiting, bag 1', 'Whiting, bag 2']) {
    await removeButton(page, name).click();
    await page.getByRole('button', { name: 'Yes, remove' }).click();
    await expect(page.locator('.server-msg')).toContainText(`Moved "${name}" to the Trash.`);
  }
  await page.goto('/trash');
  const items = page.locator('.trash-list > li');
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText('Whiting, bag 2');
  await expect(items.first()).toContainText('Material');
  await page.getByRole('button', { name: 'Put back Whiting, bag 1' }).click();
  await expect(page.locator('.server-msg')).toContainText('Put "Whiting, bag 1" back where it was.');
  await expect(items).toHaveCount(1);
  await page.getByRole('button', { name: 'Remove Whiting, bag 2' }).click();
  await expect(page.getByRole('group', { name: /This can't be undone/ })).toBeVisible();
  await page.getByRole('button', { name: 'Yes, remove' }).click();
  await expect(page.locator('.trash-none')).toHaveText('The Trash is empty.');

  await page.goto('/material');
  await expect(mine(page).locator('tr', { hasText: 'Whiting, bag 1' })).toBeVisible();
  await expect(mine(page).locator('tr', { hasText: 'Whiting, bag 2' })).toHaveCount(0);
});
