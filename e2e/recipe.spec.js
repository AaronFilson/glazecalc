const { test, expect } = require('@playwright/test');
const chemistry = require('../lib/chemistry');
const standardData = require('../data');
const {
  API,
  addColorant,
  addMaterial,
  addStandardMaterial,
  expectFieldProblem,
  signUpAndSignIn
} = require('./helpers');

const standard = {};
standardData.load('materials').forEach((material) => (standard[material.name] = material));

const DOLOMITE_MATTE = [
  ['Orthoclase', 40],
  ['Silica', 20],
  ['Whiting', 10],
  ['Dolomite', 20],
  ['China Clay', 10]
];
const LABELS = { K2O: 'K₂O', CaO: 'CaO', MgO: 'MgO', Al2O3: 'Al₂O₃', SiO2: 'SiO₂' };

const unity = (page) => page.locator('.unity-panel');
const saved = (page) => page.locator('.saved-recipes');
const save = (page, label = 'Save') => page.getByRole('button', { name: label, exact: true }).click();
const amount = (page, name) => page.getByRole('textbox', { name: 'Amount of ' + name, exact: true });

test.beforeEach(async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto('/recipe');
  // The standard materials have loaded into the library: all but those with lead, which is off unless chosen.
  const withoutLead = standardData
    .load('materials')
    .filter((m) => !m.fields.some((field) => field.name === 'PbO' && Number(field.amount) > 0));
  await expect(page.locator('.library', { hasText: 'Add materials' })).toContainText(
    `Standard (${withoutLead.length})`
  );
});

test('shows the unity formula of a dolomite matte as it is typed', async ({ page }) => {
  await expect(unity(page)).toContainText('Add materials and their amounts');
  for (const [name, grams] of DOLOMITE_MATTE) await addStandardMaterial(page, name, grams);

  // The old equivalent-weight bug reported MgO 0.194 for this recipe.
  await expect(unity(page)).toContainText('MgO : 0.279');
  const expected = chemistry.calculateUMF(
    DOLOMITE_MATTE.map(([name, grams]) => ({ material: standard[name], amount: grams }))
  );
  for (const oxide of Object.keys(LABELS)) {
    await expect(unity(page)).toContainText(new RegExp(LABELS[oxide] + '\\s*:\\s*' + expected.umf[oxide].toFixed(3)));
  }
  await expect(unity(page)).toContainText('Ratio of Silica to Alumina : ' + expected.siAlRatio.toFixed(2));
  await expect(page.locator('.recipe-total')).toHaveText('100');

  // A change shows at once: no dolomite, no magnesium.
  await amount(page, 'Dolomite').fill('0');
  await expect(unity(page)).not.toContainText('MgO');
});

test('saves a recipe, keeps it open, and saves changes to the same recipe', async ({ page }) => {
  await page.locator('#recipe-name').fill('Dolomite Matte');
  for (const [name, grams] of DOLOMITE_MATTE) await addStandardMaterial(page, name, grams);
  await expect(page.locator('.recipe-status')).toHaveText('Not saved yet');
  await save(page);

  await expect(page.locator('.server-msg')).toContainText('Saved "Dolomite Matte".');
  await expect(page.locator('.recipe-status')).toContainText('Saved at');
  await expect(page.locator('#recipe-name')).toHaveValue('Dolomite Matte');
  await expect(amount(page, 'Dolomite')).toHaveValue('20');
  await expect(saved(page).locator('.saved-recipe')).toHaveCount(1);
  await expect(saved(page)).toContainText('Open above');

  // Change it and save again: the same recipe is updated, not copied.
  await amount(page, 'Dolomite').fill('0');
  await expect(page.locator('.recipe-status')).toHaveText('Changes not saved yet');
  await save(page);
  await expect(page.locator('.recipe-status')).toContainText('Saved at');
  await expect(saved(page).locator('.saved-recipe')).toHaveCount(1);

  // After a reload it is in the list, with the changed amounts, and can be opened again.
  await page.reload();
  const entry = saved(page).locator('.saved-recipe', { hasText: 'Dolomite Matte' });
  await entry.getByRole('button', { name: 'Expand to View' }).click();
  await expect(entry).toContainText('Dolomite : 0');
  await expect(entry).not.toContainText('MgO');
  await entry.getByRole('button', { name: 'Open' }).click();
  await expect(page.locator('#recipe-name')).toHaveValue('Dolomite Matte');
  await expect(amount(page, 'Orthoclase')).toHaveValue('40');
  await expect(unity(page)).toContainText('K₂O');
});

test('"Save and add next recipe" starts a fresh one; "Save as a copy" keeps the original', async ({ page }) => {
  await page.locator('#recipe-name').fill('First');
  await addStandardMaterial(page, 'Whiting', 20);
  await addStandardMaterial(page, 'Silica', 30);
  await save(page, 'Save and add next recipe');
  await expect(page.locator('.server-msg')).toContainText('Saved "First". Ready for the next recipe.');
  await expect(page.locator('#recipe-name')).toHaveValue('');
  await expect(page.locator('#recipe-name')).toBeFocused();
  await expect(page.locator('.recipe-materials')).toHaveCount(0);

  await saved(page).locator('.saved-recipe', { hasText: 'First' }).getByRole('button', { name: 'Open' }).click();
  await page.locator('#recipe-name').fill('First, more silica');
  await amount(page, 'Silica').fill('40');
  await save(page, 'Save as a copy');
  await expect(saved(page).locator('.saved-recipe')).toHaveCount(2);
  const original = saved(page).locator('.saved-recipe').first();
  await expect(original).toContainText('First');
  await expect(original).not.toContainText('more silica');
  await original.getByRole('button', { name: 'Expand to View' }).click();
  await expect(original).toContainText('Silica : 30');
});

test('asks before dropping changes that are not saved', async ({ page }) => {
  await page.locator('#recipe-name').fill('Unsaved');
  await addStandardMaterial(page, 'Whiting', 20);
  await page.getByRole('button', { name: 'New recipe' }).click();
  await expect(page.locator('.recipe-unsaved')).toContainText('changes that are not saved');
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.locator('#recipe-name')).toHaveValue('Unsaved');

  await page.getByRole('button', { name: 'New recipe' }).click();
  await page.getByRole('button', { name: 'Discard them' }).click();
  await expect(page.locator('#recipe-name')).toHaveValue('');
});

test('uses my own materials and lists additives with the result', async ({ page }) => {
  // A user material saved through the API, as the materials page would.
  const myWhiting = { ...standard['Whiting'], name: 'My Whiting' };
  delete myWhiting._id;
  const res = await page.request.post(API + '/materials/create', { data: myWhiting });
  expect(res.ok()).toBeTruthy();
  await page.reload();

  await page.locator('#recipe-name').fill('Mine');
  // My own list comes first, and holds only my materials.
  const library = page.locator('.library', { hasText: 'Add materials' });
  await expect(library.getByRole('button', { name: /^My materials/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(library.locator('.library-list li')).toHaveCount(1);
  await addMaterial(page, 'My Whiting', 20, 'My materials');
  await addStandardMaterial(page, 'Silica', 30);

  const additives = page.locator('.library', { hasText: 'Add colorants and additives' });
  await additives.getByRole('button', { name: /^Standard/ }).click();
  await additives.getByRole('searchbox').fill('cobalt carb');
  await additives.getByRole('button', { name: 'Add Cobalt carbonate' }).click();
  await amount(page, 'Cobalt carbonate').fill('0.5');

  await expect(unity(page)).toContainText('CaO : 1.000');
  // Additives are listed but not part of the unity formula.
  await expect(unity(page)).toContainText('Cobalt carbonate : 0.5%');
  await expect(unity(page)).not.toContainText('CoO');

  await save(page);
  const entry = saved(page).locator('.saved-recipe', { hasText: 'Mine' });
  await entry.getByRole('button', { name: 'Expand to View' }).click();
  await expect(entry).toContainText('My Whiting : 20');
  await expect(entry).toContainText('Cobalt carbonate : 0.5%');
});

test('changes the scale: to parts, to percent and to a batch', async ({ page }) => {
  for (const [name, grams] of [
    ['Orthoclase', 40],
    ['Silica', 30],
    ['Whiting', 20],
    ['China Clay', 10]
  ]) {
    await addStandardMaterial(page, name, grams);
  }
  const amounts = () => page.locator('input.material-amount').evaluateAll((inputs) => inputs.map((i) => i.value));
  const before = await unity(page).locator('gc-unity-formula').textContent();

  await page.getByRole('button', { name: 'To parts' }).click();
  await expect.poll(amounts).toEqual(['4', '3', '2', '1']);
  await expect(page.locator('.recipe-scale-note')).toHaveText('Now in parts: whole numbers where they fit.');
  await page.getByRole('button', { name: 'To percent' }).click();
  await expect.poll(amounts).toEqual(['40', '30', '20', '10']);
  await page.getByRole('button', { name: 'Scale to a batch' }).click();
  await page.getByLabel('Batch weight (g)').fill('500');
  await page.getByLabel('Batch weight (g)').press('Enter');
  await expect.poll(amounts).toEqual(['200', '150', '100', '50']);
  // The proportions, and so the unity formula, are unchanged.
  expect(await unity(page).locator('gc-unity-formula').textContent()).toBe(before);
});

test('colorants in % of base stay as they are when the scale changes; in parts or grams they change', async ({
  page
}) => {
  await addStandardMaterial(page, 'Orthoclase', 60);
  await addStandardMaterial(page, 'Whiting', 40);
  await addColorant(page, 'Cobalt carbonate', 1);
  await addColorant(page, 'Rutile', 4);
  const rutile = page.locator('.recipe-additives tr', { hasText: 'Rutile' });
  await expect(rutile.getByRole('radio', { name: '% of base' })).toBeChecked();
  await rutile.getByText('grams', { exact: true }).click();
  await expect(rutile.getByRole('radio', { name: 'grams' })).toBeChecked();

  await page.getByRole('button', { name: 'Scale to a batch' }).click();
  await page.getByLabel('Batch weight (g)').fill('500');
  await page.getByLabel('Batch weight (g)').press('Enter');
  await expect(amount(page, 'Orthoclase')).toHaveValue('300');
  await expect(amount(page, 'Cobalt carbonate')).toHaveValue('1');
  await expect(amount(page, 'Rutile')).toHaveValue('20');
  await expect(unity(page)).toContainText('Cobalt carbonate : 1%');
  await expect(unity(page)).toContainText('Rutile : 20 g');

  // An amount that is not a number stops it, with the reason beside the buttons.
  // (20,5 is a number now, in either decimal style; 20,5,1 is not.)
  await amount(page, 'Whiting').fill('20,5,1');
  await page.getByRole('button', { name: 'To percent' }).click();
  await expect(page.locator('.recipe-scale-note')).toHaveText(
    'The amount for Whiting is not a number ("20,5,1"). Please fix it first.'
  );
  await expect(amount(page, 'Orthoclase')).toHaveValue('300');
});

test('counts colorants in the unity formula only when asked, and saves the choice', async ({ page }) => {
  await page.locator('#recipe-name').fill('Cobalt blue');
  await addStandardMaterial(page, 'Whiting', 20);
  await addStandardMaterial(page, 'Silica', 30);
  await addColorant(page, 'Cobalt carbonate', 1);
  const include = page.getByLabel('Count colorants and additives in it');
  await expect(include).not.toBeChecked();
  await expect(unity(page)).not.toContainText('CoO');

  await include.check();
  await expect(unity(page)).toContainText('CoO');
  await expect(unity(page)).toContainText('Counted in the unity formula');
  await save(page);
  await expect(page.locator('.recipe-status')).toContainText('Saved at');

  // Opened again after a reload, it still counts its colorant.
  await page.reload();
  const entry = saved(page).locator('.saved-recipe', { hasText: 'Cobalt blue' });
  await entry.getByRole('button', { name: 'Expand to View' }).click();
  await expect(entry).toContainText('counting colorants and additives');
  await entry.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByLabel('Count colorants and additives in it')).toBeChecked();
  await expect(unity(page)).toContainText('CoO');
});

test('keeps edits, and the focus, when asked about unsaved changes', async ({ page }) => {
  await page.locator('#recipe-name').fill('Draft');
  await addStandardMaterial(page, 'Whiting', 20);
  const newRecipe = page.getByRole('button', { name: 'New recipe' });
  await newRecipe.click();
  // The question is at the top of the editor, starting on the safe answer.
  await expect(page.getByRole('group', { name: 'This recipe has changes that are not saved.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.recipe-unsaved')).toHaveCount(0);
  await expect(newRecipe).toBeFocused();
  await expect(page.locator('#recipe-name')).toHaveValue('Draft');
});

test('removes a material from the recipe and a saved recipe from the list', async ({ page }) => {
  await page.locator('#recipe-name').fill('Short lived');
  await addStandardMaterial(page, 'Whiting', 20);
  await addStandardMaterial(page, 'Dolomite', 10);
  await page.getByRole('button', { name: 'Remove Dolomite from the recipe' }).click();
  await expect(page.locator('.recipe-materials tbody tr')).toHaveCount(1);
  await save(page);
  await expect(saved(page).locator('.saved-recipe', { hasText: 'Short lived' })).toBeVisible();

  // It is open above, so the question says what happens to it.
  const entry = saved(page).locator('.saved-recipe', { hasText: 'Short lived' });
  await entry.getByRole('button', { name: 'Remove Short lived' }).click();
  await expect(entry).toContainText('It stays open above, as a recipe not saved yet.');
  await entry.getByRole('button', { name: 'Yes, remove' }).click();
  await expect(page.locator('.server-msg')).toContainText('Removed "Short lived".');
  await expect(entry).toHaveCount(0);
  await expect(page.locator('#recipe-name')).toHaveValue('Short lived');
  await expect(page.locator('.recipe-status')).toHaveText('Not saved yet');
});

test('says when a recipe has no flux, and will not save it', async ({ page }) => {
  await page.locator('#recipe-name').fill('Just Silica');
  await addStandardMaterial(page, 'Silica', 100);
  await expect(page.locator('.unity-problem')).toContainText('no flux');
  await save(page);

  // Said beside the save buttons, where the person is looking.
  await expect(page.locator('.recipe-save-problem')).toContainText('no flux');
  await expect(page.locator('.server-msg')).toHaveCount(0);
  await expect(saved(page)).not.toContainText('Just Silica');
});

test('asks for an amount for every material', async ({ page }) => {
  await page.locator('#recipe-name').fill('No amount');
  const library = page.locator('.library', { hasText: 'Add materials' });
  await library.getByRole('button', { name: /^Standard/ }).click();
  await library.getByRole('searchbox').fill('Whiting');
  await library.getByRole('button', { name: 'Add Whiting', exact: true }).click();
  // The cursor is ready in the new amount.
  await expect(amount(page, 'Whiting')).toBeFocused();
  await save(page);
  await expectFieldProblem(page, 'material-amount-0', 'Enter an amount (0 is fine).');
  await expect(amount(page, 'Whiting')).toBeFocused();
  // Fixed, the mark goes as it is typed.
  await amount(page, 'Whiting').fill('20');
  await expect(amount(page, 'Whiting')).not.toHaveAttribute('aria-invalid');
});

test('the instructions can be hidden, stay hidden, and come back', async ({ page }) => {
  const heading = page.getByRole('heading', { name: 'How to use the recipe calculator' });
  await expect(heading).toBeVisible();
  await page.getByRole('button', { name: 'Hide these instructions' }).click();
  await page.reload();
  await expect(heading).toHaveCount(0);
  await page.getByRole('button', { name: 'How to use this page' }).click();
  await expect(heading).toBeVisible();
});

test('fits the narrowest phone, 320px, without scrolling sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.locator('#recipe-name').fill('Phone test');
  await addStandardMaterial(page, 'Nepheline Syenite (Norwegian, UK)', 30);
  await addStandardMaterial(page, 'Wollastonite (NYAD 400)', 20);
  await addColorant(page, 'Spanish red iron oxide', 2);
  await save(page);
  // The saved recipe's buttons are the widest row.
  await expect(saved(page).getByRole('button', { name: 'Compare Phone test' })).toBeVisible();
  const overflow = await page.evaluate(
    () => globalThis.document.documentElement.scrollWidth - globalThis.document.documentElement.clientWidth
  );
  expect(overflow).toBe(0);
});

test('scales to a batch in pounds once weights are in pounds and ounces, showing each as a scale reads it', async ({
  page
}) => {
  await page.goto('/account');
  await page.getByRole('radio', { name: /^Pounds and ounces/ }).check();
  await expect(page.locator('.settings-status')).toHaveText('Saved: batch weights are in pounds and ounces.');
  await page.goto('/recipe');
  await page.setViewportSize({ width: 320, height: 800 });
  await addStandardMaterial(page, 'Orthoclase', 60);
  await addStandardMaterial(page, 'Whiting', 40);
  await addColorant(page, 'Rutile', 4);

  await page.getByRole('button', { name: 'Scale to a batch' }).click();
  await page.getByLabel('Batch weight (lb)').fill('12.5');
  await page.getByLabel('Batch weight (lb)').press('Enter');
  await expect(amount(page, 'Orthoclase')).toHaveValue('7.5');
  await expect(amount(page, 'Rutile')).toHaveValue('4');
  // Each material, the total, then the rutile: 4% of 12.5 lb.
  await expect(page.locator('.recipe-weight')).toHaveText(['7 lb 8 oz', '5 lb', '12 lb 8 oz', '8 oz']);
  const overflow = await page.evaluate(
    () => globalThis.document.documentElement.scrollWidth - globalThis.document.documentElement.clientWidth
  );
  expect(overflow).toBe(0);
});
