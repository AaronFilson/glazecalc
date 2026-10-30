const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const standardData = require('../data');
const { API, signUpAndSignIn } = require('./helpers');

// The right-to-left layout (docs/i18n-plan.md, "Right to left, as built"), on the pseudo-locale ar-XD: real Arabic
// letters on a mirrored page, so the browser's own bidirectional rules run as they will for Arabic, with
// Arabic-Indic digits. Values with Latin units read left to right, names are kept apart from the text around
// them (client/app/shared/bidi.ts), and Bootstrap's sides are mirrored (client/bootstrap.scss). The
// Devanagari, Tamil, Kannada and Malayalam pseudo-locales (hi-XE, ta-XF, kn-XG, ml-XH) are laid out at the
// narrowest phone too, and so are the real Tamil, Marathi, Kannada, Telugu, Gujarati, Malayalam, Punjabi and Odia pages.

const standard = {};
standardData.load('materials').forEach((material) => (standard[material.name] = material));
const GLAZE = [
  ['Orthoclase', 40],
  ['Silica', 20],
  ['Whiting', 10],
  ['Dolomite', 20],
  ['China Clay', 10]
];

/** A saved recipe with its chemistry, fired by temperature, made through the API as the page's account. */
const savedRecipe = async (page, title = 'Celadon (v2)') => {
  const materials = GLAZE.map(([name, amount]) => {
    const material = { ...standard[name], amount: String(amount) };
    delete material._id;
    return material;
  });
  const firedAt = { scale: 'temperature', low: '1240', atmospheres: ['oxidation'] };
  const res = await page.request.post(API + '/recipe/create', { data: { title, materials, firedAt } });
  expect(res.ok()).toBe(true);
  return (await res.json())._id;
};

/** How far the page is wider than the window. */
const sideways = (page) =>
  page.evaluate(
    () => globalThis.document.documentElement.scrollWidth - globalThis.document.documentElement.clientWidth
  );

// As e2e/accessibility.spec.js checks: WCAG A and AA, and the page's landmarks and headings.
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const STRUCTURE = Object.fromEntries(
  ['landmark-one-main', 'region', 'page-has-heading-one', 'heading-order'].map((rule) => [rule, { enabled: true }])
);
const accessibilityProblems = async (page) => {
  const { violations } = await new AxeBuilder({ page }).options({ rules: STRUCTURE }).withTags(WCAG).analyze();
  return violations.map((v) => `${v.id}: ${v.help} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

/**
 * Where the first value with a unit in an element is drawn, glyph by glyph: the middle of its first digit,
 * its degree sign and the letter after it, from the left of the window. Left to right reads "1240 °C".
 */
const glyphsOf = (locator, unit = '°') =>
  locator.evaluate((element, sign) => {
    const walker = globalThis.document.createTreeWalker(element, 4);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.data.indexOf(sign);
      if (at < 1) continue;
      const before = node.data.slice(0, at);
      const digit = before.search(/\p{Nd}+[\p{Nd}.,٫٬\s\p{Cf}]*$/u);
      if (digit < 0) continue;
      const middle = (i) => {
        const range = globalThis.document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const box = range.getBoundingClientRect();
        return box.left + box.width / 2;
      };
      return { text: node.data, digit: middle(digit), sign: middle(at), unit: middle(at + 1) };
    }
    return null;
  }, unit);

/** The middle of each of the given characters of an element's text, the first of each, from the left. */
const charactersOf = (locator, characters) =>
  locator.evaluate((element, wanted) => {
    const walker = globalThis.document.createTreeWalker(element, 4);
    const found = {};
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const character of wanted) {
        const at = node.data.indexOf(character);
        if (at < 0 || character in found) continue;
        const range = globalThis.document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + 1);
        const box = range.getBoundingClientRect();
        found[character] = box.left + box.width / 2;
      }
    }
    return found;
  }, characters);

test.describe('at the narrowest phone', () => {
  test.describe.configure({ mode: 'parallel' });
  test.use({ viewport: { width: 320, height: 700 } });

  // The pseudo-locales, and the real Indian languages, whose words run longer than the pseudo-text's.
  for (const code of ['ar-XD', 'hi-XE', 'ta-XF', 'kn-XG', 'ml-XH', 'ta', 'mr', 'kn', 'te', 'gu', 'ml', 'pa', 'or']) {
    test(`${code}: the pages fit without scrolling sideways, and pass the accessibility checks`, async ({ page }) => {
      test.setTimeout(150_000);
      await signUpAndSignIn(page);
      const id = await savedRecipe(page);
      for (const path of ['/', '/guides/firing', '/signin', '/recipe?open=' + id, '/account', '/notes', '/blends']) {
        await page.goto('/' + code + path);
        await expect(page.locator('html')).toHaveAttribute('lang', code);
        await expect(page.locator('h1')).toBeVisible();
        await page.waitForLoadState('networkidle');
        expect(await sideways(page), code + path).toBeLessThanOrEqual(0);
        expect(await accessibilityProblems(page), code + path).toEqual([]);
      }
    });
  }
});

test.describe('a right-to-left page', () => {
  test.beforeEach(async ({ page }) => {
    await signUpAndSignIn(page);
    // Temperatures in °C, so the recipe's firing reads "1240 °C".
    expect((await page.request.put(API + '/preferences', { data: { temperature: 'C' } })).ok()).toBe(true);
  });

  test('reads a temperature left to right inside Arabic text, and a name with its brackets in place', async ({
    page
  }) => {
    const id = await savedRecipe(page);
    await page.goto('/ar-XD/recipe?open=' + id);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    // The firing's summary: Arabic words, and the temperature in Arabic-Indic digits with its Latin unit.
    const summary = page.locator('main summary', { hasText: '°C' }).first();
    await expect(summary).toContainText('١٢٤٠');
    const glyphs = await glyphsOf(summary);
    expect(glyphs, 'a temperature in ' + (await summary.textContent())).not.toBeNull();
    // Drawn left to right, "١٢٤٠ °C", not "C° ١٢٤٠".
    expect(glyphs.digit).toBeLessThan(glyphs.sign);
    expect(glyphs.sign).toBeLessThan(glyphs.unit);

    // The recipe's name keeps its brackets where they are written: "Celadon (v2)", not "(Celadon (v2".
    const heading = page.locator('#editor-heading');
    await expect(heading).toHaveText('Celadon (v2)');
    const name = await charactersOf(heading, ['C', '(', ')']);
    expect(name['C']).toBeLessThan(name['(']);
    expect(name['(']).toBeLessThan(name[')']);
  });

  test("mirrors Bootstrap's sides: a select's arrow and a checkbox on the left and right of the line", async ({
    page
  }) => {
    const id = await savedRecipe(page);
    /** Where a select draws its arrow, and the room on each side for it. */
    const select = (locator) =>
      locator.evaluate((element) => {
        const style = globalThis.getComputedStyle(element);
        return [style.backgroundPositionX.split(',')[0], style.paddingLeft, style.paddingRight];
      });
    /** How far a checkbox is from its label, left or right. */
    const checkSide = (page) =>
      page
        .locator('.form-check')
        .first()
        .evaluate((check) => {
          const box = check.querySelector('.form-check-input').getBoundingClientRect();
          const label = check.querySelector('.form-check-label').getBoundingClientRect();
          return box.left > label.left ? 'right' : 'left';
        });

    await page.goto('/ar-XD/recipe?open=' + id);
    await expect(page.locator('#firing-scale')).toBeVisible();
    // The arrow 12 px from the left, and the room for it on the left.
    expect(await select(page.locator('#firing-scale'))).toEqual(['12px', '36px', '12px']);
    expect(await checkSide(page)).toBe('right');
    // Numbers, emails and codes are typed left to right; a name in the direction of its own first letter.
    await expect(page.locator('input[inputmode="decimal"]').first()).toHaveCSS('direction', 'ltr');
    await expect(page.locator('#recipe-name')).toHaveCSS('unicode-bidi', 'plaintext');

    // A left-to-right page is as it was.
    await page.goto('/recipe?open=' + id);
    await expect(page.locator('#firing-scale')).toBeVisible();
    expect(await select(page.locator('#firing-scale'))).toEqual(['calc(100% - 12px)', '12px', '36px']);
    expect(await checkSide(page)).toBe('left');
    await expect(page.locator('#recipe-name')).toHaveCSS('unicode-bidi', 'normal');

    await page.goto('/ar-XD/signin');
    await expect(page.locator('#email')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('#email')).toHaveCSS('direction', 'ltr');
  });

  test('keeps the Stull chart left to right, its alumina figures at the left of the plot', async ({ page }) => {
    const id = await savedRecipe(page);
    await page.goto('/ar-XD/recipe?open=' + id);
    const chart = page.locator('figure.stull svg');
    await chart.scrollIntoViewIfNeeded();
    await expect(chart).toHaveCSS('direction', 'ltr');
    const placed = await chart.evaluate((svg) => {
      const frame = svg.querySelector('.stull-frame').getBoundingClientRect();
      const yLabels = [...svg.querySelectorAll('text[text-anchor="end"]')].map((t) => t.getBoundingClientRect());
      const xLabels = [...svg.querySelectorAll('text[text-anchor="middle"]')]
        .filter((t) => !t.classList.contains('stull-name') && /^\p{Nd}$/u.test(t.textContent.trim()))
        .map((t) => ({ value: t.textContent.trim(), x: t.getBoundingClientRect().left }));
      return { frameLeft: frame.left, rights: yLabels.map((r) => r.right), xLabels };
    });
    expect(placed.rights.length).toBeGreaterThan(3);
    for (const right of placed.rights) expect(right).toBeLessThanOrEqual(placed.frameLeft + 0.5);
    // Silica grows to the right: ١ on the left, ٧ on the right.
    const xs = placed.xLabels.map((label) => label.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(placed.xLabels[0].value).toBe('١');
  });

  test("mirrors the blend's grid, and names each corner where it is drawn", async ({ page }) => {
    const first = await savedRecipe(page, 'Celadon (v2)');
    const others = [
      await savedRecipe(page, 'Tenmoku'),
      await savedRecipe(page, 'Shino'),
      await savedRecipe(page, 'Ash')
    ];
    await page.goto('/ar-XD/blends?recipe=' + first);
    await page.locator('#blend-kind-biaxial').check();
    for (const [i, id] of others.entries()) await page.locator('#blend-corner-' + (i + 1)).selectOption(id);
    const tiles = page.locator('.blend-tile');
    await expect(tiles.first()).toBeVisible();
    // Tile 1 is at the start of the line, on the right; corner A, its recipe, is "top right".
    const [one, two] = [await tiles.nth(0).boundingBox(), await tiles.nth(1).boundingBox()];
    expect(one.x).toBeGreaterThan(two.x);
    await expect(page.locator('label[for="blend-corner-0"]')).toContainText('توب ريغهت');
    await expect(page.locator('label[for="blend-corner-1"]')).toContainText('توب ليفت');
  });

  test('prints a recipe right to left, on one or two pages, its names and weights in order', async ({ page }) => {
    const id = await savedRecipe(page);
    await page.goto('/ar-XD/recipe?print=' + id);
    const sheet = page.locator('.print-sheet');
    await expect(sheet.locator('h2')).toHaveText('Celadon (v2)');
    await page.emulateMedia({ media: 'print' });
    await expect(sheet).toHaveCSS('direction', 'rtl');
    // The names start at the right of their column, and the title's brackets stay where they are written.
    const row = sheet.locator('tbody tr').first();
    const [name, cell] = [await row.locator('th bdi').boundingBox(), await row.locator('th').boundingBox()];
    expect(cell.x + cell.width - (name.x + name.width)).toBeLessThan(20);
    const title = await charactersOf(sheet.locator('h2'), ['C', '(', ')']);
    expect(title['C']).toBeLessThan(title['(']);
    expect(title['(']).toBeLessThan(title[')']);
    // Nothing wider than the sheet.
    expect(await sheet.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    const pages = ((await page.pdf({ format: 'A4' })).toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
    expect(pages).toBeLessThanOrEqual(2);
  });

  test('shows a shared recipe right to left on a phone, its name kept apart', async ({ page, browser }) => {
    const id = await savedRecipe(page);
    const made = await page.request.post(API + '/share/recipe/' + id, { data: {} });
    expect(made.ok()).toBe(true);
    const { secret } = await made.json();
    const other = await browser.newContext({ viewport: { width: 320, height: 700 } });
    const viewer = await other.newPage();
    await viewer.goto('/ar-XD/shared#' + secret);
    await expect(viewer.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(viewer.locator('h1')).toHaveText('Celadon (v2)');
    const title = await charactersOf(viewer.locator('h1'), ['C', '(', ')']);
    expect(title['C']).toBeLessThan(title['(']);
    expect(title['(']).toBeLessThan(title[')']);
    await viewer.waitForLoadState('networkidle');
    expect(await sideways(viewer)).toBeLessThanOrEqual(0);
    await other.close();
  });
});
