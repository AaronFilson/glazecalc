const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

// Every page the app has, signed in, loaded under the real Content-Security-Policy
// (the server's header and the build's <meta> tag together): nothing may be
// blocked, whether a font, a stylesheet, an image, a request or a script.
const PAGES = [
  '/home',
  '/recipe',
  '/recipe?print=draft',
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
  '/de/guides',
  '/pseudo'
];

test('every page loads with no Content-Security-Policy violations', async ({ page }) => {
  await signUpAndSignIn(page);
  const violations = [];
  const consoleErrors = [];
  // The browser's report of each blocked load, from inside the page.
  await page.exposeFunction('reportViolation', (v) => violations.push(v));
  await page.addInitScript(() => {
    globalThis.document.addEventListener('securitypolicyviolation', (e) => {
      globalThis.reportViolation(e.violatedDirective + ' ' + e.blockedURI + ' ' + e.sourceFile + ':' + e.lineNumber);
    });
  });
  page.on('console', (message) => {
    if (/content security policy|refused to/i.test(message.text())) consoleErrors.push(message.text());
  });

  const response = await page.goto('/home');
  const policy = response.headers()['content-security-policy'];
  expect(policy).toContain("connect-src 'self'");
  expect(policy).toContain("form-action 'self'");
  expect(policy).not.toContain('default-src');

  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  // Dark mode and print take other style paths.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/recipe');
  await expect(page.locator('h1').first()).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ format: 'Letter' });
  await page.waitForLoadState('networkidle');

  expect(violations).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
