const { test, expect } = require('@playwright/test');
const { API, confirmedAccount } = require('./helpers');

// Confirm before changes (docs/adr/0025-confirm-before-changes.md): the
// setting on Connected apps, a token's change that waits (202), and the page
// where the person approves or declines it.

const makeToken = async (page, name, extra = {}) => {
  const res = await page.request.post(API + '/tokens', {
    data: { name, days: 30, scope: 'data:write', password: 'password123', ...extra }
  });
  expect(res.status()).toBe(201);
  return (await res.json()).token;
};

test('a removal waits for approval on its own page, and a decline changes nothing', async ({ page, request }) => {
  await confirmedAccount(page.request);
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  const token = await makeToken(page, 'Kiln script');
  const auth = { Authorization: 'Bearer ' + token };

  // The setting: off at first, then "Ask before removals", saved at once.
  await page.goto('/account/apps');
  await expect(page.getByRole('heading', { level: 2, name: 'Confirm before changes' })).toBeVisible();
  await expect(page.getByLabel('Never ask')).toBeChecked();
  await page.getByLabel('Ask before removals').check();
  await expect(page.locator('.server-msg')).toContainText('Saved.');

  const ask = async (title) => {
    const made = await request.post(API + '/recipe/create', {
      headers: auth,
      data: { title, materials: [{ name: 'Silica', amount: '30' }] }
    });
    // Making a record is no removal: made at once.
    expect(made.status()).toBe(200);
    const removed = await request.delete(API + '/recipe/delete/' + (await made.json())._id, { headers: auth });
    expect(removed.status()).toBe(202);
    return removed.json();
  };

  const first = await ask('Celadon');
  expect(first.url).toMatch(/\/confirm\/[\w-]{22}$/);
  await page.goto(new URL(first.url).pathname);
  await expect(page.getByRole('heading', { level: 1, name: 'Approve a change' })).toBeVisible();
  await expect(page.locator('.summary')).toHaveText('Move the recipe “Celadon” to the Trash.');
  await expect(page.locator('.from')).toContainText('Asked by Kiln script');
  // The Approve button is not where the focus is.
  const approve = page.getByRole('button', { name: 'Approve the change' });
  await expect(approve).not.toBeFocused();
  await approve.click();
  await expect(page.locator('.answer')).toHaveText('Done: the change was made.');
  const poll = await request.get(API + '/pending-changes/' + first.pendingId, { headers: auth });
  expect((await poll.json()).status).toBe('done');
  const after = await request.get(API + '/recipe/getAll', { headers: auth });
  expect((await after.json()).map((r) => r.title)).not.toContain('Celadon');

  const second = await ask('Tenmoku');
  await page.goto(new URL(second.url).pathname);
  await page.getByRole('button', { name: 'Decline' }).click();
  await expect(page.locator('.answer')).toHaveText('Nothing was changed: the person did not approve this change.');
  const kept = await request.get(API + '/recipe/getAll', { headers: auth });
  expect((await kept.json()).map((r) => r.title)).toContain('Tenmoku');

  // Opened again once decided: nothing waits there.
  await page.goto(new URL(second.url).pathname);
  await expect(page.locator('.missing')).toContainText('There is no change waiting at this address.');
});

test('approves all from one app, and a token made exempt is never asked', async ({ page, request }) => {
  await confirmedAccount(page.request);
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  const token = await makeToken(page, 'Notebook helper');
  const auth = { Authorization: 'Bearer ' + token };
  await page.goto('/account/apps');
  await page.getByLabel('Ask before every change').check();
  await expect(page.locator('.server-msg')).toContainText('Saved.');

  const asked = [];
  for (const title of ['One', 'Two', 'Three']) {
    const res = await request.post(API + '/notes/create', {
      headers: auth,
      data: { title, content: 'Test', relatedCollection: 'Notes', relatedId: 'general notes' }
    });
    expect(res.status()).toBe(202);
    asked.push(await res.json());
  }
  await page.goto(new URL(asked[0].url).pathname);
  await page.getByRole('button', { name: 'Also approve the 2 other changes waiting from Notebook helper' }).click();
  await expect(page.locator('.answer')).toContainText('2 changes were made.');
  const notes = await request.get(API + '/notes/getAll', { headers: auth });
  expect((await notes.json()).map((n) => n.title).sort()).toEqual(['One', 'Three', 'Two']);

  // Made with "Changes from this token need no confirmation" on the account page.
  await page.goto('/account');
  await page.locator('#token-name').fill('Trusted script');
  await page.locator('#token-scope-write').check();
  await page.getByLabel('Changes from this token need no confirmation').check();
  await page.locator('.tokens-section').getByRole('button', { name: 'Continue' }).click();
  await page.locator('#token-confirm-password').fill('password123');
  await page.getByRole('button', { name: 'Make the token' }).click();
  await expect(page.getByRole('heading', { name: 'Copy your new token now' })).toBeFocused();
  const shown = await page.locator('#new-token').inputValue();
  expect(shown).toMatch(/^glazecalc_pat_/);
  const direct = await request.post(API + '/notes/create', {
    headers: { Authorization: 'Bearer ' + shown },
    data: { title: 'Straight in', content: 'Test', relatedCollection: 'Notes', relatedId: 'general notes' }
  });
  expect(direct.status()).toBe(200);
  await page.goto('/account/apps');
  await expect(page.locator('.connection-row', { hasText: 'Trusted script' })).toContainText(
    'Its changes need no confirmation.'
  );
});

test('asks a visitor who is not signed in to sign in first', async ({ page }) => {
  await page.goto('/confirm/AAAAAAAAAAAAAAAAAAAAAA');
  await expect(page.locator('.signed-out')).toContainText('Sign in to Glazecalc with the account the change is for');
});
