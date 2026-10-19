// Automated accessibility checks (axe-core) on every page, signed out, signed
// in and during a trial, in light and dark mode. They catch what a tool can:
// contrast, labels, landmarks, heading order and ARIA misuse. Keyboard use and
// how a screen reader words things still need a person.
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const {
  API,
  addColorant,
  addStandardMaterial,
  confirmedAccount,
  signUpAndSignIn,
  startTrial,
  totp
} = require('./helpers');

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// A long file, its tests apart from each other: they spread over the workers
// instead of running one after another in one.
test.describe.configure({ mode: 'parallel' });

// Landmarks and headings, which axe tags as best practice rather than WCAG: one main
// landmark with all the content in landmarks, one h1, and no heading levels skipped.
const STRUCTURE = Object.fromEntries(
  ['landmark-one-main', 'region', 'page-has-heading-one', 'heading-order'].map((rule) => [rule, { enabled: true }])
);

// Fails with one line per problem and the elements it was found on.
const expectNoProblems = async (page, label) => {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page }).options({ rules: STRUCTURE }).withTags(WCAG).analyze();
  const problems = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  );
  expect(problems, label).toEqual([]);
};

const GUIDES = [
  '/guides',
  '/guides/glazing-basics',
  '/guides/making-a-glaze',
  '/guides/safe-mixing',
  '/guides/home-safety',
  '/guides/firing'
];
const PUBLIC_PAGES = [
  '/',
  '/advice',
  '/about',
  ...GUIDES,
  '/privacy',
  '/terms',
  '/assistants',
  '/signin',
  '/signup',
  '/forgot',
  '/no-such-page'
];
const APP_PAGES = [
  '/home',
  '/material',
  '/additive',
  '/firing',
  '/notes',
  '/advice',
  '/account',
  '/trash',
  '/import',
  '/blends'
];

// The palettes in Settings, light and dark: contrast of buttons, links, tabs and choices.
// One test a palette, so each stays well inside its time as the pages grow.
test.describe('every palette, light and dark', () => {
  for (const palette of ['tenmoku', 'celadon', 'cobalt', 'oxblood', 'shino', 'ash']) {
    test(palette, async ({ page }) => {
      // Four pages, each checked whole: more than the default 30 seconds on a busy machine.
      test.setTimeout(60000);
      await signUpAndSignIn(page);
      for (const theme of ['light', 'dark']) {
        const res = await page.request.put(API + '/preferences', { data: { palette, theme } });
        expect(res.ok()).toBe(true);
        for (const path of ['/recipe', '/account']) {
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await expect(page.locator('h1')).toBeVisible();
          await expectNoProblems(page, palette + ' ' + theme + ' ' + path);
        }
      }
    });
  }
});

for (const colorScheme of ['light', 'dark']) {
  test.describe(colorScheme + ' mode', () => {
    test.use({ colorScheme });

    test('the public pages', async ({ page }) => {
      // Sixteen pages, the guides long ones, each checked whole: more than the default 30 seconds on a busy machine.
      test.setTimeout(90000);
      for (const path of PUBLIC_PAGES) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoProblems(page, colorScheme + ' ' + path);
      }
      // Fields marked with problems: the outline and the message in this mode's colors.
      await page.goto('/signup');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
      await expectNoProblems(page, colorScheme + ' /signup with problems marked');
    });

    test('the app pages, signed in', async ({ page, request }) => {
      // Eight pages each checked whole, then a question and the phone menu: more than 30 seconds on a busy machine.
      test.setTimeout(90000);
      await signUpAndSignIn(page);
      for (const path of APP_PAGES) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoProblems(page, colorScheme + ' ' + path);
      }
      // A saved record's Remove question, open.
      const note = { title: 'Kiln', content: 'Element 3', relatedCollection: 'Notes', relatedId: 'general notes' };
      expect((await page.request.post(API + '/notes/create', { data: note })).ok()).toBeTruthy();
      await page.goto('/notes');
      await page.getByRole('button', { name: 'Remove Kiln' }).click();
      await expect(page.getByRole('button', { name: 'Yes, remove' })).toBeVisible();
      await expectNoProblems(page, colorScheme + ' remove question');
      // The phone menu, open.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Menu' }).click();
      await expectNoProblems(page, colorScheme + ' phone menu');
    });

    // The recipe page in each of its states. It is the heaviest page to check (every
    // standard material is listed), so it has its own test and more time.
    test('the recipe page: a result, printing, comparing, problems and questions', async ({ page }) => {
      test.setTimeout(90000);
      await signUpAndSignIn(page);
      // The calculator with a recipe worked out.
      await page.goto('/recipe');
      await addStandardMaterial(page, 'Whiting', 20);
      await addStandardMaterial(page, 'Silica', 30);
      await addColorant(page, 'Cobalt carbonate', 1);
      await expect(page.locator('.unity-panel gc-unity-formula')).toBeVisible();
      await expectNoProblems(page, colorScheme + ' /recipe with a result');
      // The print view: the whole recipe, then the batch list.
      await page.getByRole('button', { name: 'Print', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Print a recipe' })).toBeFocused();
      await expectNoProblems(page, colorScheme + ' /recipe print view');
      await page.getByLabel(/^Just a batch list/).check();
      await expectNoProblems(page, colorScheme + ' /recipe print view, batch list');
      await page.getByRole('button', { name: 'Back to the recipe' }).click();
      // The compare view.
      await page.getByRole('button', { name: 'Compare', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Compare two recipes' })).toBeFocused();
      await expectNoProblems(page, colorScheme + ' /recipe compare view');
      await page.getByRole('button', { name: 'Back to the recipe' }).click();
      // The recipe's fields marked with problems.
      await page.locator('#recipe-name').fill('');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.locator('#recipe-name')).toHaveAttribute('aria-invalid', 'true');
      await expectNoProblems(page, colorScheme + ' /recipe with problems marked');
      // The question about unsaved changes, open.
      await page.getByRole('button', { name: 'Start a new recipe' }).click();
      await expect(page.getByRole('button', { name: 'Keep editing' })).toBeFocused();
      await expectNoProblems(page, colorScheme + ' /recipe unsaved question');
    });

    test('a trial', async ({ page }) => {
      // Several pages or checks of a whole page: more than the default 30 seconds on a busy machine.
      test.setTimeout(60000);
      await startTrial(page);
      await expect(page.locator('.trial-bar')).toBeVisible();
      await expectNoProblems(page, colorScheme + ' trial /recipe');
      await page.locator('.trial-bar').getByRole('button', { name: 'Discard trial' }).click();
      await expectNoProblems(page, colorScheme + ' trial, discarding');
      await page.locator('.trial-bar').getByRole('button', { name: 'Keep trying' }).click();
      for (const path of ['/signup', '/signin', '/account']) {
        await page.goto(path);
        await expect(page.locator('h1')).toBeVisible();
        await expectNoProblems(page, colorScheme + ' trial ' + path);
      }
    });
  });
}

// Two-step sign-in (docs/mfa-plan.md): the account page's section off and on,
// with a change open, and the second step at sign-in, in each of its ways.
for (const colorScheme of ['light', 'dark']) {
  test(colorScheme + ' mode: two-step sign-in', async ({ page }) => {
    test.setTimeout(90000);
    await page.emulateMedia({ colorScheme });
    const { email, password } = await confirmedAccount(page.request);
    const signInOnPage = async () => {
      await page.goto('/signin');
      await page.locator('#email').fill(email);
      await page.locator('#password').fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    };
    expect((await page.request.post(API + '/signout')).ok()).toBe(true);
    await signInOnPage();
    await expect(page).toHaveURL(/\/home$/);
    const section = page.getByRole('region', { name: 'Two-step sign-in' });
    // Not set up yet, then setting up an app: the QR code and its key.
    await page.goto('/account');
    await expect(section.locator('.mfa-status')).toBeVisible();
    await expectNoProblems(page, colorScheme + ' /account two-step sign-in off');
    await section.getByRole('button', { name: 'Set up an authenticator app' }).click();
    await section.getByLabel('Your password').fill(password);
    await section.getByRole('button', { name: 'Continue' }).click();
    await expect(section.locator('img.totp-qr')).toBeVisible();
    await expectNoProblems(page, colorScheme + ' /account setting up an app');
    const secret = (await section.locator('.totp-key').innerText()).replace(/\s/g, '');
    await section.getByLabel(/^Enter the 6-digit code/).fill(totp(secret));
    await section.getByRole('button', { name: 'Finish setting up' }).click();
    // The recovery codes, shown once.
    await expect(section.locator('ol.recovery-codes li')).toHaveCount(10);
    await expectNoProblems(page, colorScheme + ' /account recovery codes');
    await section.getByRole('button', { name: 'I have saved them' }).click();
    // On, with a change open: the password and a second step.
    await expect(section.locator('.mfa-status')).toContainText('Two-step sign-in is on.');
    await expectNoProblems(page, colorScheme + ' /account two-step sign-in on');
    // The app's own button; "Turning it off" has a second one.
    await section.locator('#mfa-remove-app').click();
    await expect(section.getByRole('group', { name: 'And your second step' })).toBeVisible();
    await expectNoProblems(page, colorScheme + ' /account confirming a change');
    // The second step at sign-in, with a code, then with a recovery code.
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await signInOnPage();
    await expect(page.getByLabel('Code from your authenticator app')).toBeVisible();
    await expectNoProblems(page, colorScheme + ' /signin second step');
    await page.getByRole('button', { name: 'Finish signing in' }).click();
    await expect(page.getByLabel('Code from your authenticator app')).toHaveAttribute('aria-invalid', 'true');
    await expectNoProblems(page, colorScheme + ' /signin second step with a problem marked');
    await page.getByRole('button', { name: 'Use a recovery code instead' }).click();
    await expect(page.getByLabel('Recovery code')).toBeVisible();
    await expectNoProblems(page, colorScheme + ' /signin second step, recovery code');
  });
}
