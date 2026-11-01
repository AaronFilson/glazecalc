const { test, expect } = require('@playwright/test');
const ar = require('../client/public/i18n/ar.json');

// Pages in other languages (docs/adr/0013-translations.md): the language from
// the URL, the page's lang and direction, links that stay in the language,
// and a right-to-left page with its layout mirrored, in Arabic as it is offered
// (its own messages, read from its file so a reworded translation doesn't break the test).

test('English stays at the plain paths, left to right', async ({ page }) => {
  await page.goto('/guides');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'About' })).toHaveAttribute(
    'href',
    '/about'
  );
  await expect(page).toHaveTitle('Guides - Glazecalc');
});

test('a right-to-left page mirrors its layout, and its links stay in the language', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/ar/guides');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'ar');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page).toHaveTitle(ar.titles.guides);

  const nav = page.getByRole('navigation', { name: ar.nav.main, exact: true });
  await expect(nav.getByRole('link', { name: ar.nav.about, exact: true })).toHaveAttribute('href', '/ar/about');
  await expect(page.getByRole('link', { name: ar.nav.signIn }).first()).toBeVisible();

  // Mirrored: the name of the app is on the right and the account links on the left.
  const brand = await nav.getByRole('link', { name: 'Glazecalc' }).boundingBox();
  const create = await nav.getByRole('link', { name: ar.nav.createAccount }).boundingBox();
  expect(brand.x).toBeGreaterThan(640);
  expect(create.x).toBeLessThan(640);

  // Following a link keeps the language, without a new page load.
  await nav.getByRole('link', { name: ar.nav.about, exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/about$/);
  await expect(page).toHaveTitle(ar.titles.about);
  await expect(html).toHaveAttribute('dir', 'rtl');
});

test('a right-to-left guide keeps its gaps beside the rules and in its tables, on the mirrored side', async ({
  page
}) => {
  await page.goto('/ar-XB/guides/firing');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  // The rule is on the right, and the text keeps its distance from it.
  const callout = page.locator('.guide-callout').first();
  await expect(callout).toHaveCSS('padding-right', '12px');
  await expect(callout).toHaveCSS('padding-left', '0px');
  const cell = page.locator('.guide-table td').first();
  await expect(cell).toHaveCSS('padding-left', '12px');
  await expect(cell).toHaveCSS('padding-right', '0px');
});

test('a guide links its sections at its own address, in its language, and a new page opens at its top', async ({
  page
}) => {
  await page.goto('/de/guides/firing');
  const section = page.locator('.guide h2').nth(1);
  const id = await section.getAttribute('id');
  const link = page.locator('.guide-contents a').nth(1);
  // Copied, shared or opened in a new tab, it is this section of the German guide.
  await expect(link).toHaveAttribute('href', '/de/guides/firing#' + id);
  await link.click();
  await expect(section).toBeFocused();
  await expect(page).toHaveURL(new RegExp('/de/guides/firing#' + id + '$'));
  // Opened at that address, the guide shows the section.
  await page.goto('/de/guides');
  await page.goto('/de/guides/firing#' + id);
  await expect(section).toBeInViewport();
  // A link to another guide, far down the page: it opens at its top, with the focus on its title.
  const other = page.locator('.guide a[href="/de/guides/safe-mixing"]').first();
  await other.scrollIntoViewIfNeeded();
  await other.click();
  await expect(page).toHaveURL(/\/de\/guides\/safe-mixing$/);
  await expect(page.locator('h1')).toBeFocused();
  expect(await page.evaluate(() => globalThis.scrollY)).toBe(0);
});

/** The fonts the browser drew an element's text with, by name. */
const fontsOf = async (page, selector) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  return fonts.map((font) => font.familyName);
};

test('a Japanese page draws its text in a Japanese font, and an English one in Lora', async ({ page }) => {
  await page.goto('/ja-XC/guides/firing');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja-XC');
  await expect(page.locator('h1')).toHaveText(/^[\u3040-\u30ff\u4e00-\u9fff]+$/);
  await page.evaluate(() => globalThis.document.fonts.ready);
  // Noto Serif CJK on Linux (scripts/test-e2e-linux.Dockerfile), and so in CI. Elsewhere the
  // system's: Yu Mincho, or Yu Gothic where Windows has not added Japanese's serif fonts.
  const japanese = process.platform === 'linux' ? /^Noto Serif CJK JP$/ : /Mincho|Gothic|Meiryo|Noto Serif/;
  expect(await fontsOf(page, 'h1')).toEqual([expect.stringMatching(japanese)]);
  // No slanted CJK, which no Japanese font draws: emphasis is bolder instead.
  await expect(page.locator('html')).toHaveCSS('font-synthesis', 'none');
  await expect(page.locator('html')).toHaveCSS('line-break', 'strict');

  await page.goto('/guides/firing');
  await page.evaluate(() => globalThis.document.fonts.ready);
  expect(await fontsOf(page, 'h1')).toEqual([expect.stringMatching(/^Lora/)]);
  await expect(page.locator('html')).toHaveCSS('line-break', 'auto');
});

/** The font files a page asked for while it was open. */
const fontFiles = (page) => {
  const files = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'font') files.push(request.url());
  });
  return files;
};

test('Arabic and Hindi draw their letters in the system font, Hindi in taller lines, and none is spaced out', async ({
  page
}) => {
  const files = fontFiles(page);
  await page.goto('/ar-XD/guides/firing');
  await expect(page.locator('h1')).toHaveText(/^[\u0600-\u06ff\s]+$/);
  await page.evaluate(() => globalThis.document.fonts.ready);
  // Noto Naskh Arabic on Linux (scripts/test-e2e-linux.Dockerfile), and so in CI; Segoe UI on Windows.
  const arabic = process.platform === 'linux' ? /^Noto Naskh Arabic$/ : /^Segoe UI/;
  expect(await fontsOf(page, 'h1')).toContainEqual(expect.stringMatching(arabic));
  // No slanted Arabic, which its fonts do not draw.
  await expect(page.locator('html')).toHaveCSS('font-synthesis', 'none');

  await page.goto('/hi-XE/guides/firing');
  await expect(page.locator('h1')).toHaveText(/[\u0900-\u097f]/);
  await page.evaluate(() => globalThis.document.fonts.ready);
  const devanagari = process.platform === 'linux' ? /^Noto Sans Devanagari$/ : /^Nirmala UI/;
  expect(await fontsOf(page, 'h1')).toContainEqual(expect.stringMatching(devanagari));
  // 17 px text in lines 1.75 high, and headings 1.45, for the marks above and below the letters.
  await expect(page.locator('body')).toHaveCSS('line-height', '29.75px');
  const heading = await page.locator('h1').evaluate((h1) => {
    const style = globalThis.getComputedStyle(h1);
    return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
  });
  expect(heading).toBeCloseTo(1.45, 2);

  // The landing page's line over its title is spaced out in English only.
  for (const code of ['ar-XD', 'hi-XE', 'ta-XF', 'kn-XG', 'ml-XH']) {
    await page.goto('/' + code + '/');
    await expect(page.locator('.eyebrow')).toHaveCSS('letter-spacing', 'normal');
  }
  // Urdu's Nastaliq is served for Urdu alone.
  expect(files.filter((file) => /nastaliq/i.test(file))).toEqual([]);
});

test("Tamil, Kannada and Malayalam draw their letters in the system's font, in lines as tall as the script's, and fetch no font", async ({
  page
}) => {
  const files = fontFiles(page);
  // [pseudo-locale, its letters, its Linux font, text line height at 17 px, heading line height]
  for (const [code, letters, linux, line, heading] of [
    ['ta-XF', /[\u0b80-\u0bff]/, 'Noto Sans Tamil', '28.9px', 1.5],
    ['kn-XG', /[\u0c80-\u0cff]/, 'Noto Sans Kannada', '31.45px', 1.5],
    ['ml-XH', /[\u0d00-\u0d7f]/, 'Noto Sans Malayalam', '30.6px', 1.5]
  ]) {
    await page.goto('/' + code + '/guides/firing');
    await expect(page.locator('h1')).toHaveText(letters);
    await page.evaluate(() => globalThis.document.fonts.ready);
    // Noto on Linux (scripts/test-e2e-linux.Dockerfile, and so in CI); Nirmala UI on Windows.
    const font = process.platform === 'linux' ? new RegExp(`^${linux}$`) : /^Nirmala UI/;
    expect(await fontsOf(page, 'h1'), code).toContainEqual(expect.stringMatching(font));
    await expect(page.locator('html')).toHaveCSS('font-synthesis', 'none');
    await expect(page.locator('body')).toHaveCSS('line-height', line);
    const ratio = await page.locator('h1').evaluate((h1) => {
      const style = globalThis.getComputedStyle(h1);
      return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
    });
    expect(ratio, code).toBeCloseTo(heading, 2);
  }
  // Both are in the device's own fonts: nothing is downloaded for them.
  expect(files.filter((file) => /noto-(sans|nastaliq)/i.test(file))).toEqual([]);
});

test("Tamil, Marathi, Kannada, Telugu, Gujarati, Malayalam, Punjabi, Odia, Nepali and Sinhala pages are in their own script, in the system's font and the script's line height", async ({
  page
}) => {
  const files = fontFiles(page);
  // [language, its letters, its Linux font, text line height at 17 px]
  for (const [code, letters, linux, line] of [
    ['ta', /[஀-௿]/, 'Noto Sans Tamil', '28.9px'],
    ['mr', /[ऀ-ॿ]/, 'Noto Sans Devanagari', '29.75px'],
    ['kn', /[ಀ-೿]/, 'Noto Sans Kannada', '31.45px'],
    ['te', /[ఀ-౿]/, 'Noto Sans Telugu', '31.45px'],
    ['gu', /[઀-૿]/, 'Noto Sans Gujarati', '28.9px'],
    ['ml', /[ഀ-ൿ]/, 'Noto Sans Malayalam', '30.6px'],
    ['pa', /[਀-੿]/, 'Noto Sans Gurmukhi', '29.75px'],
    ['or', /[଀-୿]/, 'Noto Sans Oriya', '31.45px'],
    ['ne', /[ऀ-ॿ]/, 'Noto Sans Devanagari', '29.75px'],
    ['si', /[඀-෿]/, 'Noto Sans Sinhala', '31.45px']
  ]) {
    await page.goto('/' + code + '/guides/firing');
    await expect(page.locator('html')).toHaveAttribute('lang', code);
    await expect(page.locator('h1')).toHaveText(letters);
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    await page.evaluate(() => globalThis.document.fonts.ready);
    const font = process.platform === 'linux' ? new RegExp(`^${linux}$`) : /^Nirmala UI/;
    expect(await fontsOf(page, 'h1'), code).toContainEqual(expect.stringMatching(font));
    await expect(page.locator('body')).toHaveCSS('line-height', line);
  }
  expect(files.filter((file) => /noto-(sans|nastaliq)/i.test(file))).toEqual([]);
});

test("an Urdu page fetches the app's Nastaliq font and sets its text in it, in lines 1.9 high", async ({ page }) => {
  const files = fontFiles(page);
  await page.goto('/ur/about');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('h1')).toHaveText(/[؀-ۿ]/);
  await expect.poll(() => files.filter((file) => /noto-nastaliq-urdu-wght-normal/.test(file)).length).toBe(1);
  await page.evaluate(() => globalThis.document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts).toContainEqual(expect.objectContaining({ familyName: 'Noto Nastaliq Urdu', isCustomFont: true }));
  await expect(page.locator('body')).toHaveCSS('line-height', '32.3px');
});

test('an Urdu page shows its text in the device font while the Nastaliq font is on its way, then switches', async ({
  page
}) => {
  // A slow connection: the font file arrives after 3 s.
  await page.route(/noto-nastaliq-urdu-wght-normal/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });
  const fontsOfH1 = async () => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    return fonts;
  };
  await page.goto('/ur/about', { waitUntil: 'commit' });
  // The text is there, in lines of the same height, before the font has arrived.
  await expect(page.locator('h1')).toHaveText(/[؀-ۿ]/, { timeout: 2500 });
  await expect(page.locator('body')).toHaveCSS('line-height', '32.3px');
  expect(await fontsOfH1()).not.toContainEqual(expect.objectContaining({ familyName: 'Noto Nastaliq Urdu' }));
  // Then the Nastaliq replaces it.
  await expect
    .poll(async () => (await fontsOfH1()).some((font) => font.familyName === 'Noto Nastaliq Urdu'), { timeout: 10000 })
    .toBe(true);
});

test('the pseudo-locale accents every message, which shows any left unmarked', async ({ page }) => {
  await page.goto('/en-XA/about');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA');
  const nav = page.getByRole('navigation', { name: /Ṁåîñ/ });
  await expect(nav.getByRole('link', { name: /^\[Åƀöûţ ·+\]$/ })).toHaveAttribute('href', '/en-XA/about');
});
