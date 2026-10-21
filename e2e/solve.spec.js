const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { signUpAndSignIn } = require('./helpers');

// Solve for a target (docs/adr/0026-target-and-solve.md), against the real standard library.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Whether the page is wider than the window: a phone would scroll sideways. */
const scrollsSideways = (page) =>
  page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth + 1);

test('solves a pasted unity formula from chosen materials and opens it as a new recipe', async ({ page }) => {
  test.setTimeout(90000);
  await signUpAndSignIn(page);
  await page.goto('/recipe');
  await page.getByRole('link', { name: 'Solve for a target' }).click();
  await expect(page).toHaveURL(/\/solve$/);
  await expect(page.locator('h1')).toHaveText('Solve for a target');

  // A cone 6 glossy's unity formula, pasted as another app copies it.
  await page.getByLabel('Paste from another app').fill('K2O 0.06\nNa2O 0.24\nCaO 0.70\nAl2O3 0.40\nSiO2 3.20');
  await page.getByRole('button', { name: 'Fill in from the pasted text' }).click();
  await expect(page.locator('.solve-paste-status')).toHaveText('Filled in 5 oxides.');
  await expect(page.getByLabel('silica (SiO₂)')).toHaveValue('3.2');
  await expect(page.locator('#solve-sum')).toHaveText('The fluxes add up to 1.00.');

  // A new account has nothing on hand: the materials are picked from the library.
  const library = page.locator('.library');
  await library.getByRole('button', { name: /^Standard/ }).click();
  for (const [filter, name] of [
    ['minspar', 'Minspar 200'],
    ['whiting', 'Whiting'],
    ['epk', 'EPK Kaolin'],
    ['silica', 'Silica']
  ]) {
    await library.getByRole('searchbox').fill(filter);
    // A name may carry its status: "Add EPK Kaolin, Scarce".
    await library.getByRole('button', { name: new RegExp('^Add ' + name + '(,|$)') }).click();
  }
  await expect(page.locator('.solve-tries li')).toHaveCount(4);

  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The recipe' })).toBeFocused();
  await expect(page.locator('.solve-recipe tbody tr')).toHaveCount(4);
  await expect(page.locator('.solve-verdict')).toHaveText(/^(Close|Fair):/);
  await expect(page.locator('.solve-near')).toContainText('SiO₂');
  await expect(page.locator('#limits-heading')).toBeVisible();
  await expect(page.locator('.recipe-hazards')).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations.map((v) => v.id + ': ' + v.help)).toEqual([]);

  // On a phone: no sideways scrolling.
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await scrollsSideways(page)).toBe(false);
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.getByRole('button', { name: 'Open as a new recipe' }).click();
  await expect(page).toHaveURL(/\/recipe$/);
  await expect(page.locator('#recipe-name')).toHaveValue('Solved for a target');
  await expect(page.getByRole('textbox', { name: 'Amount of Minspar 200', exact: true })).toHaveCount(1);
  await expect(page.locator('.recipe-status')).toHaveText('Not saved yet');
});

test('says what the target needs, on the field and by the button', async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/solve');
  await page.getByLabel('silica (SiO₂)').fill('lots');
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.getByLabel('silica (SiO₂)')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('silica (SiO₂)').fill('3');
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.locator('#solve-problem')).toHaveText(
    'The target needs at least one flux, such as CaO, K₂O or Na₂O.'
  );
  await expect(page.getByLabel('calcium (CaO)')).toBeFocused();
});
