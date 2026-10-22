const crypto = require('crypto');
const http = require('http');
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
  // Allow takes a click once the page has been in front a moment (a click meant for something else comes sooner).
  const allow = page.getByRole('button', { name: 'Allow', exact: true });
  await expect(allow).not.toHaveAttribute('aria-disabled', 'true');
  await allow.click();
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
  // The button hides behind the question at once, so wait for the server's answer to the revoke itself.
  const revoked = page.waitForResponse(
    (res) => res.url().includes('/api/connections/') && res.request().method() === 'DELETE'
  );
  await row.getByRole('button', { name: 'Yes, revoke' }).click();
  expect((await revoked).ok()).toBe(true);
  await expect(row.getByRole('button', { name: /^Revoke/ })).toHaveCount(0);

  const after = await mcp(request, tokens.access_token, 'tools/call', { name: 'list_recipes', arguments: {} });
  expect(after.status()).toBe(401);
  const refreshed = await request.post('/oauth/token', {
    form: { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: clientId }
  });
  expect(refreshed.status()).toBe(400);
});

// An app named by its address (CIMD) whose document is shaped as ChatGPT's: it asks to sign its token
// requests with its own key (private_key_jwt, which playwright.config.js turns on for the browser tests),
// keeping the key's public half at an address on its own site. Its document and keys are served here,
// on the port the server fetches from in the tests (CIMD_TEST_BASE), never from the internet.
test.describe('an app named by its address that signs its token requests', () => {
  const HOST = 'chatgpt-test.example';
  const CALLBACK = `https://${HOST}/callback`;
  const key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...key.publicKey.export({ format: 'jwk' }), kid: 'e2e-1', use: 'sig', alg: 'RS256' };
  const served = new Map();
  let server;

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      const body = served.get(req.url);
      if (!body) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    });
    await new Promise((resolve) => server.listen(Number(process.env.E2E_CIMD_PORT), '127.0.0.1', resolve));
  });
  test.afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  /** A client assertion (RFC 7523), signed with the app's key, for the site's issuer. */
  const assertion = (clientId, issuer) => {
    const now = Math.floor(Date.now() / 1000);
    const input =
      b64({ alg: 'RS256', kid: 'e2e-1', typ: 'JWT' }) +
      '.' +
      b64({ iss: clientId, sub: clientId, aud: issuer, jti: crypto.randomUUID(), iat: now, exp: now + 60 });
    return input + '.' + crypto.sign('sha256', Buffer.from(input), key.privateKey).toString('base64url');
  };

  test('shows its checked host, and its code is swapped for tokens only with its signature', async ({
    page,
    request
  }) => {
    const { email, password } = await confirmedAccount(request);
    const id = crypto.randomBytes(6).toString('hex');
    const clientId = `https://${HOST}/oauth/${id}.json`;
    served.set(`/${HOST}/oauth/${id}.json`, {
      client_id: clientId,
      client_name: 'Glaze Chat',
      redirect_uris: [CALLBACK],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
      token_endpoint_auth_signing_alg: 'RS256',
      jwks_uri: `https://${HOST}/oauth/${id}-keys.json`
    });
    served.set(`/${HOST}/oauth/${id}-keys.json`, { keys: [jwk] });

    const { verifier, challenge } = pkce();
    const state = crypto.randomBytes(8).toString('hex');
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: CALLBACK,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      scope: 'data:read'
    });
    await page.goto('/oauth/authorize?' + query.toString());
    await expect(page).toHaveURL(/\/signin\?next=%2Fconnect%2F[\w-]+$/);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/connect\/[\w-]+$/);

    // Its name, never marked self-described, and its host as checked.
    const name = page.getByRole('heading', { level: 2 });
    await expect(name).toContainText('Glaze Chat');
    await expect(name).not.toContainText('self-described');
    await expect(page.getByText('(checked by Glazecalc)')).toBeVisible();
    await expect(page.locator('.hosts')).toContainText(HOST);

    // The browser goes on to the app's own address, which does not exist here: its request is enough.
    const landed = page.waitForEvent('framenavigated', {
      predicate: (frame) =>
        frame === page.mainFrame() && (frame.url().startsWith(CALLBACK) || frame.url().startsWith('chrome-error:'))
    });
    const callback = page.waitForRequest((req) => req.url().startsWith(CALLBACK + '?'));
    const allow = page.getByRole('button', { name: 'Allow', exact: true });
    await expect(allow).not.toHaveAttribute('aria-disabled', 'true');
    await allow.click();
    const answer = new URL((await callback).url());
    await landed;
    const code = answer.searchParams.get('code');
    expect(code).toBeTruthy();
    expect(answer.searchParams.get('state')).toBe(state);
    const issuer = (await (await request.get('/.well-known/oauth-authorization-server')).json()).issuer;
    expect(answer.searchParams.get('iss')).toBe(issuer);

    const fields = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK,
      client_id: clientId,
      code_verifier: verifier
    };
    // Without its signature the code is refused, and not used up.
    const bare = await request.post('/oauth/token', { form: fields });
    expect(bare.status()).toBe(401);
    expect((await bare.json()).error).toBe('invalid_client');
    const exchanged = await request.post('/oauth/token', {
      form: {
        ...fields,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion(clientId, issuer)
      }
    });
    const tokens = await exchanged.json();
    expect(exchanged.status(), JSON.stringify(tokens)).toBe(200);
    expect(tokens.scope).toBe('data:read');
    const read = await mcp(request, tokens.access_token, 'tools/call', { name: 'list_recipes', arguments: {} });
    expect(read.status()).toBe(200);
  });
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
