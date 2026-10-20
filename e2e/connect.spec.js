const crypto = require('crypto');
const { test, expect } = require('@playwright/test');
const { confirmedAccount, startTrial, uniqueEmail } = require('./helpers');
const { nextEmail, sentTo } = require('./mail');

// An AI app connecting with OAuth (docs/adr/0024-authorization-server.md), the
// whole way, against the real server: the app registers (DCR), starts an
// authorization with PKCE, the person signs in and comes back to the consent
// page, allows reading only, the app swaps its code for tokens, reads through
// /mcp and is asked to step up when it tries to change something; then the
// person revokes it on Connected apps and the token stops working. The app's
// own computer (the loopback redirect) has no listener: the browser's request is enough.

const REDIRECT = 'http://127.0.0.1:7777/callback';

const pkce = () => {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') };
};

let rpcId = 0;
const mcp = (request, accessToken, method, params = {}) =>
  request.post('/mcp', {
    headers: {
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2025-06-18',
      authorization: 'Bearer ' + accessToken
    },
    data: { jsonrpc: '2.0', id: ++rpcId, method, params }
  });

test('connects an app read only, which reads, is asked to step up to change, and stops once revoked', async ({
  page,
  request
}) => {
  const { email, password } = await confirmedAccount(request);

  // The app registers itself.
  const registered = await request.post('/oauth/register', {
    data: {
      client_name: 'Kiln Helper',
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code']
    }
  });
  expect(registered.status()).toBe(201);
  const clientId = (await registered.json()).client_id;

  // It sends the browser to sign in and say yes, asking to read and to change.
  const { verifier, challenge } = pkce();
  const state = crypto.randomBytes(8).toString('hex');
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: 'data:read data:write'
  });
  await page.goto('/oauth/authorize?' + query.toString());

  // Not signed in: the sign-in page, which comes back to the consent page.
  await expect(page).toHaveURL(/\/signin\?next=%2Fconnect%2F[\w-]+$/);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/connect\/[\w-]+$/);

  // The consent page: the app, marked as its own word, where the answer goes, and the warnings.
  await expect(page.getByRole('heading', { level: 1, name: 'Connect an app to your account' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(/Kiln Helper\s*self-described/);
  await expect(page.locator('.hosts')).toContainText('Your own computer (127.0.0.1:7777)');
  await expect(page.getByText('This app receives the answer on your own computer.')).toBeVisible();
  await expect(page.getByText('It also asks to change your records')).toBeVisible();
  await expect(page.getByText('Read your recipes, notebook, materials, shelf and settings.')).toBeVisible();
  const box = page.getByRole('checkbox', { name: 'Also let it change my records' });
  await expect(box).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'privacy notice' })).toHaveAttribute('href', '/privacy#ai-apps');
  await expect(page.getByRole('button', { name: 'Allow', exact: true })).not.toBeFocused();
  // It fits a 320 px phone, with nothing to scroll sideways.
  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth
    )
  ).toBe(true);

  // Read only.
  const mailsBefore = sentTo(email).length;
  // The browser takes the answer to the app's listener on this computer. Nothing listens there, so
  // that navigation ends on the browser's error page; the test waits for it to land, or it can
  // interrupt the next page the test opens. (page.route cannot play the listener: Playwright does not
  // route a request the browser reaches through a server's redirect.)
  const landed = page.waitForEvent('framenavigated', {
    predicate: (frame) =>
      frame === page.mainFrame() && (frame.url().startsWith(REDIRECT) || frame.url().startsWith('chrome-error:'))
  });
  const callback = page.waitForRequest((req) => req.url().startsWith(REDIRECT + '?'));
  await page.getByRole('button', { name: 'Allow', exact: true }).click();
  const answer = new URL((await callback).url());
  await landed;
  expect(answer.searchParams.get('code')).toBeTruthy();
  expect(answer.searchParams.get('state')).toBe(state);

  const exchanged = await request.post('/oauth/token', {
    form: {
      grant_type: 'authorization_code',
      code: answer.searchParams.get('code'),
      redirect_uri: REDIRECT,
      client_id: clientId,
      code_verifier: verifier
    }
  });
  const tokens = await exchanged.json();
  expect(exchanged.status(), JSON.stringify(tokens)).toBe(200);
  expect(tokens.scope).toBe('data:read');

  // It reads; changing a record asks it to step up.
  const read = await mcp(request, tokens.access_token, 'tools/call', { name: 'list_recipes', arguments: {} });
  expect(read.status()).toBe(200);
  const write = await mcp(request, tokens.access_token, 'tools/call', {
    name: 'create_recipe',
    arguments: { title: 'Not allowed' }
  });
  expect(write.status()).toBe(403);
  expect(write.headers()['www-authenticate']).toContain('error="insufficient_scope"');
  expect(write.headers()['www-authenticate']).toContain('scope="data:read data:write"');

  // The notice email names it, says it cannot change anything and where to revoke it.
  const notice = await nextEmail(email, mailsBefore);
  expect(notice.subject).toBe('An app was connected to your Glazecalc account');
  expect(notice.text).toContain('The app: "Kiln Helper"');
  expect(notice.text).toContain('It cannot change anything.');
  expect(notice.text).toContain('/account/apps');

  // Connected apps lists it, self-described, and revokes it.
  await page.goto('/account/apps');
  const row = page.locator('.connection-row', { hasText: 'Kiln Helper' });
  await expect(row).toContainText('self-described');
  await expect(row).toContainText('Sends you back to: 127.0.0.1:7777');
  await expect(row).toContainText('Read only');
  await row.getByRole('button', { name: 'Revoke Kiln Helper' }).click();
  await row.getByRole('button', { name: 'Yes, revoke' }).click();
  await expect(row.getByRole('button', { name: /^Revoke/ })).toHaveCount(0);

  const after = await mcp(request, tokens.access_token, 'tools/call', { name: 'list_recipes', arguments: {} });
  expect(after.status()).toBe(401);
  const refreshed = await request.post('/oauth/token', {
    form: { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId }
  });
  expect(refreshed.status()).toBe(400);
});

test('turns a trial away in words', async ({ page, request }) => {
  const registered = await request.post('/oauth/register', {
    data: {
      client_name: 'Trial Helper',
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code']
    }
  });
  const clientId = (await registered.json()).client_id;
  await startTrial(page);
  await expect(page).toHaveURL(/\/recipe$/);
  const { challenge } = pkce();
  await page.goto(
    '/oauth/authorize?' +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT,
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: 'x'
      }).toString()
  );
  await expect(page).toHaveURL(/\/connect\/[\w-]+$/);
  await expect(page.getByRole('alert')).toHaveText('A trial cannot connect apps. Please create a free account first.');
  await expect(page.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(0);
});

test('a signed-out visitor who opens a consent page keeps it through "Create an account"', async ({ page }) => {
  const consent = '/connect/aB3_dE5-gH7iJ9kL1mN';
  await page.goto(consent);
  await expect(page).toHaveURL(/\/signin\?next=%2Fconnect%2F[\w-]+$/);
  await page.locator('#main').getByRole('link', { name: 'Create a free account' }).click();
  await expect(page).toHaveURL(/\/signup\?next=%2Fconnect%2FaB3_dE5-gH7iJ9kL1mN$/);
  // And back again, still carrying it.
  await page.locator('#main').getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/signin\?next=%2Fconnect%2FaB3_dE5-gH7iJ9kL1mN$/);
});

test('a visitor who makes an account on the way to a consent page comes back to it from the menu and the confirmation email', async ({
  page
}) => {
  const consent = /\/connect\/aB3_dE5-gH7iJ9kL1mN$/;
  const email = uniqueEmail('connect-signup');
  await page.goto('/connect/aB3_dE5-gH7iJ9kL1mN');
  await expect(page).toHaveURL(/\/signin\?next=%2Fconnect%2FaB3_dE5-gH7iJ9kL1mN$/);
  // The menu's link keeps the page too.
  await page.locator('.nav-account').getByRole('link', { name: 'Create a free account' }).click();
  await expect(page).toHaveURL(/\/signup\?next=%2Fconnect%2FaB3_dE5-gH7iJ9kL1mN$/);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('password123');
  await page.locator('#confirmation').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(consent);

  // The link in the email carries the page after its token, and goes there once the address is confirmed.
  const link = /(https?:\/\/\S+\/confirm-email#\S+)/.exec((await nextEmail(email)).text)[1];
  expect(link).toMatch(/#token=[\w-]+&next=%2Fconnect%2FaB3_dE5-gH7iJ9kL1mN$/);
  await page.goto(link);
  await expect(page).toHaveURL(/\/confirm-email$/);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page).toHaveURL(consent);
});
