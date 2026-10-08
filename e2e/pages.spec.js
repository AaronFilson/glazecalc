const { test, expect } = require('@playwright/test');
const { expectFieldProblem, signUpAndSignIn } = require('./helpers');

const errors = (page) => page.locator('.errors-section');
const messages = (page) => page.locator('.server-msg');

// Picks an option and fills the amount box of the line it adds, once that box exists.
const addPart = async (page, select, value, button, amount, amountClass) => {
  const boxes = page.locator(amountClass);
  const before = await boxes.count();
  await page.locator(select).selectOption(value);
  await page.getByRole('button', { name: button }).click();
  await expect(boxes).toHaveCount(before + 1);
  await boxes.last().fill(String(amount));
};

test.beforeEach(async ({ page, request }) => {
  await signUpAndSignIn(page);
});

test.describe('home and navigation', () => {
  const MENU = [
    ['Recipes', 'recipe', 'Recipes'],
    ['Materials', 'material', 'Materials'],
    ['Additives', 'additive', 'Additives and colorants'],
    ['Firing logs', 'firing', 'Firing logs'],
    ['Notes', 'notes', 'Notes'],
    ['Advice', 'advice', 'Glaze advice'],
    ['Guides', 'guides', 'Guides']
  ];

  test('the menu reaches every page, and the brand goes home', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('h1')).toHaveText('Your studio notebook');

    for (const [label, path, heading] of MENU) {
      await page.locator('.nav-links').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp('/' + path + '$'));
      await expect(page.locator('h1')).toHaveText(heading);
      await expect(page.locator('.nav-links a[aria-current="page"]')).toHaveText(label);
      await expect(page).toHaveTitle(/Glazecalc/);
      await page.locator('.brand').click();
      await expect(page).toHaveURL(/\/home$/);
    }
  });

  test('the home page cards and the root URL go where expected', async ({ page }) => {
    await page.goto('/home');
    await page.locator('.home-card', { hasText: 'Firing logs' }).click();
    await expect(page).toHaveURL(/\/firing$/);
    // Signed in, the site's root address goes home.
    await page.goto('/');
    await expect(page).toHaveURL(/\/home$/);
  });

  test('signed-out visitors to a data page go to sign in, without errors', async ({ browser }) => {
    const visitor = await browser.newPage();
    const problems = [];
    visitor.on('response', (r) => r.status() >= 400 && problems.push(r.status() + ' ' + r.url()));
    await visitor.goto('/recipe');
    await expect(visitor).toHaveURL(/\/signin$/);
    await expect(visitor.locator('.errors-section')).toHaveCount(0);
    expect(problems).toEqual([]);
    await visitor.close();
  });

  test('visitors can read the public pages', async ({ browser }) => {
    const visitor = await browser.newPage();
    for (const [path, heading] of [
      ['/advice', 'Glaze advice'],
      ['/guides', 'Guides'],
      ['/guides/glazing-basics', 'Glazing from first principles'],
      ['/guides/making-a-glaze', 'How to make a glaze'],
      ['/guides/safe-mixing', 'Safe mixing and ventilation'],
      ['/guides/home-safety', "Don't poison your family"],
      ['/guides/firing', 'Firing a basic kiln'],
      ['/about', 'About Glazecalc'],
      ['/privacy', 'Privacy']
    ]) {
      await visitor.goto(path);
      await expect(visitor.locator('h1')).toHaveText(heading);
    }
    await visitor.goto('/advice');
    await expect(visitor.locator('.general-advice li')).toHaveCount(8);
    await expect(visitor.locator('form')).toHaveCount(0);
    await visitor.close();
  });

  test('the trash page explains that trash is not available yet', async ({ page }) => {
    await page.goto('/trash');
    await expect(page.locator('h1')).toHaveText('Trash');
    await expect(page.locator('.help-text')).toContainText('trash functionality is coming soon');
  });

  test('pages show no errors when they load', async ({ page }) => {
    const problems = [];
    page.on('pageerror', (err) => problems.push(err.message));
    page.on('console', (msg) => msg.type() === 'error' && problems.push(msg.text()));
    for (const name of ['home', 'additive', 'advice', 'firing', 'material', 'notes', 'recipe', 'trash', 'account']) {
      await page.goto('/' + name);
      await expect(page.locator('h1')).toBeVisible();
      await expect(errors(page)).toHaveCount(0);
    }
    expect(problems).toEqual([]);
  });

  test('the phone menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/home');
    const toggle = page.getByRole('button', { name: 'Menu' });
    await expect(page.locator('.nav-links')).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.nav-links').getByRole('link', { name: 'Notes' }).click();
    await expect(page).toHaveURL(/\/notes$/);
    await expect(page.locator('.nav-links')).toBeHidden();
  });
});

test.describe('additives', () => {
  test('lists the standard additives', async ({ page }) => {
    await page.goto('/additive');
    const standard = page.locator('section', { hasText: 'The standard server additives:' });
    const row = standard.locator('tr', { has: page.locator('td', { hasText: /^\s*Cobalt carbonate\s*$/ }) });
    // From the supplier's data sheet: a weight-percent analysis.
    await expect(row).toContainText('CoO 58.49%');
  });

  test('saves an additive as fired oxides, then removes it', async ({ page }) => {
    await page.goto('/additive');
    await page.locator('#additive-name').fill('Blue stain');
    await page.locator('#formula').fill('CoAl2O4');
    await page.locator('#notes').fill('Spinel');
    await page.locator('#additive-loi').fill('0');
    await addPart(page, '#additive-oxide', 'CoO', 'Add the oxide to the list', 1, '.part-amount');
    await addPart(page, '#additive-oxide', 'Al2O3', 'Add the oxide to the list', 1, '.part-amount');
    await addPart(page, '#additive-oxide', 'ZnO', 'Add the oxide to the list', 0.1, '.part-amount');
    await page.locator('li', { hasText: 'ZnO' }).getByRole('button', { name: 'Remove from formula list' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(messages(page)).toContainText('Additive added');
    const mine = page.locator('section', { hasText: 'My server additives / colorants:' });
    const row = mine.locator('tr', { hasText: 'Blue stain' });
    await expect(row).toContainText('Spinel');
    await expect(row).toContainText('CoO : 1; Al₂O₃ : 1');
    // Typed with plain numbers, shown with subscripts.
    await expect(row).toContainText('CoAl₂O₄');

    await page.reload();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Remove Blue stain' }).click();
    await expect(row).toContainText("Saved recipes keep their own copy, so they won't change.");
    await row.getByRole('button', { name: 'Yes, remove' }).click();
    await expect(messages(page)).toContainText('Removed "Blue stain".');
    await expect(page.locator('section', { hasText: 'My server additives / colorants:' })).toHaveCount(0);
  });

  test('asks for an oxide before adding one', async ({ page }) => {
    await page.goto('/additive');
    await page.getByRole('button', { name: 'Add the oxide to the list' }).click();
    await expectFieldProblem(page, 'additive-oxide', 'Choose an oxide, then Add the oxide to the list.');
    await expect(page.locator('#additive-oxide')).toBeFocused();
    await page.locator('#additive-oxide').selectOption('CoO');
    await page.getByRole('button', { name: 'Add the oxide to the list' }).click();
    await expect(page.locator('#additive-oxide')).not.toHaveAttribute('aria-invalid');
    await expect(errors(page)).toHaveCount(0);
  });
});

test.describe('advice', () => {
  test('shows general advice and saves, lists and removes my own', async ({ page }) => {
    await page.goto('/advice');
    // The standard advice from data/advice.ndjson.
    await expect(page.locator('.general-advice li')).toHaveCount(8);
    await expect(page.locator('.general-advice')).toContainText('Have a system to your process.');
    await expect(page.locator('.general-advice')).toContainText('Tags: system, methods, records');

    await page.locator('#advice-title').fill('Wax resist');
    await page.locator('#advice-tags').fill('glazing');
    await page.locator('#advice-content').fill('Wax the foot ring before dipping.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(messages(page)).toContainText('adding to the advice records');
    await expect(page.locator('.my-advice')).toContainText('Wax the foot ring before dipping.');
    await expect(page.locator('.my-advice')).toContainText('Tags: glazing');

    await page.reload();
    const mine = page.locator('.my-advice li', { hasText: 'Wax resist' });
    await expect(mine).toBeVisible();
    await mine.getByRole('button', { name: 'Remove Wax resist' }).click();
    await mine.getByRole('button', { name: 'Yes, remove' }).click();
    await expect(messages(page)).toContainText('Removed "Wax resist".');
    await expect(mine).toHaveCount(0);
    await expect(page.locator('.my-advice')).toContainText('Nothing saved yet.');
  });

  test('needs a title and content', async ({ page }) => {
    await page.goto('/advice');
    await page.locator('#advice-title').fill('Only a title');
    await page.getByRole('button', { name: 'Save' }).click();
    await expectFieldProblem(page, 'advice-content', 'Write the advice.');
    await expect(page.locator('#advice-content')).toBeFocused();
    await expect(page.locator('#advice-title')).not.toHaveAttribute('aria-invalid');
  });
});

test.describe('notes', () => {
  test('saves, lists and removes notes', async ({ page }) => {
    await page.goto('/notes');
    await page.locator('#title').fill('Kiln');
    await page.locator('#content').fill('Element 3 needs replacing.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(messages(page)).toContainText('adding the note');
    await expect(page.locator('#title')).toHaveValue('');

    await page.reload();
    const note = page.locator('.my-notes li', { hasText: 'Kiln' });
    await expect(note).toContainText('Element 3 needs replacing.');
    await note.getByRole('button', { name: 'Remove Kiln' }).click();
    await note.getByRole('button', { name: 'Yes, remove' }).click();
    await expect(messages(page)).toContainText('Removed "Kiln".');
    await expect(page.locator('.my-notes li')).toHaveCount(0);
  });

  test('needs a title and a note', async ({ page }) => {
    await page.goto('/notes');
    await page.getByRole('button', { name: 'Save' }).click();
    await expectFieldProblem(page, 'title', 'Give the note a title.');
    await expectFieldProblem(page, 'content', 'Write the note.');
    await expect(page.locator('#title')).toBeFocused();
  });
});

test.describe('firing log', () => {
  const cells = (page) => page.locator('.firing-table input');

  test('builds a log, rearranges columns with their data, saves and removes it', async ({ page }) => {
    await page.goto('/firing');
    await page.locator('#firing-title').fill('Cone 10 reduction');
    await page.locator('#firing-kiln').fill('Car kiln');
    await page.locator('#firing-date').fill('2026-10-03');
    for (const field of ['Time', 'Cone', 'Damper']) {
      await page.locator('#fieldselect').selectOption(field);
      await page.getByRole('button', { name: 'Add the field' }).click();
    }
    await page.getByRole('button', { name: 'Add a row to the firing table' }).click();
    await page.getByRole('button', { name: 'Add a row to the firing table' }).click();
    await page.getByLabel('Time row 1').fill('8:00');
    await page.getByLabel('Cone row 1').fill('010');
    await page.getByLabel('Time row 2').fill('9:30');
    await page.getByLabel('Cone row 2').fill('06');

    // Moving Time right keeps its values under its heading.
    await page
      .locator('.included-fields li', { hasText: 'Time' })
      .getByRole('button', { name: 'Move field right' })
      .click();
    await expect(page.locator('.firing-table th')).toHaveText(['Cone', 'Time', 'Damper', 'Row actions']);
    await expect(page.getByLabel('Time row 1')).toHaveValue('8:00');
    await expect(page.getByLabel('Cone row 2')).toHaveValue('06');

    // A field added after rows gets an empty box in every row.
    await page.locator('#fieldselect').selectOption('Temperature F');
    await page.getByRole('button', { name: 'Add the field' }).click();
    await expect(cells(page)).toHaveCount(8);
    await page.getByLabel('Temperature F row 2').fill('1830');

    // Removing a field and a row drops their cells.
    await page
      .locator('.included-fields li', { hasText: 'Damper' })
      .getByRole('button', { name: 'Remove the field' })
      .click();
    await page.locator('.firing-table tr').nth(1).getByRole('button', { name: 'Remove row' }).click();
    await expect(cells(page)).toHaveCount(3);
    await expect(page.getByLabel('Time row 1')).toHaveValue('9:30');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(messages(page)).toContainText('adding the firing record');
    await expect(cells(page)).toHaveCount(0);

    await page.reload();
    const stored = page.locator('.stored-firing', { hasText: 'Cone 10 reduction' });
    await expect(stored).toContainText('Using kiln: Car kiln');
    await expect(stored).toContainText('Saturday, October 3, 2026');
    await expect(stored.locator('th')).toHaveText(['Cone', 'Time', 'Temperature F']);
    await expect(stored.locator('td')).toHaveText(['06', '9:30', '1830']);

    await stored.getByRole('button', { name: 'Remove Cone 10 reduction' }).click();
    await stored.getByRole('button', { name: 'Yes, remove' }).click();
    await expect(messages(page)).toContainText('Removed "Cone 10 reduction".');
    await expect(page.locator('.stored-firing')).toHaveCount(0);
  });

  test('keeps move buttons from running off either end and rows from starting with no fields', async ({ page }) => {
    await page.goto('/firing');
    await expect(page.getByRole('button', { name: 'Add a row to the firing table' })).toBeDisabled();
    await page.getByRole('button', { name: 'Add the field' }).click();
    const only = page.locator('.included-fields li');
    await expect(only.getByRole('button', { name: 'Move field left' })).toBeDisabled();
    await expect(only.getByRole('button', { name: 'Move field right' })).toBeDisabled();
  });

  test('needs a title and a field before saving', async ({ page }) => {
    await page.goto('/firing');
    await page.getByRole('button', { name: 'Save' }).click();
    await expectFieldProblem(page, 'firing-title', 'Give the firing a title.');
    await expectFieldProblem(page, 'fieldselect', 'Add at least one field to record, such as Time.');
    await page.getByRole('button', { name: 'Add the field' }).click();
    await expect(page.locator('#fieldselect')).not.toHaveAttribute('aria-invalid');
  });
});

test('a tab opened before a new version loads the page afresh when its old code is gone', async ({ page }) => {
  await page.goto('/home');
  await expect(page.locator('h1')).toHaveText('Your studio notebook');
  // After a deploy, the code file this tab would ask for next no longer exists.
  await page.route(/\/chunk-[^/]+\.js$/, (route) => route.fulfill({ status: 404, body: 'Not found' }), { times: 1 });
  await page.locator('.nav-links').getByRole('link', { name: 'Advice' }).click();
  await expect(page).toHaveURL(/\/advice$/);
  await expect(page.locator('h1')).toHaveText('Glaze advice');
});

test('"Skip to content" moves to the page without reloading it', async ({ page }) => {
  await page.goto('/recipe');
  // It is the first thing a keyboard user reaches.
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();

  // Used partway through a recipe, it keeps what has been typed.
  await page.locator('#recipe-name').fill('Not saved yet');
  await skip.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/recipe$/);
  await expect(page.locator('main#main')).toBeFocused();
  await expect(page.locator('#recipe-name')).toHaveValue('Not saved yet');
});
