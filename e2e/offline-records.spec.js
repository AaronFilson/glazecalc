const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const API = 'http://localhost:' + (process.env.E2E_PORT || '3100') + '/api';

// Offline stage 3 (docs/adr/0028-service-worker.md, core/offline-records.ts): a signed-in user's records kept on
// the device when they turn it on, editable offline (changes wait: e2e/offline-edits.spec.js), and deleted only by the person (signing out, signing in as
// someone else, turning it off); a sign-in that runs out or a closed browser deletes nothing. The service worker is
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
        // Each account's copy is under '<userId>/recipe'; 'current' names the one shown.
        const store = db.transaction('copies').objectStore('copies');
        const current = store.get('current');
        current.onsuccess = () => {
          if (!current.result) {
            db.close();
            return resolve(null);
          }
          const get = store.get(current.result + '/recipe');
          get.onsuccess = () => {
            db.close();
            // Each copy is kept as { body, savedAt } (core/offline-records.ts).
            const body = get.result?.body;
            resolve(Array.isArray(body) ? body.map((r) => r.title) : null);
          };
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
  const box = page.getByLabel('Keep my records on this device so they open without internet');
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(box).toBeChecked();
};

/** Signs in through the sign-in page, without "Keep me signed in" (a sign-in that ends with the browser). */
const signInThroughPage = async (page, email) => {
  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
};

/** An account made in another browser context, so this one is not signed in to it. */
const newAccount = async (request, label) => {
  const email = label + '-' + Date.now() + '-' + process.pid + '@test.com';
  const res = await request.post(API + '/signup', { data: { email, password: 'password123' } });
  expect(res.ok()).toBe(true);
  return email;
};

const banner = (page) =>
  page.getByRole('status').filter({ hasText: "Glazecalc can't be reached. Showing the copy saved on this device" });
const notSaved = (page) => page.getByRole('status').filter({ hasText: 'Your records are not saved on this device' });

test('turned on, a recipe opens with no network, with the banner', async ({ page, context }) => {
  await signUpAndSignIn(page);
  const id = await savedRecipe(page, 'Offline Celadon');
  await installed(page, '/recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Offline Celadon']);
  await page.goto('/recipe?open=' + id);
  await expect(page.locator('#recipe-name')).toHaveValue('Offline Celadon');

  await context.setOffline(true);
  await page.reload();
  // The worker runs the page. Left to it, an /api request with no network gets its made-up 504 (what an installed
  // app on a phone gets); the app's requests go past it (ngsw-bypass), so they fail as the network does.
  expect(await page.evaluate(() => Boolean(globalThis.navigator.serviceWorker.controller))).toBe(true);
  const viaWorker = await page.evaluate(async () => (await fetch('/api/recipe/getAll')).status);
  expect(viaWorker).toBe(504);
  await expect(page.locator('#recipe-name')).toHaveValue('Offline Celadon');
  await expect(banner(page)).toBeVisible();
  // Saving is on: an offline save waits on the device and is sent later (e2e/offline-edits.spec.js).
  const save = page.locator('.recipe-save').getByRole('button', { name: 'Save', exact: true });
  await expect(save).not.toHaveAttribute('aria-disabled', 'true');
});

test('the notes, firing, material and additive pages still save and remove while the copy is shown', async ({
  page,
  context
}) => {
  await signUpAndSignIn(page);
  for (const [path, data] of [
    [
      '/notes/create',
      { title: 'Kept Note', content: 'Glaze test', relatedCollection: 'Notes', relatedId: 'general notes' }
    ],
    ['/firing/create', { title: 'Kept Firing', fieldsIncluded: ['Time', 'Cone'], rows: [['9:00', '6 down']] }]
  ]) {
    expect((await page.request.post(API + path, { data })).ok()).toBe(true);
  }
  await installed(page, '/notes');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual([]);
  // Each page once online, so its code and messages are on the device too.
  for (const path of ['/material', '/additive', '/firing', '/notes']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
  }
  await context.setOffline(true);

  await page.goto('/notes');
  await expect(page.getByText('Kept Note')).toBeVisible();
  await expect(banner(page)).toBeVisible();
  // Saving and removing are on: offline they wait on the device (e2e/offline-edits.spec.js).
  await expect(page.getByRole('button', { name: 'Save', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
  const remove = page.getByRole('button', { name: 'Remove Kept Note' });
  await expect(remove).not.toHaveAttribute('aria-disabled', 'true');
  await remove.click();
  await expect(page.getByRole('button', { name: 'Yes, remove' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.goto('/firing');
  await expect(page.getByText('Kept Firing').first()).toBeVisible();
  await expect(page.locator('button[form="firing-form"]')).not.toHaveAttribute('aria-disabled', 'true');
  // Linking a recipe to a log needs the network.
  await page.goto('/material');
  await expect(page.locator('form').getByRole('button', { name: 'Save', exact: true })).not.toHaveAttribute(
    'aria-disabled',
    'true'
  );
  await page.goto('/additive');
  await expect(page.locator('form').getByRole('button', { name: 'Save', exact: true })).not.toHaveAttribute(
    'aria-disabled',
    'true'
  );
});

test("read-only is the page's: back online the bar offers Reload, and the next page saves", async ({
  page,
  context
}) => {
  await signUpAndSignIn(page);
  await savedRecipe(page, 'Back Online Recipe');
  await installed(page, '/notes');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Back Online Recipe']);
  for (const path of ['/about', '/recipe']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  const backOnline = page.locator('.offline-records-back');
  const notesSave = () => page.locator('main').getByRole('button', { name: 'Save', exact: true });

  // Offline on the recipe page, then the network comes back: the bar offers to reload.
  await context.setOffline(true);
  await page.reload();
  await expect(banner(page)).toBeVisible();
  await context.setOffline(false);
  await expect(backOnline).toBeVisible();
  await expect(backOnline).toContainText('You are back online.');
  // Opening Notes (in the app, not a new load): it loads fresh, so it saves and shows no bar.
  await page.locator('header a[href="/notes"]').first().click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('.offline-records-bar')).toHaveCount(0);
  await expect(notesSave()).not.toHaveAttribute('aria-disabled', 'true');

  // Offline on Notes, then back: Reload loads it again and saving is on.
  await context.setOffline(true);
  await page.reload();
  await expect(banner(page)).toBeVisible();
  await context.setOffline(false);
  await expect(backOnline).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).include('.offline-records-back').withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);
  await backOnline.getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.locator('.offline-records-bar')).toHaveCount(0);
  await expect(notesSave()).not.toHaveAttribute('aria-disabled', 'true');
});

test('a sign-in without "Keep me signed in": once the browser is closed, an offline start still shows the copy', async ({
  page,
  context,
  request
}) => {
  const email = await newAccount(request, 'session-only');
  await installed(page, '/about');
  await signInThroughPage(page, email);
  const id = await savedRecipe(page, 'Session Only Recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Session Only Recipe']);
  // The recipe page once online, so its code and messages are on the device too.
  await page.goto('/recipe?open=' + id);
  await expect(page.locator('#recipe-name')).toHaveValue('Session Only Recipe');

  // Closing the browser ends the session cookie and this browser session's storage; the rest stays.
  await context.setOffline(true);
  await context.clearCookies();
  await page.evaluate(() => globalThis.sessionStorage.clear());
  await page.goto('/recipe?open=' + id);
  // The person's work is not deleted behind their back (owner decision 2026-11-03): the copy stays and is read.
  await expect(page.locator('#recipe-name')).toHaveValue('Session Only Recipe');
  await expect(banner(page)).toBeVisible();
  expect(await hasCopy(page)).toBe(true);
  expect(await copiedTitles(page)).toEqual(['Session Only Recipe']);
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

test('signing out offline and choosing Delete from this device deletes the copy; the next user never sees it', async ({
  page,
  context,
  request
}) => {
  const first = await newAccount(request, 'first');
  const second = await newAccount(request, 'second');
  await installed(page, '/about');
  await signInThroughPage(page, first);
  await savedRecipe(page, 'First User Recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['First User Recipe']);

  // Offline sign-out.
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Delete from this device' }).click();
  await expect.poll(() => hasCopy(page)).toBe(false);
  expect(await page.evaluate(() => globalThis.localStorage.getItem('offlineRecords'))).toBeNull();
  await context.setOffline(false);

  // A second user signs in on the same browser, through the sign-in page.
  await signInThroughPage(page, second);
  await page.goto('/recipe');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('First User Recipe')).toHaveCount(0);
  expect(await hasCopy(page)).toBe(false);
});

test("signing in as someone else without signing out first locks the first user's copy away", async ({
  page,
  request
}) => {
  const first = await newAccount(request, 'first');
  const second = await newAccount(request, 'second');
  await installed(page, '/about');
  await signInThroughPage(page, first);
  await savedRecipe(page, 'Not For B');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Not For B']);
  // The sign-in page, opened while still signed in.
  await signInThroughPage(page, second);
  // Kept for the first user, but no longer the copy shown, and the switch is off for the second.
  await expect.poll(() => copiedTitles(page)).toBeNull();
  expect(await hasCopy(page)).toBe(true);
  expect(await page.evaluate(() => globalThis.localStorage.getItem('offlineRecords'))).toBe('locked');
  await page.goto('/recipe');
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.getByText('Not For B')).toHaveCount(0);

  // The first user comes back: their copy is shown again.
  await signInThroughPage(page, first);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Not For B']);
  expect(await page.evaluate(() => globalThis.localStorage.getItem('offlineRecords'))).toBe('1');
});

test('signing out online and choosing Delete from this device deletes the copy before the sign-in page', async ({
  page,
  context
}) => {
  await signUpAndSignIn(page);
  await savedRecipe(page, 'Online Sign Out');
  await installed(page, '/recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Online Sign Out']);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Delete from this device' }).click();
  await expect.poll(() => hasCopy(page)).toBe(false);
  await context.setOffline(true);
  await page.reload().catch(() => null);
  expect(await hasCopy(page).catch(() => false)).toBe(false);
});

test('an account deleted elsewhere: the sign-in ends but the copy stays until the person clears it', async ({
  page
}) => {
  await signUpAndSignIn(page);
  await savedRecipe(page, 'Deleted Account');
  await installed(page, '/recipe');
  await turnOn(page);
  await expect.poll(() => copiedTitles(page), { timeout: 30_000 }).toEqual(['Deleted Account']);
  const me = await (await page.request.get(API + '/verify')).json();
  const gone = await page.request.delete(API + '/deleteuser/' + me.id, { data: { password: 'password123' } });
  expect(gone.ok()).toBe(true);
  await page.goto('/about');
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
  expect(await hasCopy(page)).toBe(true);
  expect(await copiedTitles(page)).toEqual(['Deleted Account']);
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
