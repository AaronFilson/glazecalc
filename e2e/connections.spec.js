const { test, expect } = require('@playwright/test');
const { API, confirmedAccount } = require('./helpers');

// Connected apps (docs/integrations-plan.md, items 3 and 27): the account's
// access tokens with what each did, the Trash it filled, putting it all back,
// and revoking.

const makeToken = async (page, name, scope = 'data:write') => {
  const res = await page.request.post(API + '/tokens', {
    data: { name, days: 30, scope, password: 'password123' }
  });
  expect(res.status()).toBe(201);
  return (await res.json()).token;
};

test('shows what a token did, puts back what it moved to the Trash, and revokes it', async ({ page, request }) => {
  await confirmedAccount(page.request);
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  const token = await makeToken(page, 'Claude with changes');
  await makeToken(page, 'Just reading', 'data:read');
  const auth = { Authorization: 'Bearer ' + token };

  const names = ['Celadon', 'Tenmoku'];
  for (const title of names) {
    const made = await request.post(API + '/recipe/create', {
      headers: auth,
      data: { title, materials: [{ name: 'Silica', amount: '30' }] }
    });
    expect(made.status()).toBe(200);
    const removed = await request.delete(API + '/recipe/delete/' + (await made.json())._id, { headers: auth });
    expect(removed.status()).toBe(200);
  }

  // The token form stays on the account page, with a link to the list.
  await page.goto('/account');
  await page.locator('.tokens-section .see-apps').getByRole('link', { name: 'Open Connected apps' }).click();
  await expect(page).toHaveURL(/\/account\/apps$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Connected apps' })).toBeVisible();

  const row = page.locator('.connection-row', { hasText: 'Claude with changes' });
  await expect(row).toContainText('Read and change');
  await expect(row).toContainText('2 records made, 2 records moved to the Trash.');
  await expect(page.locator('.connection-row', { hasText: 'Just reading' })).toContainText(
    'It has not changed anything in the last 90 days.'
  );

  // Opened out: the Trash it filled, and what it did.
  await row.getByRole('button', { name: 'Show details of Claude with changes' }).click();
  await expect(row.locator('.moved-list > li')).toHaveCount(2);
  await expect(row.locator('.activity-list')).toContainText('Moved to the Trash: Tenmoku');

  // One back, then the rest.
  await row.getByRole('button', { name: 'Put back Celadon' }).click();
  await expect(page.locator('.server-msg')).toContainText('Celadon');
  await expect(row.locator('.moved-list > li')).toHaveCount(1);
  await row.getByRole('button', { name: 'Put all back' }).click();
  await expect(page.locator('.server-msg')).toContainText('1 record was put back from the Trash.');
  await expect(row.getByText('Nothing it moved is still in the Trash.')).toBeVisible();
  const recipes = await request.get(API + '/recipe/getAll', { headers: auth });
  expect((await recipes.json()).map((r) => r.title).sort()).toEqual(names);

  // Revoking asks first, and then the token stops working.
  await row.getByRole('button', { name: 'Revoke Claude with changes' }).click();
  await expect(row).toContainText('Revoke Claude with changes? It stops working at once.');
  await row.getByRole('button', { name: 'Yes, revoke' }).click();
  await expect(page.locator('.server-msg')).toContainText('The access token was revoked.');
  await expect(row.getByRole('button', { name: /^Revoke/ })).toHaveCount(0);
  expect((await request.get(API + '/recipe/getAll', { headers: auth })).status()).toBe(401);

  // Revoke all: the one left.
  await page.getByRole('button', { name: 'Revoke all', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, revoke' }).click();
  await expect(page.locator('.server-msg').last()).toContainText('1 access token was revoked.');
  await expect(page.getByRole('button', { name: 'Revoke all', exact: true })).toHaveCount(0);
});
