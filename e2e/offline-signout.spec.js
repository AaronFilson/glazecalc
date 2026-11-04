const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { API, signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Offline editing, phase 4 (core/offline-records.ts, core/offline-ask.ts): the copy and the changes waiting on the
// device are deleted only by the person. Signing out asks (Keep on this device is the default); "Clear offline data"
// and turning the copy off ask when changes are unsent; another account's copy and waiting changes are locked away,
// and nothing tells the account signed in that they are there. The service worker is allowed, as in offline-records.spec.js.
test.use({ serviceWorkers: 'allow', viewport: { width: 1280, height: 800 } });
test.describe.configure({ timeout: 180_000 });

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
const flag = (page) => page.evaluate(() => globalThis.localStorage.getItem('offlineRecords'));

const turnOn = async (page) => {
  await page.goto('/account');
  const box = page.getByLabel('Keep my records on this device so they open without internet');
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(box).toBeChecked();
};

const signInThroughPage = async (page, email) => {
  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
};

const newAccount = async (request, label) => {
  const email = label + '-' + Date.now() + '-' + process.pid + '@test.com';
  const res = await request.post(API + '/signup', { data: { email, password: 'password123' } });
  expect(res.ok()).toBe(true);
  return email;
};

const notes = async (page) => (await (await page.request.get(API + '/notes/getAll')).json()) ?? [];

/** Signs in as a new account, keeps the copy, and visits Notes and the account page while online. */
const keepingCopy = async (page, request, label) => {
  const email = await newAccount(request, label);
  await installed(page, '/about');
  await signInThroughPage(page, email);
  await turnOn(page);
  for (const path of ['/notes', '/account']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  return email;
};

/** A note saved with no network: it waits on the device. */
const offlineNote = async (page, context, title) => {
  await context.setOffline(true);
  await page.goto('/notes');
  await page.locator('#title').fill(title);
  await page.locator('#content').fill('Written with no network');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.pending-badge')).toHaveText('Waiting to save');
};

const dialog = (page) => page.getByRole('alertdialog');

test('signing out asks, names the unsent changes, defaults to Keep, and Cancel or Escape stays signed in', async ({
  page,
  context,
  request
}) => {
  await keepingCopy(page, request, 'ask');
  await offlineNote(page, context, 'Unsent Note');

  const signOut = page.getByRole('button', { name: 'Sign out', exact: true });
  await signOut.click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText('1 change you made offline has not been sent yet.');
  await expect(dialog(page).getByRole('button', { name: 'Keep on this device' })).toBeFocused();
  const { violations } = await new AxeBuilder({ page }).include('[role="alertdialog"]').withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);

  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(signOut).toBeVisible();
  await signOut.click();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(signOut).toBeVisible();
  expect(await flag(page)).toBe('1');
  await expect(page.locator('.pending-badge')).toHaveText('Waiting to save');
});

test('Keep on this device: the same person signing in again has the copy and the queue is sent', async ({
  page,
  context,
  request
}) => {
  const email = await keepingCopy(page, request, 'keep');
  await offlineNote(page, context, 'Kept Note');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Keep on this device' }).click();
  await expect(page).toHaveURL(/\/signin/);
  expect(await hasDatabase(page)).toBe(true);
  expect(await flag(page)).toBe('1');

  await context.setOffline(false);
  await signInThroughPage(page, email);
  await expect.poll(async () => (await notes(page)).map((n) => n.title), { timeout: 30_000 }).toEqual(['Kept Note']);
  expect(await flag(page)).toBe('1');
  await page.goto('/account');
  await expect(page.getByLabel('Keep my records on this device so they open without internet')).toBeChecked();
});

test('Delete from this device removes the copy and the unsent changes', async ({ page, context, request }) => {
  const email = await keepingCopy(page, request, 'delete');
  await offlineNote(page, context, 'Dropped Note');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Delete from this device' }).click();
  await expect(page).toHaveURL(/\/signin/);
  await expect.poll(() => hasDatabase(page)).toBe(false);
  expect(await flag(page)).toBeNull();

  await context.setOffline(false);
  await signInThroughPage(page, email);
  await page.waitForTimeout(1500);
  expect(await notes(page)).toEqual([]);
});

test("another account never sees the first one's data, nor learns that it is there", async ({
  page,
  context,
  request
}) => {
  await keepingCopy(page, request, 'first');
  const second = await newAccount(request, 'second');
  await offlineNote(page, context, 'Private Offline Note');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await dialog(page).getByRole('button', { name: 'Keep on this device' }).click();
  await expect(page).toHaveURL(/\/signin/);

  await context.setOffline(false);
  await signInThroughPage(page, second);
  await page.goto('/notes');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByText('Private Offline Note')).toHaveCount(0);
  expect(await notes(page)).toEqual([]);

  // Nothing on the account page says another account has anything here.
  await page.goto('/account');
  await expect(page.locator('#offline-records')).toBeVisible();
  await expect(page.locator('.offline-records')).not.toContainText('another account', { ignoreCase: true });
  await expect(page.locator('main')).not.toContainText('Private Offline Note');
  expect(await hasDatabase(page)).toBe(true);
});

test('Clear offline data and turning the copy off ask first when changes are unsent', async ({
  page,
  context,
  request
}) => {
  await keepingCopy(page, request, 'clear');
  await offlineNote(page, context, 'Clear Note');
  // Into the account page inside the app, so nothing is loaded from the network.
  await page.locator('a.account-link').click();
  await expect(page).toHaveURL(/\/account$/);

  const box = page.getByLabel('Keep my records on this device so they open without internet');
  await box.uncheck();
  await expect(dialog(page)).toContainText('1 change that has not been sent yet will be lost.');
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(box).toBeChecked();

  await page.getByRole('button', { name: 'Clear offline data' }).click();
  await expect(dialog(page)).toContainText('1 change that has not been sent yet will be lost.');
  await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  expect(await flag(page)).toBe('1');

  await page.getByRole('button', { name: 'Clear offline data' }).click();
  await dialog(page).getByRole('button', { name: 'Clear offline data' }).click();
  await expect(box).not.toBeChecked();
  await expect.poll(() => hasDatabase(page)).toBe(false);
  expect(await flag(page)).toBeNull();
  await context.setOffline(false);
  await page.waitForTimeout(1500);
  expect(await notes(page)).toEqual([]);
});

test('with no copy and nothing waiting, signing out asks nothing', async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/home');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/signin/);
  await expect(dialog(page)).toHaveCount(0);
});
