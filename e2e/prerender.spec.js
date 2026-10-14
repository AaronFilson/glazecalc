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
      const description = await meta(page, 'name="description"');
      expect(description, path).not.toMatch(SITE_DESCRIPTION);
      expect(description.length, path).toBeGreaterThanOrEqual(120);
      expect(description.length, path).toBeLessThanOrEqual(155);
      seen.add(description);
    }
    expect(seen.size).toBe(PUBLIC_PAGES.length);
  });

  test('the home page keeps the description of the whole site', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    expect(await meta(page, 'name="description"')).toMatch(SITE_DESCRIPTION);
  });

  test("a language without the page's description yet shows its own site description, not English", async ({
    page
  }) => {
    await page.goto('/de/');
    await expect(page.locator('h1')).toBeVisible();
    const site = await meta(page, 'name="description"');
    await page.goto('/de/guides/firing');
    await expect(page.locator('h1')).toBeVisible();
    expect(await meta(page, 'name="description"')).toBe(site);
    expect(await meta(page, 'name="description"')).not.toBe(FIRING_DESCRIPTION);
    expect(await meta(page, 'property="og:description"')).toBe(site);
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
    const [data] = await jsonLd(page);
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
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

    test('the structured data is in the page, before any script', async ({ page }) => {
      await page.goto('/guides/firing');
      expect(await jsonLd(page)).toHaveLength(1);
    });
  });

  test('the app adopts the prerendered paragraph where it is, and draws nothing again', async ({ page }) => {
    // Hold the main script back, mark a paragraph of the HTML as sent, then let the script load.
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
    release();
    await appStarted(page);
    // A fresh render would have replaced the marked element.
    await expect(page.locator('main p[data-test-mark]')).toHaveCount(1);
  });

  for (const language of ['', '/de', '/el', '/ga']) {
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
