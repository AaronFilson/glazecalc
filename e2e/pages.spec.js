const { test, expect } = require('@playwright/test');
const { signUpAndSignIn } = require('./helpers');

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
  await signUpAndSignIn(page, request);
});

test.describe('home and navigation', () => {
  const PAGES = ['additive', 'advice', 'firing', 'material', 'notes', 'recipe'];

  test('links from home reach every page and back', async ({ page }) => {
    await page.goto('/#/home');
    await expect(page.locator('nav h3')).toHaveText('You are on the Home page.');
    await expect(page.locator('.home-text')).toContainText('welcome to the Glaze Calc App');

    for (const name of PAGES) {
      await page.locator('nav').getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp('#/' + name + '$'));
      const title = name.charAt(0).toUpperCase() + name.slice(1);
      await expect(page.locator('nav h3')).toHaveText('You are on the ' + title + ' page.');
      await expect(page).toHaveTitle(/Glazecalc/);
      await page.locator('nav').getByRole('link', { name: 'home', exact: true }).click();
      await expect(page).toHaveURL(/#\/home$/);
    }
  });

  test('the header Home link and the root URL go where expected', async ({ page }) => {
    await page.goto('/#/notes');
    await page.locator('header.header-text').getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/#\/home$/);
    await page.goto('/');
    await expect(page).toHaveURL(/#\/signin$/);
  });

  test('the trash page explains that trash is not available yet', async ({ page }) => {
    await page.goto('/#/trash');
    await expect(page.locator('nav h3')).toHaveText('You are on the Trash page.');
    await expect(page.locator('.help-text')).toContainText('trash functionality is coming soon');
  });

  test('pages show no errors when they load', async ({ page }) => {
    const problems = [];
    page.on('pageerror', (err) => problems.push(err.message));
    page.on('console', (msg) => msg.type() === 'error' && problems.push(msg.text()));
    for (const name of ['home', 'additive', 'advice', 'firing', 'material', 'notes', 'recipe', 'trash']) {
      await page.goto('/#/' + name);
      await expect(page.locator('nav h3')).toBeVisible();
      await expect(errors(page)).toHaveCount(0);
    }
    expect(problems).toEqual([]);
  });
});

test.describe('additives', () => {
  test('lists the standard additives', async ({ page }) => {
    await page.goto('/#/additive');
    const standard = page.locator('section', { hasText: 'The standard server additives:' });
    const row = standard.locator('tr', { has: page.locator('td', { hasText: /^\s*Cobalt carbonate\s*$/ }) });
    await expect(row).toContainText('CoO : 1');
  });

  test('saves an additive from components and elements, then removes it', async ({ page }) => {
    await page.goto('/#/additive');
    await page.locator('#additive-name').fill('Blue stain');
    await page.locator('#formula').fill('CoAl₂O₄');
    await page.locator('#notes').fill('Spinel');
    await addPart(page, '#componentselection', 'CoO', 'Add the component', 1, '.part-amount');
    await addPart(page, '#componentselection', 'Al2O3', 'Add the component', 1, '.part-amount');
    await addPart(page, '#elementselection', 'Zn', 'Add the element', 0.1, '.part-amount');
    await page.locator('li', { hasText: 'Zn' }).getByRole('button', { name: 'Remove from formula list' }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(messages(page)).toContainText('Additive added');
    const mine = page.locator('section', { hasText: 'My server additives / colorants:' });
    const row = mine.locator('tr', { hasText: 'Blue stain' });
    await expect(row).toContainText('Spinel');
    await expect(row).toContainText('CoO : 1; Al2O3 : 1');

    await page.reload();
    await expect(row).toBeVisible();
    await mine.getByRole('button', { name: 'Remove toggle' }).click();
    await row.getByRole('button', { name: 'Remove from server' }).click();
    await expect(messages(page)).toContainText('removing the additive');
    await expect(page.locator('section', { hasText: 'My server additives / colorants:' })).toHaveCount(0);
  });

  test('asks for a component before adding one', async ({ page }) => {
    await page.goto('/#/additive');
    await page.getByRole('button', { name: 'Add the component' }).click();
    await expect(errors(page)).toContainText('please select an component');
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(errors(page)).toHaveCount(0);
  });
});

test.describe('advice', () => {
  test('shows general advice and saves, lists and removes my own', async ({ page }) => {
    await page.goto('/#/advice');
    await expect(page.locator('.general-advice')).toContainText('Sieve your glazes');
    await expect(page.locator('.general-advice')).toContainText('Tags: mixing');

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
    await page.getByRole('button', { name: 'Toggle Remove Button' }).click();
    await mine.getByRole('button', { name: 'Remove' }).click();
    await expect(page.locator('.my-advice li')).toHaveCount(0);
  });

  test('needs a title and content', async ({ page }) => {
    await page.goto('/#/advice');
    await page.locator('#advice-title').fill('Only a title');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(errors(page)).toContainText('missing information');
  });
});

test.describe('notes', () => {
  test('saves, lists and removes notes', async ({ page }) => {
    await page.goto('/#/notes');
    await page.locator('#title').fill('Kiln');
    await page.locator('#content').fill('Element 3 needs replacing.');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(messages(page)).toContainText('adding the note');
    await expect(page.locator('#title')).toHaveValue('');

    await page.reload();
    const note = page.locator('.my-notes li', { hasText: 'Kiln' });
    await expect(note).toContainText('Element 3 needs replacing.');
    await page.getByRole('button', { name: 'Toggle Remove button' }).click();
    await note.getByRole('button', { name: 'Remove' }).click();
    await expect(messages(page)).toContainText('removing the note');
    await expect(page.locator('.my-notes li')).toHaveCount(0);
  });

  test('needs a title and a note', async ({ page }) => {
    await page.goto('/#/notes');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(errors(page)).toContainText('missing info');
  });
});

test.describe('firing log', () => {
  const cells = (page) => page.locator('.firing-table input');

  test('builds a log, rearranges columns with their data, saves and removes it', async ({ page }) => {
    await page.goto('/#/firing');
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
    await page.locator('.included-fields li', { hasText: 'Time' }).getByRole('button', { name: 'Move field right' }).click();
    await expect(page.locator('.firing-table th')).toHaveText(['Cone', 'Time', 'Damper', 'Row actions']);
    await expect(page.getByLabel('Time row 1')).toHaveValue('8:00');
    await expect(page.getByLabel('Cone row 2')).toHaveValue('06');

    // A field added after rows gets an empty box in every row.
    await page.locator('#fieldselect').selectOption('Temperature F');
    await page.getByRole('button', { name: 'Add the field' }).click();
    await expect(cells(page)).toHaveCount(8);
    await page.getByLabel('Temperature F row 2').fill('1830');

    // Removing a field and a row drops their cells.
    await page.locator('.included-fields li', { hasText: 'Damper' }).getByRole('button', { name: 'Remove the field' }).click();
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

    await page.getByRole('button', { name: 'Remove toggle button' }).click();
    await stored.getByRole('button', { name: 'Remove' }).click();
    await expect(messages(page)).toContainText('removing the firing');
    await expect(page.locator('.stored-firing')).toHaveCount(0);
  });

  test('keeps move buttons from running off either end and rows from starting with no fields', async ({ page }) => {
    await page.goto('/#/firing');
    await expect(page.getByRole('button', { name: 'Add a row to the firing table' })).toBeDisabled();
    await page.getByRole('button', { name: 'Add the field' }).click();
    const only = page.locator('.included-fields li');
    await expect(only.getByRole('button', { name: 'Move field left' })).toBeDisabled();
    await expect(only.getByRole('button', { name: 'Move field right' })).toBeDisabled();
  });

  test('needs a title and a field before saving', async ({ page }) => {
    await page.goto('/#/firing');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(errors(page)).toContainText('enter a title and at least one field');
  });
});
