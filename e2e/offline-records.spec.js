const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

const API = 'http://localhost:' + (process.env.E2E_PORT || '3100') + '/api';

// Offline stage 3 (docs/adr/0028-service-worker.md, core/offline-records.ts): a signed-in user's records kept on
// the device when they turn it on, read-only offline, and gone whenever the session ends. The service worker is
// allowed, as in offline.spec.js, so a reload with no network has the app.
test.use({ serviceWorkers: 'allow', viewport: { width: 1280, height: 800 } });
test.describe.configure({ timeout: 120_000 });

/** Waits until the worker runs the page and has kept the app, so a reload with no network can come from it. */
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

/** Whether the database of the copy exists (without opening it, which would make it). */
const hasCopy = (page) =>
  page.evaluate(async () => (await globalThis.indexedDB.databases()).some((db) => db.name === 'gc-records'));

/** The titles of the recipes in the copy, or null. */
const copiedTitles = (page) =>
  page.evaluate(async () => {
    if (!(await globalThis.indexedDB.databases()).some((db) => db.name === 'gc-records')) return null;
    return new Promise((resolve) => {
      const opening = globalThis.indexedDB.open('gc-records');
      opening.onsuccess = () => {
        const db = opening.result;
        if (!db.objectStoreNames.contains('copies')) {
          db.close();
          return resolve(null);
        }
        const get = db.transaction('copies').objectStore('copies').get('recipe');
        get.onsuccess = () => {
          db.close();
          resolve(Array.isArray(get.result) ? get.result.map((r) => r.title) : null);
        };
      };
      opening.onerror = () => resolve(null);
    });
  });

const savedRecipe = async (page, title) => {
  const res = await page.request.post(API + '/recipe/create', { data: { title, materials: [] } });
  expect(res.ok()).toBe(true);
  return (await res.json())._id;
};

const turnOn = async (page) => {
  await page.goto('/account');
  const box = page.getByLabel('Keep my records on this phone so they open without internet');
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(box).toBeChecked();
};

const banner = (page) => page.getByRole('status').filter({ hasText: 'You are offline. Showing the records saved' });
const notSaved = (page) => page.getByRole('status').filter({ hasText: 'Your records are not saved on this phone' });

test('turned on, a recipe opens with no network, read-only, with the banner', async ({ page, context }) => {
  await signUpAndSignIn(page);
  const id = await savedRecipe(page, 'Offline Celadon');
  await installed(page, '/recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Offline Celadon']);
  await page.goto('/recipe?open=' + id);
  await expect(page.locator('#recipe-name')).toHaveValue('Offline Celadon');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#recipe-name')).toHaveValue('Offline Celadon');
  await expect(banner(page)).toBeVisible();
  const save = page.locator('.recipe-save').getByRole('button', { name: 'Save', exact: true });
  await expect(save).toHaveAttribute('aria-disabled', 'true');
});

test('off by default: with no network the records are not there, and the page says so', async ({ page, context }) => {
  await signUpAndSignIn(page);
  const id = await savedRecipe(page, 'Not Kept');
  await installed(page, '/recipe');
  await page.goto('/recipe?open=' + id);
  await expect(page.locator('#recipe-name')).toHaveValue('Not Kept');
  expect(await hasCopy(page)).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await expect(notSaved(page)).toBeVisible();
  await expect(page.locator('#recipe-name')).not.toHaveValue('Not Kept');
});

test('signing out, online or offline, deletes the copy; the next user never sees it', async ({ page, context }) => {
  await signUpAndSignIn(page);
  await savedRecipe(page, 'First User Recipe');
  await installed(page, '/recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['First User Recipe']);

  // Offline sign-out.
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect.poll(() => hasCopy(page)).toBe(false);
  expect(await page.evaluate(() => globalThis.localStorage.getItem('offlineRecords'))).toBeNull();
  await context.setOffline(false);

  // A second user on the same browser.
  const email = 'second-' + Date.now() + '-' + process.pid + '@test.com';
  const res = await page.request.post(API + '/signup', { data: { email, password: 'password123' } });
  expect(res.ok()).toBe(true);
  await page.evaluate(() => globalThis.localStorage.setItem('session', 'account'));
  await page.goto('/recipe');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('First User Recipe')).toHaveCount(0);
  expect(await hasCopy(page)).toBe(false);
});

test('signing out online deletes the copy before the sign-in page', async ({ page, context }) => {
  await signUpAndSignIn(page);
  await savedRecipe(page, 'Online Sign Out');
  await installed(page, '/recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Online Sign Out']);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect.poll(() => hasCopy(page)).toBe(false);
  await context.setOffline(true);
  await page.reload().catch(() => null);
  expect(await hasCopy(page).catch(() => false)).toBe(false);
});

test('an account deleted elsewhere has its copy removed when this device next connects', async ({ page }) => {
  await signUpAndSignIn(page);
  await savedRecipe(page, 'Deleted Account');
  await installed(page, '/recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Deleted Account']);
  const me = await (await page.request.get(API + '/verify')).json();
  const gone = await page.request.delete(API + '/deleteuser/' + me.id, { data: { password: 'password123' } });
  expect(gone.ok()).toBe(true);
  await page.goto('/about');
  await expect.poll(() => hasCopy(page), { timeout: 30_000 }).toBe(false);
});

test('the banner shows in Arabic pages too, right to left', async ({ page, context }) => {
  await signUpAndSignIn(page);
  const id = await savedRecipe(page, 'Arabic Smoke');
  await installed(page, '/recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Arabic Smoke']);
  await page.goto('/ar/recipe?open=' + id);
  await expect(page.locator('#recipe-name')).toHaveValue('Arabic Smoke');
  // The Arabic messages are kept 4 s after the page loads (core/offline-languages.ts).
  await expect
    .poll(() => page.evaluate(() => globalThis.localStorage.getItem('offlineLanguage') ?? ''), { timeout: 60_000 })
    .toContain('"ar"');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#recipe-name')).toHaveValue('Arabic Smoke');
  await expect(page.locator('.offline-records-bar')).toBeVisible();
});
