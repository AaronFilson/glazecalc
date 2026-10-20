const { test, expect } = require('@playwright/test');
const { addStandardMaterial, signUpAndSignIn } = require('./helpers');

// A recipe's firing (docs/adr/0021-recipe-firing.md): the claimed range and the
// cones tested, both bands of the limits for a range across them, the
// food-surface note, Duplicate for another cone, the shared page in the
// author's own scale, and firing logs linked both ways.

const API = 'http://localhost:' + (process.env.E2E_PORT || '3100') + '/api';
const CLEAR = [
  ['Orthoclase', 40],
  ['Silica', 30],
  ['Whiting', 20],
  ['China Clay', 10]
];

const startRecipe = async (page, title) => {
  await page.goto('/recipe');
  await page.locator('#recipe-name').fill(title);
  for (const [name, amount] of CLEAR) await addStandardMaterial(page, name, amount);
};

test('a range with the cones tested, both bands of the limits, the liner note, and a copy for another cone', async ({
  page
}) => {
  await signUpAndSignIn(page);
  await startRecipe(page, 'Wide range');
  await page.locator('#firing-low').selectOption('6');
  await page.getByLabel('A range').check();
  await page.locator('#firing-high').selectOption('10');
  // A tick per cone of the range; cone 6, given first as a single cone, stays tested.
  await expect(page.locator('.firing-ticks label')).toHaveText(['cone 6', 'cone 7', 'cone 8', 'cone 9', 'cone 10']);
  await expect(page.getByLabel('cone 6', { exact: true })).toBeChecked();
  await page.getByLabel('cone 10', { exact: true }).check();
  await expect(page.locator('.firing-tested')).toHaveText('Tested at cone 6, cone 10');
  await expect(page.locator('.firing-claimed')).toHaveText('claimed range cone 6–10');
  await expect(page.locator('.firing-approx')).toContainText('approximate');
  await page.locator('#firing-atmosphere-reduction').check();

  // The limits check both bands, side by side.
  await expect(page.locator('.limits-band')).toHaveCount(2);
  await expect(page.locator('.limits-both')).toContainText('Mid fire, cone 4–6 and High fire, cone 9–11');
  // The band is text, from the firing block; "Choose another" brings the picker.
  await expect(page.locator('#limit-firing')).toHaveCount(0);
  await expect(page.locator('#limit-firing-text')).toContainText("From the recipe's firing: Mid fire, cone 4–6");
  await page.getByRole('button', { name: 'Choose another' }).click();
  await expect(page.getByLabel('Limits for')).toBeFocused();
  await expect(page.locator('#limit-firing option').first()).toContainText("From the recipe's firing");

  await page.getByLabel('For a food surface (a liner)').check();
  await expect(page.locator('.firing-liner')).toContainText(
    'Food safety depends on firing this glaze to the cone it was tested at'
  );
  await expect(page.locator('.firing-liner')).toContainText('test it at the low end of the range');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.saved-recipe', { hasText: 'Wide range' }).locator('.saved-firing')).toHaveText(
    'Tested at cone 6, cone 10 · claimed range cone 6–10 · reduction'
  );
  // Kept: it comes back as saved.
  await page.reload();
  await page.getByRole('button', { name: 'Open Wide range' }).click();
  await expect(page.locator('.firing-tested')).toHaveText('Tested at cone 6, cone 10');
  await expect(page.getByLabel('For a food surface (a liner)')).toBeChecked();

  // Duplicate for another cone: a copy to set a new cone for, with the reason.
  await page.getByRole('button', { name: 'More for Wide range' }).click();
  await page.getByRole('button', { name: 'Duplicate Wide range for another cone' }).click();
  await expect(page.locator('#recipe-name')).toHaveValue('Wide range (another cone)');
  await expect(page.locator('#firing-low')).toBeFocused();
  await expect(page.locator('#firing-low')).toHaveValue('');
  await expect(page.locator('gc-notices')).toContainText('usually means reformulating it');
  await page.locator('#firing-low').selectOption('04');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.saved-recipe', { hasText: 'Wide range (another cone)' })).toContainText(
    'Tested at cone 04'
  );
  // The saved list filters by cone: cone 8 is inside the first recipe's range only.
  await page.locator('#saved-cone-filter').selectOption({ label: 'cone 8' });
  await expect(page.locator('.saved-recipe-open')).toHaveText(['Wide range']);
});

test("a shared recipe shows the author's own scale first, with an approximate conversion beside it", async ({
  page,
  browser
}) => {
  await signUpAndSignIn(page);
  await startRecipe(page, 'Kyoto celadon');
  await page.locator('#firing-scale').selectOption('sk');
  await page.locator('#firing-low').selectOption('10');
  await page.locator('#firing-atmosphere-reduction').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'More for Kyoto celadon' }).click();
  await page.getByRole('button', { name: 'Share Kyoto celadon' }).click();
  await page.getByRole('button', { name: 'Make a link' }).click();
  const link = await page.getByLabel('The link').inputValue();

  const other = await browser.newContext();
  const viewer = await other.newPage();
  await viewer.goto(link);
  await expect(viewer.locator('h1')).toHaveText('Kyoto celadon');
  const firing = viewer.locator('.shared-firing');
  await expect(firing.locator('.shared-firing-tested')).toHaveText('Tested at SK 10');
  await expect(firing).toContainText('reduction');
  // The reader fires to Orton cones: SK 10 is shown near cone 7 by Kyoto's measured bend, never as cone 10.
  const approx = firing.locator('.shared-firing-approx');
  await expect(approx).toContainText('approximate');
  await expect(approx).toContainText("Kyoto's municipal institute");
  await expect(approx).not.toContainText('cone 10');
  await other.close();
});

test('firing logs link both ways: a log picks its recipes, a recipe notes each result and fills in its tested cones', async ({
  page
}) => {
  await signUpAndSignIn(page);
  await startRecipe(page, 'Shino');
  await page.locator('#firing-low').selectOption('5');
  await page.getByLabel('A range').check();
  await page.locator('#firing-high').selectOption('7');
  await page.getByLabel('cone 5', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.saved-recipe-open', { hasText: 'Shino' })).toBeVisible();

  const made = await page.request.post(API + '/firing/create', {
    data: { title: 'Glaze firing 14', fieldsIncluded: ['Time', 'Cone'], rows: [['9:00', '6 down, 7 soft']] }
  });
  expect(made.ok()).toBe(true);
  const logId = (await made.json())._id;

  // The firing log page picks the recipes fired in it.
  await page.goto('/firing');
  await page.locator('#fired-pick-' + logId).selectOption({ label: 'Shino' });
  await page.locator('#fired-add-' + logId).click();
  await expect(page.locator('.fired-list')).toContainText('Shino');

  // The recipe lists the log, takes a result note, and offers the cones the log names.
  await page.goto('/recipe');
  await page.getByRole('button', { name: 'Open Shino' }).click();
  await expect(page.locator('.firings-list')).toContainText('Glaze firing 14');
  await page.getByLabel('Result in Glaze firing 14').fill('glossy, no crazing');
  await page.getByLabel('Result in Glaze firing 14').blur();
  await page.locator('#firings-fill').click();
  await expect(page.locator('.firing-tested')).toHaveText('Tested at cone 6, cone 7');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved');
  const saved = await (await page.request.get(API + '/recipe/getAll')).json();
  expect(saved[0].firings).toEqual([{ firing: logId, result: 'glossy, no crazing' }]);
  expect(saved[0].firedAt.tested).toEqual(['6', '7']);
});

test('a linked log shows on the result card for its cone and atmosphere, beside the summary written there', async ({
  page
}) => {
  await signUpAndSignIn(page);
  await startRecipe(page, 'Celadon');
  await page.locator('#firing-low').selectOption('10');
  await page.locator('#firing-atmosphere-oxidation').check();
  await page.locator('#firing-atmosphere-reduction').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.saved-recipe-open', { hasText: 'Celadon' })).toBeVisible();

  const made = await page.request.post(API + '/firing/create', {
    data: {
      title: 'Gas kiln 3',
      fieldsIncluded: ['Time', 'Cone', 'Atmosphere'],
      rows: [
        ['9:00', '', 'body reduction'],
        ['14:00', '10 down', 'reduction']
      ]
    }
  });
  expect(made.ok()).toBe(true);

  // Linked from the recipe: the log names cone 10 and reduction only, so it goes on that card.
  await page.locator('#firings-open').click();
  await page.locator('#firing-link-choice').selectOption({ label: 'Gas kiln 3' });
  await page.locator('#firing-link').click();
  const card = page.locator('details.cone-card', { hasText: 'cone 10 · reduction' });
  await expect(card).toBeVisible();
  await expect(card.locator('summary')).toContainText('1 firing log');
  await expect(card.locator('.cone-card-logs')).toContainText('Gas kiln 3');
  await card.getByLabel('How it came out at cone 10 · reduction').fill('Pale green, crackle where thick');
  await card.getByLabel('How it came out at cone 10 · reduction').blur();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.recipe-status')).toContainText('Saved');
  const saved = await (await page.request.get(API + '/recipe/getAll')).json();
  expect(saved[0].coneResults).toEqual([
    { cone: '10', atmosphere: 'reduction', summary: 'Pale green, crackle where thick' }
  ]);
  expect(saved[0].firings[0]).toMatchObject({ cone: '10', atmosphere: 'reduction' });
});

test('on a phone the firing part folds under a summary once set, and nothing runs off the screen', async ({ page }) => {
  await signUpAndSignIn(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await startRecipe(page, 'Phone firing');
  const summary = page.locator('#firing-fold > summary');
  // Empty: open, so the first thing to do is there to do.
  await expect(summary).toHaveText('Firing: not set');
  await expect(page.locator('#firing-low')).toBeVisible();
  await page.locator('#firing-low').selectOption('6');
  await page.locator('#firing-atmosphere-oxidation').check();
  await expect(summary).toHaveText('Firing: cone 6, oxidation');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.saved-recipe', { hasText: 'Phone firing' })).toBeVisible();

  // Opened from the saved list on a phone, it is closed to its summary line.
  await page.reload();
  await page.getByRole('button', { name: 'Open Phone firing' }).click();
  await expect(summary).toHaveText('Firing: cone 6, oxidation');
  await expect(page.locator('#firing-low')).toBeHidden();
  const overflow = () =>
    page.evaluate(
      () => globalThis.document.documentElement.scrollWidth - globalThis.document.documentElement.clientWidth
    );
  expect(await overflow()).toBe(0);
  await summary.click();
  await expect(page.locator('#firing-low')).toBeVisible();
  expect(await overflow()).toBe(0);
  // The limits band reads from the firing, as text.
  await expect(page.locator('#limit-firing-text')).toContainText("From the recipe's firing: Mid fire");
});
