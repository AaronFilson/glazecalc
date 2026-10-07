const { test, expect } = require('@playwright/test');
const { API, signUpAndSignIn } = require('./helpers');

const html = (page) => page.locator('html');
const token = (page, name) =>
  page.evaluate(
    (n) => globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue(n).trim(),
    name
  );

test('picks light or dark and a palette in Settings, which hold on reload and on another device', async ({
  page,
  browser
}) => {
  const { email } = await signUpAndSignIn(page);
  await page.goto('/account');
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await expect(page.locator('.settings-status')).toHaveText('Saved: always dark.');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(html(page)).toHaveAttribute('data-bs-theme', 'dark');
  await page.getByRole('radio', { name: 'Cobalt blue' }).check();
  await expect(html(page)).toHaveAttribute('data-palette', 'cobalt');
  expect(await token(page, '--gc-bg')).toBe('#1e1a17');
  expect(await token(page, '--gc-primary')).toBe('#9db9f2');

  // On the next visit the colors are on before the app starts: here it never does.
  await page.route(/\/main-[^/]*\.js$/, (route) => route.abort());
  await page.goto('/account');
  await expect(html(page)).toHaveAttribute('data-palette', 'cobalt');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  // The stylesheet has the dark and palette rules from the start, and the browser's bar matches.
  expect(await page.evaluate(() => globalThis.getComputedStyle(globalThis.document.body).backgroundColor)).toBe(
    'rgb(30, 26, 23)'
  );
  expect(await token(page, '--gc-primary')).toBe('#9db9f2');
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#1e1a17');
  await page.unroute(/\/main-[^/]*\.js$/);

  // Another browser, signed in to the same account, takes them from the account.
  const context = await browser.newContext({ colorScheme: 'light' });
  const other = await context.newPage();
  const signIn = await other.request.get(API + '/signin', {
    headers: { Authorization: 'Basic ' + Buffer.from(email + ':password123').toString('base64') }
  });
  expect(signIn.ok()).toBeTruthy();
  await other.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  await other.goto('/home');
  await expect(html(other)).toHaveAttribute('data-palette', 'cobalt');
  await expect(html(other)).toHaveAttribute('data-theme', 'dark');
  await context.close();
});

test('prints black on white whatever the theme', async ({ page }) => {
  await signUpAndSignIn(page);
  expect((await page.request.put(API + '/preferences', { data: { theme: 'dark', palette: 'oxblood' } })).ok()).toBe(
    true
  );
  await page.goto('/home');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ media: 'print' });
  for (const name of ['--gc-primary', '--gc-danger-text', '--gc-accent']) {
    expect(await token(page, name), name).toBe('#000');
  }
  expect(await token(page, '--gc-bg')).toBe('#fff');
  expect(await token(page, '--gc-text')).toBe('#000');
});
