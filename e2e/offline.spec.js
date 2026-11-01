const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { addStandardMaterial, signUpAndSignIn } = require('./helpers');

// The pages with no network (docs/adr/0028-service-worker.md): the service worker keeps the app and the offline
// page, the app keeps the reader's language and English. The only specs that allow a service worker
// (playwright.config.js blocks it elsewhere, which caches between steps).
test.use({ serviceWorkers: 'allow' });
test.describe.configure({ timeout: 120_000 });

/**
 * Opens a page and waits until the worker runs the page, has kept the app's files, and the app has kept the
 * messages and guides of its language, so that a reload with no network can come from them.
 */
const installed = async (page, url) => {
  await page.goto(url);
  await expect
    .poll(() => page.evaluate(() => Boolean(globalThis.navigator.serviceWorker.controller)), {
      timeout: 60_000
    })
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
  await expect
    .poll(() => page.evaluate(() => globalThis.localStorage.getItem('offlineLanguage')), { timeout: 60_000 })
    .not.toBeNull();
};

/** Every address in every cache of this site, with the bytes it holds. */
const kept = (page) =>
  page.evaluate(async () => {
    const files = [];
    for (const name of await globalThis.caches.keys()) {
      const cache = await globalThis.caches.open(name);
      for (const request of await cache.keys()) {
        const reply = await cache.match(request);
        files.push({ cache: name, path: new URL(request.url).pathname, bytes: (await reply.blob()).size });
      }
    }
    return files;
  });

test('the calculator opens with no network, and works out the unity formula', async ({ page, context }) => {
  await signUpAndSignIn(page);
  await installed(page, '/recipe');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.library', { hasText: 'Add materials' })).toContainText('Standard (');
  for (const [name, grams] of [
    ['Whiting', 30],
    ['Silica', 70]
  ]) {
    await addStandardMaterial(page, name, grams);
  }
  await expect(page.locator('.unity-panel')).toContainText('CaO : ');
  await expect(page.locator('.unity-panel')).toContainText('SiO₂ : ');
  await expect(page.locator('.recipe-total')).toHaveText('100');
});

test('a guide opens with no network in the reader’s language, and the others in it too', async ({ page, context }) => {
  await installed(page, '/de/guides/safe-mixing');
  const heading = await page.locator('h1').innerText();
  expect(heading).toMatch(/\S/);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText(heading);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  // A guide not opened before, from the files the app kept, and not the English one.
  await page.goto('/de/guides/firing');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('h1')).toBeVisible();
  // The guide is in German (this one names a kiln in its title), not the English it falls back to.
  await expect(page.locator('h1')).not.toHaveText(/kiln/i);
});

test('a language that is not on the phone says so with no network, and stays', async ({ page, context }) => {
  await installed(page, '/de/guides/safe-mixing');
  await context.setOffline(true);
  await page.reload();
  await page.locator('.footer-language summary').click();
  await page.locator('.footer-languages').getByRole('link', { name: 'Français' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'not saved on this phone' })).toBeVisible();
  await expect(page).toHaveURL(/\/de\/guides\/safe-mixing$/);
  // English and the reader’s own language are there.
  await page.locator('.footer-languages').getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/guides\/safe-mixing$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('Urdu keeps Nastaliq with no network once it has been fetched', async ({ page, context }) => {
  await installed(page, '/ur/about');
  // The font is fetched with the page and kept by the worker the next time (it was not running yet).
  await page.reload();
  await page.evaluate(() => globalThis.document.fonts.ready);
  await expect
    .poll(async () => (await kept(page)).some((file) => /noto-nastaliq-urdu-wght-normal/.test(file.path)))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText(/[؀-ۿ]/);
  await page.evaluate(() => globalThis.document.fonts.ready);
  const used = await page.evaluate(() =>
    [...globalThis.document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family)
  );
  expect(used.join()).toContain('Noto Nastaliq Served');
});

test('a page that signs in or holds an account is never answered from the phone', async ({ page, context }) => {
  await installed(page, '/guides');
  await context.setOffline(true);
  // The worker leaves these to the network, which is gone: the browser's error, or the worker's own 504, and never the app.
  for (const address of ['/signin', '/signup', '/account', '/de/signin', '/shared', '/api/verify']) {
    const response = await page.goto(address).catch(() => null);
    if (!response) continue;
    expect(response.status(), address).toBe(504);
    await expect(page.locator('gc-root'), address).toHaveCount(0);
  }
});

// A new version (docs/adr/0028-service-worker.md): the build's manifest, ngsw.json, on the server's disk is changed
// for a moment (its appData is part of its hash, so the worker takes it for a new version of the same files).
const MANIFEST = path.join(__dirname, '..', 'dist', 'glazecalc', 'browser', 'ngsw.json');
const withNewVersion = async (page, check) => {
  const original = fs.readFileSync(MANIFEST, 'utf8');
  try {
    fs.writeFileSync(MANIFEST, JSON.stringify({ ...JSON.parse(original), appData: { next: Date.now() } }));
    // What SwUpdate.checkForUpdate() sends the worker.
    await page.evaluate(() =>
      globalThis.navigator.serviceWorker.controller.postMessage({ action: 'CHECK_FOR_UPDATES', nonce: 1 })
    );
    await check();
  } finally {
    fs.writeFileSync(MANIFEST, original);
  }
};
const banner = (page) => page.getByRole('status').filter({ hasText: 'A new version of Glazecalc is ready' });

test('a new version waits in a banner, and Reload runs it', async ({ page }) => {
  await installed(page, '/guides');
  await withNewVersion(page, async () => {
    await expect(banner(page)).toBeVisible({ timeout: 30_000 });
    await banner(page).getByRole('button', { name: 'Reload' }).click();
  });
  await page.waitForLoadState('load');
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('a new version that is not wanted says nothing more, and the next page runs it', async ({ page }) => {
  await installed(page, '/guides');
  await withNewVersion(page, async () => {
    await expect(banner(page)).toBeVisible({ timeout: 30_000 });
    await banner(page).getByRole('button', { name: 'Not now' }).click();
    await expect(banner(page)).toHaveCount(0);
  });
  await page.goto('/about');
  await expect(page.locator('h1').first()).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('a new version waits while a recipe has changes not saved', async ({ page }) => {
  await signUpAndSignIn(page);
  await installed(page, '/recipe');
  await addStandardMaterial(page, 'Whiting', 100);
  await withNewVersion(page, async () => {
    // Long enough for the worker to fetch the manifest and say so.
    await page.waitForTimeout(5000);
    await expect(banner(page)).toHaveCount(0);
  });
});

test('the menu offers to install the app when the browser says it can be, and never asks by itself', async ({
  page
}) => {
  let dialogs = 0;
  page.on('dialog', () => dialogs++);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/about');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', '');
  const install = page.getByRole('button', { name: 'Install app' });
  await expect(install).toHaveCount(0);
  await page.evaluate(() => {
    const offer = new Event('beforeinstallprompt', { cancelable: true });
    offer.prompt = () => {
      globalThis.asked = (globalThis.asked ?? 0) + 1;
      return Promise.resolve();
    };
    globalThis.dispatchEvent(offer);
  });
  await expect(install).toBeVisible();
  expect(await page.evaluate(() => globalThis.asked)).toBeUndefined();
  await install.click();
  expect(await page.evaluate(() => globalThis.asked)).toBe(1);
  await expect(install).toHaveCount(0);
  expect(dialogs).toBe(0);
});

test('keeps nothing that is a person’s: no reply from the API, and little else', async ({ page }) => {
  const { email } = await signUpAndSignIn(page);
  await installed(page, '/recipe');
  await expect(page.locator('.library', { hasText: 'Add materials' })).toContainText('Standard (');
  const files = await kept(page);
  expect(files.filter((file) => file.path.startsWith('/api/'))).toEqual([]);
  for (const page_ of ['/account', '/signin', '/home', '/notes', '/shared']) {
    expect(files.filter((file) => file.path === page_)).toEqual([]);
  }
  expect(JSON.stringify(files)).not.toContain(email);
  // The app and one language and English, on a phone with little room.
  const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
  expect(bytes, 'bytes kept').toBeLessThan(3 * 1024 * 1024);
});
