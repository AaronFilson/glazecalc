// The public reference pages: the cone chart, the list of standard materials and a page for each material
// (docs/seo-plan.md, item 17). In English only (lib/pages.js, ENGLISH_ONLY_PAGES), prerendered like the other
// public pages: what a search engine reads is in the HTML as sent, before any script runs.
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { MATERIAL_PAGES } = require('../lib/pages');

const NAMES = fs
  .readFileSync(path.join(__dirname, '..', 'data', 'materials.ndjson'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line).name);

// The canonical link of a page, at the site's address (the test server's own here).
const canonical = (address) => new RegExp(`<link rel="canonical" href="[^"]*${address}" />`);
const meta = (page, selector) => page.locator('head meta[' + selector + ']').getAttribute('content');
const jsonLd = async (page) =>
  (await page.locator('head script[type="application/ld+json"]').allTextContents()).map((text) => JSON.parse(text));
// The app sets data-app-ready on <html> once it has adopted the page and drawn once (client/app/app.ts).
const appStarted = (page) =>
  page.waitForFunction(() => globalThis.document.documentElement.hasAttribute('data-app-ready'));
const sideways = (page) =>
  page.evaluate(
    () => globalThis.document.documentElement.scrollWidth - globalThis.document.documentElement.clientWidth
  );

test.describe('the page of a standard material', () => {
  test('has its own title, description, canonical address and data, as sent', async ({ request }) => {
    const response = await request.get('/materials/ferro-frit-3134');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-language']).toBe('en');
    const html = await response.text();
    expect(html).toContain('<title>Ferro Frit 3134: oxide analysis and hazards - Glazecalc</title>');
    expect(html).toMatch(canonical('/materials/ferro-frit-3134'));
    expect(html).not.toContain('noindex');
    expect(html).not.toContain('hreflang');
    expect(html).toMatch(/<meta name="description" content="Ferro Frit 3134 in Glazecalc's standard library/);
    expect(html).toContain('"@type":"BreadcrumbList"');
    // The analysis and the hazards are in the HTML itself.
    expect(html).toContain('Weight %');
    expect(html).toContain('Non-hazardous glass powder per supplier SDS');
  });

  test('shows what the library has, with JavaScript off', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/materials/ferro-frit-3134');
    await expect(page.locator('h1')).toHaveText('Ferro Frit 3134');
    await expect(page.locator('main')).toContainText('Vibrantz Technologies');
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(5);
    await expect(rows.first()).toContainText('SiO₂');
    await expect(rows.first()).toContainText('45.56');
    await expect(rows.first()).toContainText('1.482');
    await expect(page.getByRole('link', { name: 'Safe mixing and ventilation' })).toHaveAttribute(
      'href',
      '/guides/safe-mixing'
    );
    await expect(page.getByRole('link', { name: "Don't poison your family" })).toHaveAttribute(
      'href',
      '/guides/home-safety'
    );
    await expect(page.getByRole('link', { name: 'Open the recipe calculator' })).toHaveAttribute('href', '/recipe');
    await context.close();
  });

  test('is a web page with a trail, whose data is read after the app starts as before it', async ({ page }) => {
    await page.goto('/materials/silica');
    await expect(page.locator('h1')).toHaveText('Silica');
    await appStarted(page);
    const [data] = await jsonLd(page);
    expect(data['@graph'][0]).toMatchObject({
      '@type': 'WebPage',
      name: 'Silica: oxide analysis and hazards',
      url: 'https://glazecalcapp.com/materials/silica',
      inLanguage: 'en'
    });
    expect(data['@graph'][1].itemListElement.map((item) => item.item)).toEqual([
      'https://glazecalcapp.com/',
      'https://glazecalcapp.com/materials',
      'https://glazecalcapp.com/materials/silica'
    ]);
  });

  test('says a material has lead, and links the similar materials that have pages', async ({ page }) => {
    await page.goto('/materials/litharge');
    await expect(page.getByText('This material contains lead oxide (PbO).')).toBeVisible();
    await page.goto('/materials/ferro-frit-3134');
    await page.getByRole('link', { name: 'Fusion Frit F-12' }).click();
    await expect(page).toHaveURL(/\/materials\/fusion-frit-f-12$/);
    await expect(page.locator('h1')).toHaveText('Fusion Frit F-12');
    // Going between pages in the app keeps the head right.
    await expect(page).toHaveTitle('Fusion Frit F-12: oxide analysis and hazards - Glazecalc');
    expect(await meta(page, 'name="description"')).toContain('Fusion Frit F-12');
    expect(await jsonLd(page)).toHaveLength(1);
  });

  test('every description is a good length: 100 to 155 characters', async ({ request }) => {
    const bad = [];
    for (const address of MATERIAL_PAGES) {
      const html = await (await request.get(address)).text();
      const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
      if (description.length < 100 || description.length > 155) bad.push(address + ': ' + description.length);
    }
    expect(bad).toEqual([]);
  });

  test('an address that is no standard material is the not-found page', async ({ page, request }) => {
    expect((await request.get('/materials/no-such-material')).status()).toBe(404);
    await page.goto('/materials/no-such-material');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});

test.describe('the list of materials', () => {
  test('links the page of every standard material, with JavaScript off', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/materials');
    await expect(page.locator('h1')).toHaveText('Standard materials');
    await expect(page.locator('.material-list a')).toHaveCount(NAMES.length);
    const hrefs = await page
      .locator('.material-list a')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(new Set(hrefs)).toEqual(new Set(MATERIAL_PAGES));
    await expect(page.locator('main')).toContainText(`The ${NAMES.length} materials in Glazecalc's standard library`);
    await context.close();
  });

  test('is a collection page, apart from the signed-in page of your own materials', async ({ page, request }) => {
    const html = await (await request.get('/materials')).text();
    expect(html).toContain('<title>Standard glaze materials: analysis and hazards - Glazecalc</title>');
    expect(html).toMatch(canonical('/materials'));
    await page.goto('/materials');
    await expect(page.locator('h1')).toBeVisible();
    await expect.poll(async () => (await jsonLd(page))[0]['@graph'][0]['@type']).toBe('CollectionPage');
    // /material, which is for your own materials, still asks you to sign in first, and is never indexed.
    const own = await request.get('/material');
    expect(own.headers()['x-robots-tag']).toBe('noindex');
    await page.goto('/material');
    await expect(page).toHaveURL(/\/signin/);
  });

  test('opens a material from the list', async ({ page }) => {
    await page.goto('/materials');
    await page.getByRole('link', { name: 'Ferro Frit 3134', exact: true }).click();
    await expect(page).toHaveURL(/\/materials\/ferro-frit-3134$/);
    await expect(page.locator('h1')).toHaveText('Ferro Frit 3134');
  });
});

test.describe('the cone chart', () => {
  test("has Orton's and the SK cones with their temperatures, with JavaScript off", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/cones');
    await expect(page.locator('h1')).toHaveText('Cone chart: Orton and SK cones');
    const orton = page.locator('#orton ~ .guide-table-scroll').first();
    const ten = orton.locator('tbody tr', { has: page.getByRole('rowheader', { name: '10', exact: true }) });
    await expect(ten).toContainText('1305');
    await expect(ten).toContainText('2381');
    const sk = page.locator('#sk ~ .guide-table-scroll');
    await expect(sk.locator('tbody tr').first()).toContainText('600');
    await expect(sk.locator('caption')).toContainText('JIS R 8101');
    await expect(page.locator('main')).toContainText('Orton publishes no temperature for them');
    await context.close();
  });

  test('has its own title, description and canonical address, as sent', async ({ request }) => {
    const html = await (await request.get('/cones')).text();
    expect(html).toContain('<title>Cone chart: Orton and SK cone temperatures - Glazecalc</title>');
    expect(html).toMatch(canonical('/cones'));
    const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(155);
  });

  test('is linked from the firing guide, which a reader opens it from', async ({ page }) => {
    await page.goto('/guides/firing');
    await page.locator('nav.more-guides a[href="/cones"]').click();
    await expect(page).toHaveURL(/\/cones$/);
    await expect(page.locator('h1')).toHaveText('Cone chart: Orton and SK cones');
  });

  test('is a link in the guides list too, and the safety guides point to the materials', async ({ page }) => {
    await page.goto('/guides');
    await expect(page.locator('a.guide-card[href="/cones"]')).toBeVisible();
    await expect(page.locator('a.guide-card[href="/materials"]')).toBeVisible();
    await page.goto('/guides/safe-mixing');
    await expect(page.locator('nav.more-guides a[href="/materials"]')).toBeVisible();
  });
});

test.describe('in English only', () => {
  test("another language's address shows the English with its notice, and is not indexed", async ({
    page,
    request
  }) => {
    const html = await (await request.get('/de/materials/silica')).text();
    expect(html).toMatch(canonical('/materials/silica'));
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('hreflang');
    await page.goto('/de/materials/silica');
    await expect(page.locator('h1')).toHaveText('Silica');
    await expect(page.locator('main')).toContainText('This page is not translated yet, so it is shown in English.');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await page.goto('/ja/cones');
    await expect(page.locator('main')).toContainText('Cone chart: Orton and SK cones');
  });

  test('the guides list and the guides offer these pages in English alone', async ({ page }) => {
    await page.goto('/de/guides');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('a.guide-card[href="/de/cones"]')).toHaveCount(0);
    await page.goto('/de/guides/firing');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#see-also')).toHaveCount(0);
  });

  test('the sitemap lists each at its English address, once', async ({ request }) => {
    const map = await (await request.get('/sitemap.xml')).text();
    for (const address of ['/cones', '/materials', '/materials/ferro-frit-3134', '/materials/silica']) {
      expect(map).toMatch(new RegExp(`<url><loc>[^<]*${address}</loc></url>`));
      expect(map).not.toContain(`/de${address}</loc>`);
    }
    for (const address of MATERIAL_PAGES) {
      expect(map, address).toMatch(new RegExp(`<loc>[^<]*${address}</loc>`));
    }
  });
});

test.describe('on a phone, 320 px wide', () => {
  test.use({ viewport: { width: 320, height: 800 } });

  for (const address of [
    '/materials',
    '/cones',
    '/materials/ferro-frit-3134',
    '/materials/soda-feldspar-potclays-3427m-potterycrafts-p3317'
  ]) {
    test(`${address} does not scroll sideways`, async ({ page }) => {
      await page.goto(address);
      await expect(page.locator('h1')).toBeVisible();
      await appStarted(page);
      expect(await sideways(page)).toBeLessThanOrEqual(0);
      // A table too wide for the screen scrolls inside its own box, which a keyboard can reach.
      for (const box of await page.locator('.guide-table-scroll').all()) {
        await expect(box).toHaveAttribute('tabindex', '0');
      }
    });
  }
});

test.describe('hydration', () => {
  test('the app adopts each reference page where it is, with no mismatch and no early messages', async ({ page }) => {
    const problems = [];
    const early = [];
    let ready = false;
    page.on('console', (message) => {
      if (/NG050[0-7]/.test(message.text())) problems.push(message.text());
    });
    page.on('request', (request) => {
      if (!ready && request.url().includes('/i18n/')) early.push(request.url());
    });
    for (const address of ['/materials', '/cones', '/materials/ferro-frit-3134']) {
      ready = false;
      await page.goto(address);
      await expect(page.locator('h1')).toBeVisible();
      await appStarted(page);
      ready = true;
    }
    expect(problems).toEqual([]);
    expect(early).toEqual([]);
  });
});
