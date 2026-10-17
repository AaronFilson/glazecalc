const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

// Every page the app has, signed in, loaded under the real Content-Security-Policy
// (the server's header and the build's <meta> tag together, and in production
// nginx's header too): nothing may be blocked, whether a font, a stylesheet, an
// image, a request or a script.

/** The policy nginx adds to every reply in production (deploy/nginx/glazecalc-proxy.conf). */
const NGINX_POLICY = /add_header Content-Security-Policy "([^"]+)" always;/.exec(
  fs.readFileSync(path.join(__dirname, '..', 'deploy', 'nginx', 'glazecalc-proxy.conf'), 'utf8')
)[1];
const PAGES = [
  '/home',
  '/recipe',
  '/recipe?print=draft',
  '/import',
  '/blends',
  '/recipe?print=draft&sheet=worked',
  '/material',
  '/additive',
  '/firing',
  '/notes',
  '/advice',
  '/trash',
  '/account',
  '/guides',
  '/guides/safe-mixing',
  '/about',
  '/privacy',
  '/assistants',
  '/de/guides',
  '/shared',
  '/pseudo'
];

/** Collects the page's Content-Security-Policy violations, as the browser reports them, and its console's. */
const watchViolations = async (page) => {
  const violations = [];
  // The browser's report of each blocked load, from inside the page.
  await page.exposeFunction('reportViolation', (v) => violations.push(v));
  await page.addInitScript(() => {
    globalThis.document.addEventListener('securitypolicyviolation', (e) => {
      globalThis.reportViolation(e.violatedDirective + ' ' + e.blockedURI + ' ' + e.sourceFile + ':' + e.lineNumber);
    });
  });
  page.on('console', (message) => {
    if (/content security policy|refused to/i.test(message.text())) violations.push(message.text());
  });
  return violations;
};

/** Visits every page, then the recipe page in dark mode and in print, which take other style paths. */
const visitAll = async (page, pages) => {
  for (const address of pages) {
    await page.goto(address);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/recipe');
  await expect(page.locator('h1').first()).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ format: 'Letter' });
  await page.waitForLoadState('networkidle');
  await page.emulateMedia({ colorScheme: 'light', media: 'screen' });
};

test('every page loads with no Content-Security-Policy violations', async ({ page }) => {
  await signUpAndSignIn(page);
  const violations = await watchViolations(page);

  const response = await page.goto('/home');
  const policy = response.headers()['content-security-policy'];
  expect(policy).toContain("connect-src 'self'");
  expect(policy).toContain("form-action 'self'");
  expect(policy).not.toContain('default-src');

  await visitAll(page, PAGES);
  expect(violations).toEqual([]);
});

// As production serves them: every reply also carries nginx's policy, a
// policy of its own (a comma between two policies in one header keeps them
// apart, as two headers would). The prerendered public pages are checked
// signed out as well, as most visitors see them.
test("every page loads with no violations under nginx's policy too", async ({ page }) => {
  // About thirty pages, signed out and signed in, in one browser: more than the default 30 s on a busy runner.
  test.setTimeout(180_000);
  expect(NGINX_POLICY).toContain("default-src 'self'");
  await page.route('**/*', async (route) => {
    const response = await route.fetch();
    const headers = response.headers();
    headers['content-security-policy'] = [headers['content-security-policy'], NGINX_POLICY].filter(Boolean).join(', ');
    await route.fulfill({ response, headers });
  });
  const violations = await watchViolations(page);

  const first = await page.goto('/');
  expect(first.headers()['content-security-policy']).toContain(NGINX_POLICY);
  await visitAll(page, [
    '/',
    '/guides',
    '/guides/firing',
    '/de/',
    '/de/guides/safe-mixing',
    '/zh-Hans/',
    '/zh-Hant/guides/safe-mixing',
    '/ko/guides/firing',
    '/ja/guides',
    '/privacy',
    '/signin'
  ]);
  // A guide with a region's own notes (China's), which add their own blocks.
  await page.evaluate(() => localStorage.setItem('preferredRegion', 'CN'));
  await visitAll(page, ['/zh-Hans/guides/safe-mixing', '/guides/home-safety']);
  await signUpAndSignIn(page);
  await visitAll(page, PAGES);
  expect(violations).toEqual([]);

  // And the check would see a load from elsewhere: an image from another site is refused.
  await page.evaluate(() => {
    new globalThis.Image().src = 'https://example.com/pixel.png';
  });
  await expect.poll(() => violations.join(' ')).toContain('example.com');
});
