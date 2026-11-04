const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { API, addMaterial, addStandardMaterial, signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Offline editing, phase 3 (core/outbox.ts, core/outbox-conflict.dialog.ts): changes made while the network is gone
// wait on the device with a "Waiting to save" mark, go out in order once it is back, and a record that moved on
// meanwhile is not written over: notes are merged, other records ask. The service worker is allowed, as in
// offline-records.spec.js, so a reload with no network has the app.
test.use({ serviceWorkers: 'allow', viewport: { width: 1280, height: 800 } });
test.describe.configure({ timeout: 180_000 });

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

const turnOn = async (page) => {
  await page.goto('/account');
  const box = page.getByLabel('Keep my records on this device so they open without internet');
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(box).toBeChecked();
};

/** The titles in the copy of one collection (the records' titles, or names for materials), or null. */
const copied = (page, key, field = 'title') =>
  page.evaluate(
    async ([name, prop]) => {
      if (!(await globalThis.indexedDB.databases()).some((db) => db.name === 'gc-records')) return null;
      return new Promise((resolve) => {
        const opening = globalThis.indexedDB.open('gc-records');
        opening.onsuccess = () => {
          const db = opening.result;
          if (!db.objectStoreNames.contains('copies')) {
            db.close();
            return resolve(null);
          }
          const get = db.transaction('copies').objectStore('copies').get(name);
          get.onsuccess = () => {
            db.close();
            const body = get.result?.body;
            resolve(Array.isArray(body) ? body.map((r) => r[prop]) : null);
          };
        };
        opening.onerror = () => resolve(null);
      });
    },
    [key, field]
  );

/** Each page once online, so its code and messages are on the device too. */
const visit = async (page, paths) => {
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
};

const status = (page, text) => page.getByRole('status').filter({ hasText: text });
const getAll = async (page, area) => (await (await page.request.get(API + '/' + area + '/getAll')).json()) ?? [];

// Adds an oxide with the oxide picker and enters its amount (as e2e/materials.spec.js does).
const addOxide = async (page, oxide, amount) => {
  await page.locator('select[name="firedox-select"]').selectOption(oxide);
  await page.getByRole('button', { name: 'Add the oxide to the list' }).click();
  const row = page.locator('li', {
    has: page.locator('b', { hasText: new RegExp('^' + oxide.replace(/(\d+)/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d] ?? d) + '$') })
  });
  await row.locator('input.oxide-amount').fill(String(amount));
};

/** A recipe saved online through the page, with the materials of a simple matte. */
const savedRecipe = async (page, title) => {
  await page.goto('/recipe');
  await expect(page.locator('.library', { hasText: 'Add materials' })).toContainText('Standard (');
  await page.locator('#recipe-name').fill(title);
  for (const [name, grams] of [
    ['Orthoclase', 40],
    ['Silica', 20],
    ['Whiting', 10]
  ])
    await addStandardMaterial(page, name, grams);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved at');
  const mine = (await getAll(page, 'recipe')).find((recipe) => recipe.title === title);
  expect(mine).toBeTruthy();
  return mine._id;
};

/** A signed-in browser with the copy turned on and the pages the test uses kept. */
const keepingCopy = async (page, paths) => {
  await signUpAndSignIn(page);
  await installed(page, '/notes');
  await turnOn(page);
  await visit(page, paths);
};

test('a note saved offline waits with a mark and a count, then goes out when the network is back', async ({
  page,
  context
}) => {
  await keepingCopy(page, ['/notes']);
  await context.setOffline(true);
  await page.goto('/notes');
  await page.locator('#title').fill('Offline Note');
  await page.locator('#content').fill('Written with no network');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Offline Note')).toBeVisible();
  await expect(page.locator('.pending-badge')).toHaveText('Waiting to save');
  await expect(status(page, '1 change waiting to save')).toBeVisible();
  // Save was not turned off by the copy being shown.
  await expect(page.getByRole('button', { name: 'Save', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
  expect((await getAll(page, 'notes')).length).toBe(0);

  await context.setOffline(false);
  await expect(status(page, 'Your offline changes are saved.')).toBeVisible();
  await expect(page.locator('.pending-badge')).toHaveCount(0);
  await expect.poll(async () => (await getAll(page, 'notes')).map((n) => n.title)).toEqual(['Offline Note']);
  const { violations } = await new AxeBuilder({ page }).include('.offline-records-bar').withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);
});

test('a material made offline and used in a new recipe goes out first, and the recipe has the real id', async ({
  page,
  context
}) => {
  await keepingCopy(page, ['/material', '/recipe']);
  await context.setOffline(true);
  await page.goto('/material');
  await page.locator('#material-name').fill('Offline Spar');
  await addOxide(page, 'K2O', 1);
  await addOxide(page, 'SiO2', 4);
  await page.locator('#LOI').fill('0');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.server-msg')).toContainText('Material added');
  await expect(page.locator('.pending-badge').first()).toHaveText('Waiting to save');

  // In the app, not a new load: the recipe page reads the copy, which already has the material.
  await page.locator('header a[href="/recipe"]').first().click();
  await expect(page).toHaveURL(/\/recipe$/);
  await page.locator('#recipe-name').fill('Offline Recipe');
  await addMaterial(page, 'Offline Spar', 10, 'My materials');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved at');
  await expect(status(page, '2 changes waiting to save')).toBeVisible();

  await context.setOffline(false);
  await expect(status(page, 'Your offline changes are saved.')).toBeVisible();
  const materials = await getAll(page, 'materials');
  expect(materials.map((m) => m.name)).toEqual(['Offline Spar']);
  const recipes = await getAll(page, 'recipe');
  expect(recipes.map((r) => r.title)).toEqual(['Offline Recipe']);
  expect(JSON.stringify(recipes[0].materials)).toContain(materials[0]._id);
  expect(JSON.stringify(recipes)).not.toContain('tmp:');
});

test('a recipe changed elsewhere while edited offline asks: Save mine as a copy is the default and keeps both', async ({
  page,
  context
}) => {
  await keepingCopy(page, ['/recipe']);
  const id = await savedRecipe(page, 'Celadon');
  await visit(page, ['/recipe?open=' + id]);
  await expect.poll(() => copied(page, 'recipe')).toEqual(['Celadon']);

  // Someone (another device, an assistant) changes the recipe on the server.
  const changed = await page.request.put(API + '/recipe/change/' + id, {
    data: { recipe: { notes: 'Changed elsewhere' } }
  });
  expect(changed.ok()).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#recipe-name')).toHaveValue('Celadon');
  await page.locator('#recipe-name').fill('Celadon edited offline');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved at');
  await expect(status(page, '1 change waiting to save')).toBeVisible();

  await context.setOffline(false);
  const dialog = page.getByRole('alertdialog', { name: 'Your offline change needs a decision' });
  await expect(dialog).toBeVisible();
  const copy = dialog.getByRole('button', { name: 'Save mine as a copy' });
  await expect(copy).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Keep mine' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep theirs' })).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).include('[role="alertdialog"]').withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);

  await copy.click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(async () => (await getAll(page, 'recipe')).map((r) => r.title).sort())
    .toEqual(['Celadon', 'Celadon edited offline (offline copy)']);
  const original = (await getAll(page, 'recipe')).find((r) => r._id === id);
  expect(JSON.stringify(original.notes)).toContain('Changed elsewhere');
});

test('a note deleted offline is not deleted if it was changed elsewhere meanwhile', async ({ page, context }) => {
  await keepingCopy(page, ['/notes']);
  const made = await page.request.post(API + '/notes/create', {
    data: { title: 'Keep Me', content: 'First', relatedCollection: 'Notes', relatedId: 'general notes' }
  });
  const id = (await made.json())._id;
  await visit(page, ['/notes']);
  await expect.poll(() => copied(page, 'notes')).toEqual(['Keep Me']);
  expect((await page.request.put(API + '/notes/change/' + id, { data: { content: 'Edited elsewhere' } })).ok()).toBe(
    true
  );

  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Remove Keep Me' }).click();
  await page.getByRole('button', { name: 'Yes, remove' }).click();
  await expect(page.locator('.my-notes li')).toHaveCount(0);
  await expect(status(page, '1 change waiting to save')).toBeVisible();

  await context.setOffline(false);
  await expect(
    status(page, 'Keep Me was not removed: it was changed somewhere else after you removed it here.')
  ).toBeVisible();
  const notes = await getAll(page, 'notes');
  expect(notes.map((n) => n.content)).toEqual(['Edited elsewhere']);
});

test('a recipe in the Trash on the server: the edit offers Save as new, and makes the recipe again', async ({
  page,
  context
}) => {
  await keepingCopy(page, ['/recipe']);
  const id = await savedRecipe(page, 'Shino');
  await visit(page, ['/recipe?open=' + id]);
  await expect.poll(() => copied(page, 'recipe')).toEqual(['Shino']);
  expect((await page.request.delete(API + '/recipe/delete/' + id)).ok()).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#recipe-name')).toHaveValue('Shino');
  await page.locator('#recipe-name').fill('Shino again');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved at');

  await context.setOffline(false);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('no longer there');
  await expect(dialog.getByRole('button', { name: 'Save as new' })).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Discard my changes' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save as new' }).click();
  await expect.poll(async () => (await getAll(page, 'recipe')).map((r) => r.title)).toEqual(['Shino again']);
});

test('two tabs of the same browser send a queued change once', async ({ page, context }) => {
  await keepingCopy(page, ['/notes']);
  await context.setOffline(true);
  await page.goto('/notes');
  await page.locator('#title').fill('Once Only');
  await page.locator('#content').fill('Sent by one tab');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(status(page, '1 change waiting to save')).toBeVisible();
  const other = await context.newPage();
  await other.goto('/notes');
  await expect(status(other, '1 change waiting to save')).toBeVisible();

  let posts = 0;
  context.on('request', (request) => {
    if (request.method() === 'POST' && request.url() === API + '/notes/create') posts++;
  });
  await context.setOffline(false);
  await expect(status(page, 'Your offline changes are saved.')).toBeVisible();
  await expect.poll(async () => (await getAll(page, 'notes')).map((n) => n.title)).toEqual(['Once Only']);
  expect(posts).toBe(1);
});
