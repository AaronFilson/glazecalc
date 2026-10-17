const { test, expect } = require('@playwright/test');
const { addStandardMaterial, signUpAndSignIn } = require('./helpers');

const CLEAR = [
  ['Orthoclase', 40],
  ['Silica', 30],
  ['Whiting', 20],
  ['China Clay', 10]
];

// A recipe shared by link (docs/adr/0020-share-links.md): made on the recipe
// page, opened signed out in another browser, never indexed, and stopped.
test('a saved recipe is shared by a link anyone can open, with the working, until its owner stops it', async ({
  page,
  browser
}) => {
  await signUpAndSignIn(page);
  await page.goto('/recipe');
  await page.locator('#recipe-name').fill('Class clear');
  for (const [name, amount] of CLEAR) await addStandardMaterial(page, name, amount);
  const unity = await page.locator('.unity-result gc-unity-formula').textContent();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.saved-recipe-open', { hasText: 'Class clear' })).toBeVisible();

  await page.getByRole('button', { name: 'More for Class clear' }).click();
  await page.getByRole('button', { name: 'Share Class clear' }).click();
  await expect(page.getByRole('heading', { name: 'Share a read-only link' })).toBeFocused();
  await page.getByRole('button', { name: 'Make a link' }).click();
  const link = await page.getByLabel('The link').inputValue();
  expect(link).toMatch(/\/shared#[A-Za-z0-9_-]{43}$/);

  // Someone else, signed out, on a phone.
  const other = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const viewer = await other.newPage();
  const requests = [];
  viewer.on('request', (request) => requests.push(request.url()));
  // Under the Content-Security-Policy (e2e/csp.spec.js), nothing on the page may be blocked.
  const violations = [];
  viewer.on('console', (message) => {
    if (/content security policy|refused to/i.test(message.text())) violations.push(message.text());
  });
  const response = await viewer.goto(link);
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive');
  expect(response.headers()['referrer-policy']).toBe('no-referrer');
  await expect(viewer.locator('h1')).toHaveText('Class clear');
  await expect(viewer.locator('.shared-chemistry gc-unity-formula')).toHaveText(unity);
  // The secret never went into an address the server saw.
  const secret = link.slice(link.indexOf('#') + 1);
  expect(requests.filter((url) => url.includes(secret))).toEqual([]);
  // Nothing wider than the phone.
  expect(await viewer.evaluate(() => globalThis.document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  await viewer.getByRole('button', { name: 'The working', exact: true }).click();
  await expect(viewer.getByRole('heading', { name: 'How the unity formula is worked out' })).toBeVisible();
  await expect(viewer.locator('.worked-answer gc-unity-formula')).toHaveText(unity);
  expect(await viewer.evaluate(() => globalThis.document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await viewer.emulateMedia({ colorScheme: 'dark' });
  await viewer.emulateMedia({ media: 'print' });
  await viewer.pdf({ format: 'A4' });
  await viewer.emulateMedia({ media: 'screen' });
  expect(violations).toEqual([]);

  // Stopped, the link opens nothing.
  await page.getByRole('button', { name: 'Stop sharing' }).click();
  await expect(page.locator('.share-status')).toHaveText('The recipe is no longer shared. Its link no longer works.');
  await viewer.reload();
  await expect(viewer.locator('h1')).toHaveText('This recipe is not shared');
  await other.close();
});

test("Show the working prints the unity formula as a worksheet, with the recipe page's numbers", async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/recipe');
  for (const [name, amount] of CLEAR) await addStandardMaterial(page, name, amount);
  const unity = await page.locator('.unity-result gc-unity-formula').textContent();
  await page.getByRole('button', { name: 'Show the working' }).click();
  await expect(page).toHaveURL(/\/recipe\?print=draft&sheet=worked$/);
  await expect(page.getByLabel(/^The working/)).toBeChecked();
  await expect(page.locator('.worked-answer gc-unity-formula')).toHaveText(unity);
  await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
  await expect(page.locator('.print-controls')).toBeHidden();
  const pdf = await page.pdf({ format: 'Letter' });
  expect(pdf.length).toBeGreaterThan(1000);
});
