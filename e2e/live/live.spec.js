const { test, expect } = require('@playwright/test');
const { PUBLIC_PAGES } = require('../../lib/pages');
const { LIVE_LANGUAGES, languagePrefix } = require('../../lib/regions/languages');

// The deployed site, after each deploy (.github/workflows/live-checks.yml;
// playwright.live.config.js): the public pages load signed out, as most
// visitors see them, under the site's real headers (nginx's policy and the
// app's together), with no Content-Security-Policy violation and no script
// error. Read-only: it signs in nowhere and saves nothing. e2e/csp.spec.js
// checks every page, signed in, before merging; this checks what was deployed.

/** Languages whose pages take other fonts or scripts, where they are live. */
const SAMPLE = ['de', 'el', 'ja', 'ko', 'zh-Hans', 'zh-Hant', 'th', 'vi'].filter((code) =>
  LIVE_LANGUAGES.includes(code)
);
const PAGES = [
  ...PUBLIC_PAGES,
  ...SAMPLE.map((code) => languagePrefix(code) + '/'),
  ...SAMPLE.map((code) => languagePrefix(code) + '/guides/safe-mixing'),
  '/signin'
];

for (const address of PAGES) {
  test(`${address} loads with no violations or script errors`, async ({ page }) => {
    const problems = [];
    await page.exposeFunction('reportViolation', (v) => problems.push(v));
    await page.addInitScript(() => {
      globalThis.document.addEventListener('securitypolicyviolation', (e) => {
        globalThis.reportViolation(e.violatedDirective + ' ' + e.blockedURI + ' ' + e.sourceFile + ':' + e.lineNumber);
      });
    });
    page.on('console', (message) => {
      if (/content security policy|refused to/i.test(message.text())) problems.push(message.text());
    });
    page.on('pageerror', (err) => problems.push('script error: ' + err.message));

    const response = await page.goto(address);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-security-policy']).toContain("default-src 'self'");
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(problems).toEqual([]);
  });
}
