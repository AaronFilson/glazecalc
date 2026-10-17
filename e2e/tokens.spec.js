const { test, expect } = require('@playwright/test');
const { API, confirmedAccount, signUpAndSignIn } = require('./helpers');
const { confirmLink, nextEmail } = require('./mail');

// The account page's "Access tokens" (docs/integrations-plan.md, item 27):
// made with the password, shown once, working on the records and the MCP
// endpoint, listed, revoked; and offered for revoking after a password change.
// Only an account whose email is confirmed makes one.

/** Signed in on the page with an account whose email is confirmed. */
const confirmedOnPage = async (page) => {
  const account = await confirmedAccount(page.request);
  await page.addInitScript(() => globalThis.localStorage.setItem('session', 'account'));
  return account;
};

const makeToken = async (page, name, password = 'password123') => {
  const section = page.locator('.tokens-section');
  await section.getByLabel('Name', { exact: true }).fill(name);
  await section.getByRole('button', { name: 'Continue' }).click();
  await section.getByLabel('Your password').fill(password);
  await section.getByRole('button', { name: 'Make the token' }).click();
  await expect(section.getByRole('heading', { name: 'Copy your new token now' })).toBeFocused();
  return section.locator('#new-token').inputValue();
};

test('asks an account whose email is not confirmed to confirm it first', async ({ page }) => {
  const { email } = await signUpAndSignIn(page);
  await page.goto('/account');
  const section = page.locator('.tokens-section');
  await expect(section.locator('.needs-email')).toContainText(
    'Before you can make a token, confirm your email: open the link we sent to ' + email
  );
  await expect(section.getByLabel('Name', { exact: true })).toHaveCount(0);
  await nextEmail(email);
  await section.getByRole('button', { name: 'Send the confirmation link again' }).click();
  await expect(section).toContainText('We have sent a new link');
  expect(confirmLink(await nextEmail(email, 1))).toContain('/confirm-email#token=');
  // The server refuses one all the same.
  const res = await page.request.post(API + '/tokens', { data: { name: 'x', password: 'password123' } });
  expect(res.status()).toBe(403);
  expect((await res.json()).code).toBe('token-needs-confirmed-email');
});

test('makes a read-only token, shows it once, and revokes it', async ({ page, request }) => {
  await confirmedOnPage(page);
  await page.goto('/account');
  const section = page.locator('.tokens-section');
  await expect(section.getByRole('heading', { name: 'Access tokens' })).toBeVisible();
  await expect(section.getByText('You have no access tokens.')).toBeVisible();
  // 30 days unless chosen.
  await expect(section.getByLabel('Stops working after')).toHaveValue(/30/);

  // The name is checked before the password is asked for.
  await section.getByRole('button', { name: 'Continue' }).click();
  await expect(section.locator('#token-name')).toHaveAttribute('aria-invalid', 'true');

  await section.getByLabel('Stops working after').selectOption({ label: '7 days' });
  const token = await makeToken(page, 'Claude Code on my laptop');
  expect(token).toMatch(/^glazecalc_pat_[0-9A-Za-z]{49}$/);

  // It reads the records, and the MCP endpoint offers the account's tools with it.
  const records = await request.get(API + '/recipe/getAll', { headers: { Authorization: 'Bearer ' + token } });
  expect(records.status()).toBe(200);
  const tools = await request.post(API.replace(/\/api$/, '/mcp'), {
    headers: {
      Authorization: 'Bearer ' + token,
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18'
    },
    data: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }
  });
  expect(tools.status()).toBe(200);
  expect(await tools.text()).toContain('list_recipes');

  // Once "Done", it is gone from the page; the list shows its last four characters.
  await section.getByRole('button', { name: 'I have copied it' }).click();
  await expect(section.locator('#new-token')).toHaveCount(0);
  const row = section.locator('.token-row', { hasText: 'Claude Code on my laptop' });
  await expect(row).toContainText('ending ' + token.slice(-4));
  await expect(row).toContainText('Read only');
  await expect(row).toContainText('never used');
  await page.reload();
  await expect(page.locator('body')).not.toContainText(token);

  await row.getByRole('button', { name: 'Revoke Claude Code on my laptop' }).click();
  await expect(section).toContainText('The access token was revoked.');
  await expect(row).toContainText('revoked');
  await expect(row.getByRole('button', { name: /^Revoke/ })).toHaveCount(0);
  const after = await request.get(API + '/recipe/getAll', { headers: { Authorization: 'Bearer ' + token } });
  expect(after.status()).toBe(401);
});

test('offers to revoke the tokens still working after a password change', async ({ page, request }) => {
  await confirmedOnPage(page);
  await page.goto('/account');
  const first = await makeToken(page, 'Cursor');
  await page.locator('.tokens-section').getByRole('button', { name: 'I have copied it' }).click();
  await makeToken(page, 'Gemini CLI');
  await page.locator('.tokens-section').getByRole('button', { name: 'I have copied it' }).click();

  await page.getByLabel('Current password').fill('password123');
  await page.getByLabel('New password', { exact: true }).fill('another-password');
  await page.getByLabel('Confirm new password').fill('another-password');
  await page.getByRole('button', { name: 'Change password' }).click();

  const offer = page.locator('.tokens-after-change');
  await expect(offer.getByRole('heading', { name: 'Your access tokens still work' })).toBeFocused();
  await expect(offer).toContainText('did not stop your 2 access tokens');
  await expect(offer).toContainText('Cursor');
  await expect(offer).toContainText('Gemini CLI');
  // Still working until revoked.
  expect((await request.get(API + '/recipe/getAll', { headers: { Authorization: 'Bearer ' + first } })).status()).toBe(
    200
  );

  await offer.getByRole('button', { name: 'Revoke all access tokens' }).click();
  await expect(page.getByText('2 access tokens were revoked.')).toBeVisible();
  await expect(offer).toHaveCount(0);
  expect((await request.get(API + '/recipe/getAll', { headers: { Authorization: 'Bearer ' + first } })).status()).toBe(
    401
  );
});

test('shows how to connect an assistant, with this site’s address', async ({ page }) => {
  await page.goto('/assistants');
  await expect(page.getByRole('heading', { level: 1, name: 'Use Glazecalc from your AI assistant' })).toBeVisible();
  const address = 'http://localhost:' + process.env.E2E_PORT + '/mcp';
  await expect(page.locator('pre').first()).toHaveText(address);
  await expect(page.locator('pre', { hasText: 'claude mcp add --transport http glazecalc' }).first()).toBeVisible();
});

test('is not offered to a trial', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero-actions').getByRole('button', { name: 'Try it now' }).click();
  await expect(page).toHaveURL(/\/recipe$/);
  await page.goto('/account');
  await expect(page.locator('.trial-account')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Access tokens' })).toHaveCount(0);
});
