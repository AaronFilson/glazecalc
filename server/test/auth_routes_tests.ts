import type { IncomingHttpHeaders } from 'node:http';
import { api, expect, makeUser, sessionToken, uniqueEmail } from './support/app.ts';

const basic = (address: string, password: string) =>
  'Basic ' + Buffer.from(address + ':' + password).toString('base64');
const signIn = (address: string, password: string) =>
  api().get('/signin').set('Authorization', basic(address, password));
const verify = (token: string | null) =>
  api()
    .get('/verify')
    .set('Authorization', 'Bearer ' + token);

// Creating an account and signing in. Sign-in by email whatever its case, and
// login tokens, are covered in ownership_tests.ts.
describe('sign-up and sign-in API', () => {
  it('creates an account and signs the browser in with an httpOnly session cookie', async () => {
    const address = uniqueEmail();
    const res = await api().post('/signup').send({ email: address, password: 'password' });
    expect(res).to.have.status(200);
    expect(res.body).to.eql({ email: address });
    const cookie = ([] as string[]).concat(res.headers['set-cookie']).join();
    expect(cookie).to.match(
      /glazecalc_session=[^;]+; Max-Age=604800; Path=\/api; Expires=[^;]+; HttpOnly; SameSite=Strict/
    );

    const me = await verify(sessionToken(res));
    expect(me).to.have.status(200);
    expect(me.body.email).to.eql(address);
    expect(await signIn(address, 'password')).to.have.status(200);
  });

  it('asks for an email when the sign-up has none', async () => {
    for (const body of [null, { trashdata: 'not anything good' }]) {
      // A null body is sent on purpose; superagent's types only allow objects.
      const res = await api()
        .post('/signup')
        .send(body as object);
      expect(res).to.have.status(400);
      expect(res.body).to.eql({ code: 'email-required', msg: 'Please enter an email', field: 'email' });
    }
  });

  describe('with an account', () => {
    let email: string;
    let password: string;

    beforeEach(async () => {
      ({ email, password } = await makeUser());
    });

    it('signs in with the right password and sets the session cookie', async () => {
      const res = await signIn(email, password);
      expect(res).to.have.status(200);
      expect(res.body).to.eql({ code: 'signed-in', msg: 'Success in signin', email, kept: 0 });
      expect(await verify(sessionToken(res))).to.have.status(200);
    });

    it('refuses a wrong password without a token', async () => {
      const res = await signIn(email, 'NOT' + password);
      expect(res).to.have.status(401);
      expect(res.body).to.eql({ code: 'sign-in-failed', msg: 'Email or password is incorrect.' });
    });
  });

  it('refuses a sign-in without credentials, and keeps serving', async () => {
    const noColon = 'Basic ' + Buffer.from('no-colon-here').toString('base64');
    // No header, no credentials after "Basic", an empty password, and no colon.
    for (const header of [undefined, 'Basic', basic('nopassword@tester.com', ''), noColon]) {
      const req = api().get('/signin');
      if (header !== undefined) req.set('Authorization', header);
      const res = await req;
      expect(res, String(header)).to.have.status(401);
      expect(res.body.msg).to.eql('could not authenticate user');
    }
  });
});

describe('sign-in sessions', () => {
  it('reads the token from the session cookie or a Bearer header, not the old token header', async () => {
    const { token, email } = await makeUser();
    const byCookie = await api()
      .get('/verify')
      .set('Cookie', 'theme=dark; glazecalc_session=' + token);
    expect(byCookie).to.have.status(200);
    expect(byCookie.body.email).to.eql(email);
    expect((await verify(token)).body.email).to.eql(email);

    expect(await api().get('/recipe/getAll').set('token', token)).to.have.status(401);
    // Basic credentials (sign-in) or a broken Bearer value are not a token.
    expect(await api().get('/recipe/getAll').set('Authorization', 'Bearer not-a-token')).to.have.status(401);
    expect(
      await api()
        .get('/recipe/getAll')
        .set('Authorization', 'Basic ' + token)
    ).to.have.status(401);
  });

  it('signs out by clearing the cookie', async () => {
    const res = await api().post('/signout');
    expect(res).to.have.status(200);
    expect(([] as string[]).concat(res.headers['set-cookie']).join()).to.match(
      /glazecalc_session=; Path=\/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict/
    );
    expect(sessionToken(res)).to.eql(null);
  });

  it('refuses changes that a browser says come from another site', async () => {
    const { token } = await makeUser();
    const note = { content: 'Hello', relatedCollection: 'Notes', relatedId: 'general notes' };
    const post = (headers: IncomingHttpHeaders) =>
      api()
        .post('/notes/create')
        .set('Authorization', 'Bearer ' + token)
        .set(headers)
        .send(note);

    for (const headers of [
      { 'Sec-Fetch-Site': 'cross-site' },
      { 'Sec-Fetch-Site': 'same-site' },
      { Origin: 'https://evil.example' }
    ]) {
      const res = await post(headers);
      expect(res, JSON.stringify(headers)).to.have.status(403);
      expect(res.body.msg).to.eql('Requests from other sites are not accepted.');
    }
    // The app's own pages, someone typing an address, and scripts that say nothing.
    for (const headers of [{ 'Sec-Fetch-Site': 'same-origin' }, { 'Sec-Fetch-Site': 'none' }, {}]) {
      expect(await post(headers), JSON.stringify(headers)).to.have.status(200);
    }
    const sameHost = await api().get('/health');
    const host = new URL(sameHost.request.url).host;
    expect(await post({ Origin: 'http://' + host })).to.have.status(200);
    // Reading is always allowed; only changes are checked.
    const read = await api()
      .get('/notes/getAll')
      .set('Authorization', 'Bearer ' + token)
      .set('Sec-Fetch-Site', 'cross-site');
    expect(read).to.have.status(200);
  });
});
