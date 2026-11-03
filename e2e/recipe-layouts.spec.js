// The recipe form's other layouts (client/app/pages/recipe/recipe-layout.ts): the workbench (A) and guided
// steps (B), chosen on the page or with ?layout=. The core flow in each: title, materials with amounts, a
// colorant, Save; and no WCAG problems axe can find, on a desktop and a phone.
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { API, addColorant, addStandardMaterial, signUpAndSignIn } = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const accessible = async (page, label) => {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(
    violations.map((v) => `${v.id} (${v.impact}): ${v.help} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    label
  ).toEqual([]);
};

const savedRecipes = async (page) => (await page.request.get(API + '/recipe/getAll')).json();

test.describe.configure({ timeout: 90000 });

for (const [where, viewport] of Object.entries({
  'a desktop': { width: 1280, height: 800 },
  'a phone, 390 px wide': { width: 390, height: 800 }
})) {
  test.describe(where, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await signUpAndSignIn(page);
    });

    test('the workbench: a recipe made and saved, formula and limits beside it', async ({ page }) => {
      await page.goto('/recipe');
      // Chosen on the page, and kept.
      await page.getByText('Workbench', { exact: true }).click();
      await expect(page.locator('.layout-workbench')).toBeVisible();
      expect(await page.evaluate(() => globalThis.localStorage.getItem('recipeLayout'))).toBe('workbench');

      await page.locator('#recipe-name').fill('Bench celadon');
      await addStandardMaterial(page, 'Custer Spar', 30);
      await addStandardMaterial(page, 'Silica', 30);
      await addStandardMaterial(page, 'Whiting', 20);
      await addStandardMaterial(page, 'EPK Kaolin', 20);
      await addColorant(page, 'Red iron oxide', 1.5);
      await expect(page.locator('.workbench-side .unity-panel')).toContainText('SiO');
      await expect(page.locator('.workbench-side .limits-table').first()).toBeAttached();
      if (viewport.width < 992) await expect(page.locator('.workbench-peek')).toContainText('SiO');
      else await expect(page.locator('.workbench-peek')).toBeHidden();

      await page.locator('#details-fold > summary').click();
      await expect(page.locator('#recipe-notes')).toBeVisible();
      await page.locator('#fix-fold > summary').click();
      await accessible(page, 'the workbench, its folds open');

      await page.locator('.editor-top').getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.locator('.recipe-status')).toContainText('Saved');
      const [recipe] = await savedRecipes(page);
      expect(recipe.title).toBe('Bench celadon');
      expect(recipe.materials).toHaveLength(4);
      expect(recipe.additives).toHaveLength(1);

      // Still the workbench on the next visit.
      await page.reload();
      await expect(page.locator('.layout-workbench')).toBeVisible();
    });

    test('guided steps: recipe, amounts with the additives under them, check, save', async ({ page }) => {
      await page.goto('/recipe?layout=b');
      await expect(page.locator('.layout-guided')).toBeVisible();
      const steps = page.getByRole('navigation', { name: 'Steps' });
      await expect(steps.locator('[aria-current="step"]')).toContainText('Recipe');
      await page.locator('#recipe-name').fill('Guided celadon');
      await accessible(page, 'step 1, the recipe');

      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.locator('#guided-step-1')).toBeFocused();
      // The formula is out of the way while the amounts are typed.
      await expect(page.locator('.unity-panel')).toBeHidden();
      await addStandardMaterial(page, 'Custer Spar', 30);
      await addStandardMaterial(page, 'Silica', 30);
      await addStandardMaterial(page, 'Whiting', 20);
      await addStandardMaterial(page, 'EPK Kaolin', 20);
      await addColorant(page, 'Red iron oxide', 1.5);
      // The additives are under the materials.
      const materialsBox = await page.locator('.recipe-materials').boundingBox();
      const additivesBox = await page.locator('.recipe-additives').boundingBox();
      expect(additivesBox.y).toBeGreaterThan(materialsBox.y + materialsBox.height);
      await accessible(page, 'step 2, the amounts');

      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.locator('.unity-panel')).toBeVisible();
      await expect(page.locator('.unity-panel')).toContainText('SiO');
      await accessible(page, 'step 3, the check');

      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('.recipe-save').getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.locator('.recipe-status')).toContainText('Saved');
      await accessible(page, 'step 4, saved');
      const [recipe] = await savedRecipes(page);
      expect(recipe.title).toBe('Guided celadon');
      expect(recipe.materials).toHaveLength(4);
      expect(recipe.additives).toHaveLength(1);
      // ?layout= chose for the visit only.
      expect(await page.evaluate(() => globalThis.localStorage.getItem('recipeLayout'))).toBeNull();
    });
  });
}
