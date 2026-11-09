const { test, expect } = require('@playwright/test');
const { API } = require('./helpers');

// Round 17 offline follow-ups (core/offline-records.ts): the keep window the person chooses, "Not available
// offline" on pages that need the server, and an account deleted elsewhere (export, then clear only when chosen).
test.use({ serviceWorkers: 'allow', viewport: { width: 1280, height: 800 } });
test.describe.configure({ timeout: 180_000 });

const SWITCH = 'Keep my records on this device so they open without internet';

/** Waits until the worker runs the page and has kept the app, so the app can be used with no network. */
const installed = async (page, url) => {
  await page.goto(url);
  await expect
    .poll(() => page.evaluate(() => Boolean(globalThis.navigator.serviceWorker.controller)), { timeout: 60_000 })
    .toBe(true);
  const manifest = await (await page.request.get('/ngsw.json')).json();
  const wanted = manifest.assetGroups.find((group) => group.name === 'app').urls.length;
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const names = (await globalThis.caches.keys()).filter((name) => name.includes(':assets:app:cache'));
          const cache = names.length ? await globalThis.caches.open(names[0]) : null;
          return cache ? (await cache.keys()).length : 0;
        }),
      { timeout: 60_000 }
    )
    .toBeGreaterThanOrEqual(wanted);
};

const hasDatabase = (page) =>
  page.evaluate(async () => (await globalThis.indexedDB.databases()).some((db) => db.name === 'gc-records'));

/** A new account, signed in on the page (keeping the copy) and in `request` too. */
const keepingCopy = async (page, request, label) => {
  const email = label + '-' + Date.now() + '-' + process.pid + '@test.com';
  const res = await request.post(API + '/signup', { data: { email, password: 'password123' } });
  expect(res.ok()).toBe(true);
  await installed(page, '/about');
  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/account');
  await page.getByLabel(SWITCH).check();
  await expect(page.getByLabel(SWITCH)).toBeChecked();
  for (const path of ['/notes', '/trash', '/account']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  return email;
};

const dialog = (page) => page.getByRole('alertdialog');

test('the keep window: forever by default, chosen per account, kept after a reload', async ({ page, request }) => {
  await keepingCopy(page, request, 'keep');
  const select = page.getByLabel('Remove offline data if Glazecalc is not opened for');
  await expect(select).toHaveValue('');
  await expect(page.locator('#offline-keep-hint')).toContainText('never in the background');
  await select.selectOption({ label: '1 week' });
  await expect(select).toHaveValue('7');
  await page.reload();
  await expect(page.getByLabel('Remove offline data if Glazecalc is not opened for')).toHaveValue('7');
});

test('offline, the Trash says it is not available offline', async ({ page, context, request }) => {
  await keepingCopy(page, request, 'trash');
  await context.setOffline(true);
  await page.goto('/trash');
  await expect(page.getByText('Not available offline. Connect to the internet to see this.')).toBeVisible();
  await context.setOffline(false);
});

test('an account deleted elsewhere: asked, exported, and cleared only when chosen', async ({ page, request }) => {
  await keepingCopy(page, request, 'gone');
  // Another device deletes the account.
  const me = await (await request.get(API + '/verify')).json();
  const deleted = await request.delete(API + '/deleteuser/' + me.id, { data: { password: 'password123' } });
  expect(deleted.ok()).toBe(true);

  await page.goto('/notes');
  await expect(dialog(page)).toContainText('Your account was deleted');
  await expect(dialog(page).getByRole('button', { name: 'Export my offline data' })).toBeFocused();
  // Later keeps everything; the next open asks again.
  await dialog(page).getByRole('button', { name: 'Later' }).click();
  await expect(dialog(page)).toHaveCount(0);
  expect(await hasDatabase(page)).toBe(true);
  await page.goto('/about');
  await expect(dialog(page)).toContainText('Your account was deleted');

  const downloading = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: 'Export my offline data' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^glazecalc-offline-data-\d{4}-\d{2}-\d{2}\.json$/);
  const file = JSON.parse(require('node:fs').readFileSync(await download.path(), 'utf8'));
  expect(file.format).toBe('glazecalc-export');
  expect(file.account.id).toBe(me.id);
  await expect(dialog(page)).toContainText('The file was saved to your downloads.');
  expect(await hasDatabase(page)).toBe(true);
  await dialog(page).getByRole('button', { name: 'Delete from this device' }).click();
  await expect.poll(() => hasDatabase(page)).toBe(false);
  expect(await page.evaluate(() => globalThis.localStorage.getItem('offlineGone'))).toBeNull();
});
