// What a search engine and a link preview read: each public page's own head and
// data, and (once the build prerenders them, docs/seo-plan.md) its content before
// any script runs, adopted in place by the app.
const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

const FIRING_DESCRIPTION =
  'How to fire an electric kiln: choose, place and read cones, and follow published schedules for bisque and glaze firings, with a cone chart.';
const SITE_DESCRIPTION = /^Enter a glaze recipe and see its unity formula/;
const PUBLIC_PAGES = [
  '/guides',
  '/guides/glazing-basics',
  '/guides/making-a-glaze',
  '/guides/safe-mixing',
  '/guides/home-safety',
  '/guides/firing',
  '/advice',
  '/about',
  '/privacy',
  '/signup'
];

const meta = (page, selector) => page.locator('head meta[' + selector + ']').getAttribute('content');
const jsonLd = async (page) =>
  (await page.locator('head script[type="application/ld+json"]').allTextContents()).map((text) => JSON.parse(text));
// The app sets data-app-ready on <html> once it has adopted the page and drawn once (client/app/app.ts).
const appStarted = (page) =>
  page.waitForFunction(() => globalThis.document.documentElement.hasAttribute('data-app-ready'));

test.describe('the head of each public page', () => {
  test('a guide has its own title, description and preview text', async ({ page }) => {
    await page.goto('/guides/firing');
    await expect(page).toHaveTitle('Firing a basic kiln - Glazecalc');
    await expect(page.locator('h1')).toHaveText('Firing a basic kiln');
    expect(await meta(page, 'name="description"')).toBe(FIRING_DESCRIPTION);
    expect(await meta(page, 'property="og:description"')).toBe(FIRING_DESCRIPTION);
    expect(await meta(page, 'property="og:title"')).toBe('Firing a basic kiln - Glazecalc');
  });

  test('each public page has a description of its own, 120 to 155 characters', async ({ page }) => {
    const seen = new Set();
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      // Once the app is up: the description is the page's own, as the app starts and after.
      await appStarted(page);
      const description = await meta(page, 'name="description"');
      expect(description, path).not.toMatch(SITE_DESCRIPTION);
      expect(description.length, path).toBeGreaterThanOrEqual(120);
      expect(description.length, path).toBeLessThanOrEqual(155);
      seen.add(description);
    }
    expect(seen.size).toBe(PUBLIC_PAGES.length);
  });

  test("starting the app never replaces a page's own description, nor its og:description, even for a moment", async ({
    page
  }) => {
    // Every value a description tag's content takes on, from the first moment the document exists.
    await page.addInitScript(() => {
      const seen = [];
      globalThis.__descriptions = seen;
      new globalThis.MutationObserver((records) => {
        for (const record of records) {
          const tag = record.target;
          const key = tag.getAttribute('name') ?? tag.getAttribute('property');
          if (key === 'description' || key === 'og:description') seen.push(key + ': ' + tag.getAttribute('content'));
        }
      }).observe(globalThis.document, { subtree: true, attributes: true, attributeFilter: ['content'] });
    });
    await page.goto('/guides/firing');
    await appStarted(page);
    expect(await meta(page, 'name="description"')).toBe(FIRING_DESCRIPTION);
    expect(await meta(page, 'property="og:description"')).toBe(FIRING_DESCRIPTION);
    // The head's tags are never written while the app starts, so the site's text never shows.
    const changes = await page.evaluate(() => globalThis.__descriptions);
    expect(changes.filter((change) => !change.endsWith(FIRING_DESCRIPTION))).toEqual([]);
  });

  test('the home page keeps the description of the whole site', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    expect(await meta(page, 'name="description"')).toMatch(SITE_DESCRIPTION);
  });

  // A language without a page's description shows its own site description, not English
  // (client/app/i18n/titles.spec.ts); every language now has every page's.
  test("a page in another language has its own description in that language, not English nor the site's", async ({
    page
  }) => {
    await page.goto('/de/');
    await expect(page.locator('h1')).toBeVisible();
    await appStarted(page);
    const site = await meta(page, 'name="description"');
    await page.goto('/de/guides/firing');
    await expect(page.locator('h1')).toBeVisible();
    await appStarted(page);
    const description = await meta(page, 'name="description"');
    expect(description).toMatch(/Elektroofen/);
    expect(description).not.toBe(site);
    expect(description).not.toBe(FIRING_DESCRIPTION);
    expect(await meta(page, 'property="og:description"')).toBe(description);
  });

  test('going from one page to another in the app keeps the description right', async ({ page }) => {
    await page.goto('/guides');
    await page
      .getByRole('link', { name: /Firing a basic kiln/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/guides\/firing$/);
    await expect(page.locator('h1')).toHaveText('Firing a basic kiln');
    expect(await meta(page, 'name="description"')).toBe(FIRING_DESCRIPTION);
  });
});

test.describe('structured data', () => {
  test('the home page says what the app is', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect.poll(() => jsonLd(page)).toHaveLength(1);
    const [graph] = await jsonLd(page);
    // The site's own home page names the site too (WebSite), for search results.
    expect(graph['@context']).toBe('https://schema.org');
    expect(graph['@graph'][0]).toEqual({ '@type': 'WebSite', name: 'Glazecalc', url: 'https://glazecalcapp.com/' });
    const data = graph['@graph'][1];
    expect(data).toMatchObject({
      '@type': 'WebApplication',
      name: 'Glazecalc',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { price: 0, priceCurrency: 'USD' },
      inLanguage: 'en',
      url: 'https://glazecalcapp.com/'
    });
    expect(data.description).toMatch(SITE_DESCRIPTION);
    // Another language's home page is a subdirectory, which Google does not read for the name.
    await page.goto('/de/');
    await expect.poll(async () => (await jsonLd(page)).map((block) => block['@type'])).toEqual(['WebApplication']);
  });

  test('a guide says what it is, in its language, and the block is data, not a script', async ({ page }) => {
    await page.goto('/de/guides/firing');
    await expect(page.locator('h1')).toBeVisible();
    await expect.poll(() => jsonLd(page)).toHaveLength(1);
    const [data] = await jsonLd(page);
    expect(data).toMatchObject({
      '@type': 'Article',
      url: 'https://glazecalcapp.com/de/guides/firing'
    });
    expect(data.headline.length).toBeGreaterThan(0);
    // Not translated yet, so the text is the English: the data says so.
    expect(['de', 'en']).toContain(data.inLanguage);
    // A type the browser does not run, so the page's script-src needs no change for it.
    expect(await page.locator('head script[data-gc-ld]').getAttribute('type')).toBe('application/ld+json');
  });

  test('moving between pages leaves only the block of the page being shown', async ({ page }) => {
    const violations = [];
    page.on('console', (message) => {
      if (/content security policy|refused to/i.test(message.text())) violations.push(message.text());
    });
    await page.goto('/guides/firing');
    await expect.poll(async () => (await jsonLd(page)).map((data) => data['@type'])).toEqual(['Article']);
    await page.getByRole('link', { name: 'Guides', exact: true }).first().click();
    await expect(page).toHaveURL(/\/guides$/);
    await expect.poll(() => jsonLd(page)).toHaveLength(0);
    expect(violations).toEqual([]);
  });
});

test.describe('after the script has run', () => {
  test('a stored session on the home page opens the notebook', async ({ page }) => {
    await signUpAndSignIn(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/home$/);
  });

  test('a reader who chose °F sees °F first in a guide, after the page has loaded', async ({ page }) => {
    await signUpAndSignIn(page);
    await page.goto('/account');
    await page.locator('#region').selectOption('US');
    await expect(page.locator('.settings-status')).toHaveText('Saved: United States.');
    await page.goto('/guides/firing');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toContainText(/\d °F \(\d[\d,]* °C\)/);
  });
});

test.describe('prerendered pages', () => {
  test.describe('with JavaScript off', () => {
    test.use({ javaScriptEnabled: false });

    test('a German guide shows its heading, text, title and description', async ({ page }) => {
      await page.goto('/de/guides/firing');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main')).toContainText('Kegel');
      await expect(page).toHaveTitle(/Glazecalc/);
      expect(await meta(page, 'name="description"')).toBeTruthy();
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    });

    test('the home page shows the landing text, and links are real links', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Create a free account' }).first()).toHaveAttribute(
        'href',
        '/signup'
      );
    });

    test('a Japanese and a Turkish guide are in their language, with their og:locale and the others', async ({
      page
    }) => {
      const japanese = await page.goto('/ja/guides/firing');
      expect(japanese.headers()['content-language']).toBe('ja');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
      await expect(page.locator('h1')).toHaveText('基本の窯焚き');
      // Written for Japan: the SK cone version, with a button for each other one.
      await expect(page.locator('.guide-version')).toContainText('SK コーン');
      await expect(page.locator('.guide-version button')).toHaveCount(2);
      expect(await meta(page, 'property="og:locale"')).toBe('ja_JP');
      const alternates = await page
        .locator('head meta[property="og:locale:alternate"]')
        .evaluateAll((tags) => tags.map((tag) => tag.getAttribute('content')));
      expect(alternates).toEqual(expect.arrayContaining(['en_US', 'de_DE', 'tr_TR']));
      expect(alternates).not.toContain('ja_JP');
      // Japanese is set in the device's own font: the page preloads Lora's Latin and the subscripts at most.
      const preloads = await page
        .locator('head link[rel="preload"][as="font"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      for (const href of preloads) expect(href).toMatch(/^media\/(lora-latin|noto-serif-math)-wght-normal-/);

      const turkish = await page.goto('/tr/guides/firing');
      expect(turkish.headers()['content-language']).toBe('tr');
      await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
      await expect(page.locator('h1')).toHaveText('Basit bir fırında pişirim');
      expect(await meta(page, 'property="og:locale"')).toBe('tr_TR');
    });

    test('the structured data is in the page, before any script', async ({ page }) => {
      await page.goto('/guides/firing');
      expect(await jsonLd(page)).toHaveLength(1);
    });
  });

  test('the app adopts the prerendered paragraph where it is, and draws nothing again', async ({ page }) => {
    // Hold the main script back, mark a paragraph of the HTML as sent and a link in the guide's text (drawn by
    // guide-inline.ts, not by a template), then let the script load.
    let release;
    const held = new Promise((resolve) => (release = resolve));
    await page.route(/\/main-[^/]*\.js$/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/de/guides/firing', { waitUntil: 'domcontentloaded' });
    await page
      .locator('main p')
      .first()
      .evaluate((el) => el.setAttribute('data-test-mark', '1'));
    await page
      .locator('.guide p a')
      .first()
      .evaluate((el) => el.setAttribute('data-test-mark', '1'));
    release();
    await appStarted(page);
    // A fresh render would have replaced the marked elements.
    await expect(page.locator('main p[data-test-mark]')).toHaveCount(1);
    await expect(page.locator('.guide p a[data-test-mark]')).toHaveCount(1);
  });

  for (const language of ['', '/de', '/el', '/ga', '/ja', '/tr']) {
    test(`no hydration mismatch on any public page in ${language || '/en'}`, async ({ page }) => {
      const problems = [];
      page.on('console', (message) => {
        if (/NG050[0-7]/.test(message.text())) problems.push(message.text());
      });
      for (const path of ['/', '/guides', '/guides/firing', '/advice', '/about', '/privacy', '/signup']) {
        await page.goto(language + path);
        await expect(page.locator('h1')).toBeVisible();
      }
      expect(problems).toEqual([]);
    });
  }

  test.describe('read from Japan', () => {
    test.use({ locale: 'ja-JP' });

    test('a Japanese guide keeps its SK version once the app is up, and its buttons switch it', async ({ page }) => {
      await page.goto('/ja/guides/firing');
      await appStarted(page);
      const version = page.locator('.guide-version');
      await expect(version).toContainText('SK コーン');
      await version.getByRole('button', { name: 'オルトンコーンで焼成する場合を表示' }).click();
      await expect(version).toContainText('コーンで焼成する場合の内容');
      await expect(version.getByRole('button', { name: 'SK コーン（JIS R 8101）で焼成する場合を表示' })).toBeVisible();
      await version.getByRole('button', { name: '温度で焼成する場合を表示' }).click();
      await expect(version).toContainText('温度で焼成する場合の内容');
    });
  });

  test('a guide asks for no messages or text before the app is ready', async ({ page }) => {
    const early = [];
    let ready = false;
    page.on('request', (request) => {
      if (!ready && request.url().includes('/i18n/')) early.push(request.url());
    });
    await page.goto('/de/guides/firing');
    await appStarted(page);
    ready = true;
    expect(early).toEqual([]);
  });

  test('the advice page arrives with the standard advice in its language, and asks for no messages before it is ready', async ({
    page,
    request
  }) => {
    // In the HTML as sent, before any script: every piece of the standard advice, in Thai.
    const html = await (await request.get('/th/advice')).text();
    const list = /<ul\b[^>]*class="general-advice"[^>]*>([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';
    expect(list.match(/<h3\b/g)).toHaveLength(8);
    expect(list).toContain('มีระบบ');
    // The files the page carries for the browser (ng-state, which writes / as /): only the advice's
    // words, not every standard record's, nor English files the page never reads.
    const carried = html.replaceAll('\\u002F', '/');
    expect(carried).toContain('/i18n/advice/th.json');
    expect(carried).not.toContain('/i18n/records/');
    expect(carried).not.toContain('/i18n/server/en.json');
    const early = [];
    let ready = false;
    page.on('request', (r) => {
      if (!ready && (r.url().includes('/i18n/') || r.url().includes('/api/'))) early.push(r.url());
    });
    await page.goto('/th/advice');
    await appStarted(page);
    ready = true;
    expect(early).toEqual([]);
    await expect(page.locator('.general-advice li')).toHaveCount(8);
  });

  test('a stored session on the home page goes to the notebook without the landing text showing', async ({ page }) => {
    await signUpAndSignIn(page);
    // Every frame until the page changes (what the eye sees; a script can run before the styles do).
    await page.addInitScript(() => {
      globalThis.landingFrames = 0;
      const look = () => {
        const hero = globalThis.document.querySelector('.hero');
        if (hero && hero.checkVisibility({ visibilityProperty: true })) globalThis.landingFrames++;
        if (!globalThis.location.pathname.endsWith('/home')) globalThis.requestAnimationFrame(look);
      };
      globalThis.requestAnimationFrame(look);
    });

    await page.goto('/');
    await expect(page).toHaveURL(/\/home$/);
    expect(await page.evaluate(() => globalThis.landingFrames)).toBe(0);
  });
});
