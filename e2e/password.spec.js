const { test, expect } = require('@playwright/test');
const { API, uniqueEmail } = require('./helpers');
const { nextEmail, resetLink, sentTo } = require('./mail');

const header = (page) => page.locator('.account-email');

const createAccount = async (request, password = 'old-password') => {
  const email = uniqueEmail('pw');
  const res = await request.post(API + '/signup', { data: { email, password } });
  expect(res.ok()).toBe(true);
  return { email };
};

const signIn = async (page, email, password) => {
  await page.goto('/signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

test('resets a forgotten password from the emailed link', async ({ page, request }) => {
  const { email } = await createAccount(request);

  await page.goto('/signin');
  await page.getByRole('link', { name: 'Reset it' }).click();
  await expect(page).toHaveURL(/\/forgot$/);
  await page.locator('#email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.locator('.sent-text')).toContainText('If an account uses that email');

  const message = await nextEmail(email);
  expect(message.subject).toBe('Reset your Glazecalc password');
  const link = resetLink(message);
  expect(link.startsWith('http://localhost:' + process.env.E2E_PORT + '/reset#token=')).toBe(true);

  await page.goto(link);
  // The token leaves the address bar as soon as the page opens.
  await expect(page).toHaveURL(/\/reset$/);
  expect(new URL(page.url()).hash).toBe('');
  await page.locator('#password').fill('brand-new-password');
  await page.locator('#confirmation').fill('brand-new-password');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.locator('.done-text')).toContainText('Your password has been changed.');
  await expect
    .poll(() => sentTo(email).map((m) => m.subject))
    .toEqual(['Reset your Glazecalc password', 'Your Glazecalc password was changed']);

  // The link worked once. (Opened fresh, as clicking it in an email would.)
  await page.goto('about:blank');
  await page.goto(link);
  await page.locator('#password').fill('another-password');
  await page.locator('#confirmation').fill('another-password');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.locator('.errors-section')).toContainText('not valid or has expired');

  await signIn(page, email, 'old-password');
  await expect(page.locator('.errors-section')).toContainText('Email or password is incorrect.');
  await signIn(page, email, 'brand-new-password');
  await expect(page).toHaveURL(/\/home$/);
  await expect(header(page)).toHaveText(email);
});

test('gives the same answer for an email with no account, and sends nothing', async ({ page }) => {
  const email = uniqueEmail('nobody');
  await page.goto('/forgot');
  await page.locator('#email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.locator('.sent-text')).toContainText('If an account uses that email');
  await page.waitForTimeout(500);
  expect(sentTo(email)).toHaveLength(0);
});

test('a reset signs out the other devices', async ({ browser, request }) => {
  const { email } = await createAccount(request);
  const laptop = await browser.newPage();
  await signIn(laptop, email, 'old-password');
  await expect(header(laptop)).toHaveText(email);

  // The password is reset from somewhere else.
  await request.post(API + '/password/forgot', { data: { email } });
  const token = new URLSearchParams(new URL(resetLink(await nextEmail(email))).hash.slice(1)).get('token');
  expect((await request.post(API + '/password/reset', { data: { token, password: 'brand-new-password' } })).ok()).toBe(
    true
  );

  // The laptop's next request is refused, so it is signed out and sent to sign in.
  await laptop.locator('.nav-links').getByRole('link', { name: 'Recipes' }).click();
  await expect(laptop).toHaveURL(/\/signin$/);
  await expect(header(laptop)).toHaveCount(0);
  await laptop.close();
});

test('changes the password from the account page', async ({ browser, page, request }) => {
  const { email } = await createAccount(request);
  await signIn(page, email, 'old-password');
  await header(page).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.locator('.page-header')).toContainText('Signed in as ' + email);

  await page.locator('#current').fill('wrong-password');
  await page.locator('#password').fill('changed-password');
  await page.locator('#confirmation').fill('changed-password');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.locator('.errors-section')).toContainText('Your current password is not correct.');
  await expect(header(page)).toHaveText(email);

  await page.locator('#current').fill('old-password');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.locator('.server-msg')).toContainText('Your password has been changed.');
  await expect(page.locator('#current')).toHaveValue('');

  // This page stays signed in; the session from sign-up (the test's own request
  // context, standing in for another device) does not.
  await page.reload();
  await expect(header(page)).toHaveText(email);
  expect((await request.get(API + '/verify')).status()).toBe(401);
  expect((await nextEmail(email)).subject).toBe('Your Glazecalc password was changed');

  const other = await browser.newPage();
  await signIn(other, email, 'changed-password');
  await expect(other).toHaveURL(/\/home$/);
  await other.close();
});
