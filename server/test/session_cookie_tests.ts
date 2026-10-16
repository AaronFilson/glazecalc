import jwt from 'jsonwebtoken';
import * as secondStep from '../lib/second_step.ts';
import User from '../models/user.ts';
import { api, expect, makeUser, sessionToken, uniqueEmail } from './support/app.ts';

const DAY = 24 * 60 * 60;
const KEEP = { 'X-Keep-Signed-In': '1' };

/** The session cookie a response set, as a header line, or ''. */
const cookieOf = (res: { headers: Record<string, unknown> }): string =>
  ([] as string[])
    .concat((res.headers['set-cookie'] as string[] | string | undefined) ?? [])
    .find((c) => c.startsWith('glazecalc_session=')) ?? '';

const maxAge = (cookie: string): number | null => {
  const match = /Max-Age=(\d+)/i.exec(cookie);
  return match ? Number(match[1]) : null;
};

const basic = (address: string, pw: string) => 'Basic ' + Buffer.from(address + ':' + pw).toString('base64');

// "Keep me signed in on this device": unticked, the cookie is a session cookie
// with no Max-Age or Expires; ticked, it lasts 7 days; a trial's lasts its 14.
describe('how long a sign-in lasts', () => {
  it('signs in for the browser session unless asked to keep it', async () => {
    const { email } = await makeUser();
    const session = await api().get('/signin').set('authorization', basic(email, 'password123'));
    expect(session).to.have.status(200);
    const cookie = cookieOf(session);
    expect(cookie).to.include('HttpOnly');
    expect(cookie).to.not.match(/Max-Age|Expires/i);

    const kept = await api().get('/signin').set('authorization', basic(email, 'password123')).set(KEEP);
    expect(maxAge(cookieOf(kept))).to.eql(7 * DAY);
  });

  it('does the same at sign-up', async () => {
    const plain = await api()
      .post('/signup')
      .send({ email: uniqueEmail('plain'), password: 'password123' });
    expect(cookieOf(plain)).to.not.match(/Max-Age|Expires/i);
    const kept = await api()
      .post('/signup')
      .set(KEEP)
      .send({ email: uniqueEmail('kept'), password: 'password123' });
    expect(maxAge(cookieOf(kept))).to.eql(7 * DAY);
  });

  it('does the same when a trial becomes an account', async () => {
    const trial = await api().post('/guest').send({});
    const res = await api()
      .post('/guest/claim')
      .set('Authorization', 'Bearer ' + sessionToken(trial))
      .send({ email: uniqueEmail('claim'), password: 'password123' });
    expect(res).to.have.status(200);
    expect(cookieOf(res)).to.not.match(/Max-Age|Expires/i);
    const second = await api().post('/guest').send({});
    const kept = await api()
      .post('/guest/claim')
      .set(KEEP)
      .set('Authorization', 'Bearer ' + sessionToken(second))
      .send({ email: uniqueEmail('claim'), password: 'password123' });
    expect(maxAge(cookieOf(kept))).to.eql(7 * DAY);
  });

  it('keeps a trial for its 14 days whatever is asked', async () => {
    const trial = await api().post('/guest').send({});
    expect(maxAge(cookieOf(trial))).to.eql(14 * DAY);
  });

  it('keeps the kind of sign-in when a new password renews the cookie', async () => {
    for (const keep of [false, true]) {
      const { email } = await makeUser({ password: 'old-password' });
      const signedIn = await api()
        .get('/signin')
        .set('authorization', basic(email, 'old-password'))
        .set(keep ? KEEP : {});
      const res = await api()
        .put('/password')
        // The header says nothing here: the sign-in's own kind decides.
        .set(keep ? {} : KEEP)
        .set('Authorization', 'Bearer ' + sessionToken(signedIn))
        .send({ current: 'old-password', password: 'new-password' });
      expect(res).to.have.status(200);
      const cookie = cookieOf(res);
      expect(cookie).to.not.match(/;\s*Domain=/i);
      if (keep) expect(maxAge(cookie)).to.eql(7 * DAY);
      else expect(cookie).to.not.match(/Max-Age|Expires/i);
    }
  });

  it('keeps a sign-in made without a choice, as scripts and older tokens had', async () => {
    const { user } = await makeUser({ password: 'old-password' });
    const res = await api()
      .put('/password')
      .set('Authorization', 'Bearer ' + user.generateToken())
      .send({ current: 'old-password', password: 'new-password' });
    expect(maxAge(cookieOf(res))).to.eql(7 * DAY);
  });

  it('the verify route leaves the cookie alone', async () => {
    const { token } = await makeUser();
    const verified = await api()
      .get('/verify')
      .set('Authorization', 'Bearer ' + token);
    expect(cookieOf(verified)).to.eql('');
  });
});

// Two-step sign-in (docs/mfa-plan.md, item 9): the choice made with the
// password carries through the second step, whatever the second request
// says. The factor check is stream A's; it is stood in for here.
describe('how long a two-step sign-in lasts', () => {
  const real = { ...secondStep.checks };
  beforeEach(() => {
    Object.assign(secondStep.checks, {
      checkFactor: async (_user: unknown, proof: { code?: string }) =>
        proof.code === '123456' ? { ok: true, kind: 'totp' } : { ok: false, code: 'code-wrong' }
    });
  });
  afterEach(() => {
    Object.assign(secondStep.checks, real);
  });

  const mfaUser = async () => {
    const made = await makeUser();
    await User.updateOne(
      { _id: made.user._id },
      { $set: { mfa: { totp: { secret: 'v1.x', lastStep: 0, addedAt: new Date() }, passkeys: [], recoveryCodes: [] } } }
    );
    return made;
  };

  it('keeps the sign-in when the password step asked, and only then', async () => {
    for (const keep of [false, true]) {
      const { email, password } = await mfaUser();
      const step = await api()
        .get('/signin')
        .set('authorization', basic(email, password))
        .set(keep ? KEEP : {});
      expect(step.body.code).to.eql('second-step');
      expect(cookieOf(step)).to.eql('');
      const res = await api()
        .post('/signin/second-step')
        // The header says nothing here: the password step's choice decides.
        .set(keep ? {} : KEEP)
        .send({ pending: step.body.pending, code: '123456' });
      expect(res).to.have.status(200);
      const cookie = cookieOf(res);
      expect(cookie).to.not.match(/;\s*Domain=/i);
      if (keep) expect(maxAge(cookie)).to.eql(7 * DAY);
      else expect(cookie).to.not.match(/Max-Age|Expires/i);
      // The kind of sign-in is in the token too, for routes that renew the cookie.
      const claims = jwt.decode(sessionToken(res)!) as jwt.JwtPayload;
      expect(claims.ss).to.eql(keep ? undefined : true);
    }
  });
});

// Staging and production share no sessions: every cookie is host-only.
describe('session cookies stay on their own host', () => {
  it('never names a Domain in Set-Cookie', async () => {
    const { email, password, token } = await makeUser();
    const replies = [
      await api().get('/signin').set('authorization', basic(email, password)),
      await api()
        .post('/signup')
        .send({ email: uniqueEmail('host'), password: 'password123' }),
      await api().post('/guest').send({}),
      await api().post('/signout'),
      await api()
        .put('/password')
        .set('Authorization', 'Bearer ' + token)
        .send({ current: password, password: 'another-password' })
    ];
    for (const res of replies) {
      const set = ([] as string[]).concat((res.headers['set-cookie'] as string[] | string | undefined) ?? []);
      expect(set.length, res.request.url).to.be.above(0);
      for (const cookie of set) expect(cookie, res.request.url).to.not.match(/;\s*Domain=/i);
    }
  });
});

// In production the cookie is __Host-glazecalc_session (Secure, Path=/, no
// Domain), so no other host can set one the site would read. The older name is
// never read there (one planted for the whole domain would sign the browser
// into someone else's account), and is cleared, as the site set it and as set
// for the site's domain, whenever the session is set or ended. Development
// keeps the older name on Path=/api.
describe('the session cookie in production', () => {
  const NEW = '__Host-glazecalc_session';
  const OLD = 'glazecalc_session';
  let before: string | undefined;
  beforeEach(() => {
    before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
  });
  afterEach(() => {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  });

  const setCookies = (res: { headers: Record<string, unknown> }): string[] =>
    ([] as string[]).concat((res.headers['set-cookie'] as string[] | string | undefined) ?? []);
  const named = (res: { headers: Record<string, unknown> }, name: string): string =>
    setCookies(res).find((c) => c.startsWith(name + '=') && !/;\s*Domain=/i.test(c)) ?? '';
  /** The Set-Cookie that clears a cookie of this name set for the site's domain, or ''. */
  const domainCleared = (res: { headers: Record<string, unknown> }, name: string): string =>
    setCookies(res).find((c) => c.startsWith(name + '=') && /;\s*Domain=/i.test(c)) ?? '';
  const DOMAIN_CLEARED =
    /^glazecalc_session=; Domain=glazecalc\.test; Path=\/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict$/;
  const valueOf = (cookie: string): string => /^[^=]+=([^;]*)/.exec(cookie)![1]!;
  const CLEARED = /=; Path=\/api; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict$/;
  const verifyWith = (cookie: string) => api().get('/verify').set('Cookie', cookie);

  it('signs in with __Host-, Secure and Path=/, and clears the older cookie', async () => {
    const { email, password } = await makeUser();
    const res = await api().get('/signin').set('authorization', basic(email, password)).set(KEEP);
    expect(res).to.have.status(200);
    const cookie = named(res, NEW);
    expect(cookie).to.match(
      /^__Host-glazecalc_session=[^;]+; Max-Age=604800; Path=\/; Expires=[^;]+; HttpOnly; Secure; SameSite=Strict$/
    );
    expect(cookie).to.not.match(/;\s*Domain=/i);
    expect(named(res, OLD)).to.match(CLEARED);
    expect(domainCleared(res, OLD)).to.match(DOMAIN_CLEARED);
    // Only the __Host- cookie names no Domain.
    expect(cookie).to.not.match(/;\s*Domain=/i);
    expect((await verifyWith(NEW + '=' + valueOf(cookie))).body.email).to.eql(email);
  });

  it('never reads the older cookie: one planted for the whole domain signs nobody in', async () => {
    const { user } = await makeUser({ password: 'old-password' });
    const old = user.generateToken('7d', true);
    expect((await verifyWith(OLD + '=' + old)).body.email).to.eql(undefined);
    expect((await verifyWith('theme=dark; ' + OLD + '=' + old)).body.email).to.eql(undefined);
    expect(
      await api()
        .put('/password')
        .set('Cookie', OLD + '=' + old)
        .send({ current: 'old-password', password: 'new-password' })
    ).to.have.status(401);
  });

  it('uses the new cookie when a browser sends both', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const both = await verifyWith(OLD + '=' + a.token + '; ' + NEW + '=' + b.token);
    expect(both.body.email).to.eql(b.email);
  });

  it('clears both names on signing out, and on signing out everywhere', async () => {
    const out = await api().post('/signout');
    expect(named(out, NEW)).to.match(
      /^__Host-glazecalc_session=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict$/
    );
    expect(named(out, OLD)).to.match(CLEARED);
    expect(domainCleared(out, OLD)).to.match(DOMAIN_CLEARED);

    const { token } = await makeUser();
    const everywhere = await api()
      .post('/signout-everywhere')
      .set('Cookie', NEW + '=' + token);
    expect(everywhere).to.have.status(200);
    expect(named(everywhere, NEW)).to.match(/^__Host-glazecalc_session=; Path=\/;/);
    expect(named(everywhere, OLD)).to.match(CLEARED);
    expect(domainCleared(everywhere, OLD)).to.match(DOMAIN_CLEARED);
    expect(await verifyWith(NEW + '=' + token)).to.have.status(401);
  });

  it('sets a trial the same way', async () => {
    const trial = await api().post('/guest').send({});
    expect(named(trial, NEW)).to.match(/; Max-Age=1209600; Path=\/; .*Secure; SameSite=Strict$/);
    expect(named(trial, OLD)).to.match(CLEARED);
  });
});

describe('the session cookie in development', () => {
  it('keeps the older name on Path=/api, without Secure, and does not read the __Host- name', async () => {
    const { email, password, token } = await makeUser();
    const res = await api().get('/signin').set('authorization', basic(email, password));
    const set = ([] as string[]).concat((res.headers['set-cookie'] as string[] | string | undefined) ?? []);
    expect(set).to.have.length(1);
    expect(set[0]).to.match(/^glazecalc_session=[^;]+; Path=\/api; HttpOnly; SameSite=Strict$/);
    const read = (cookie: string) => api().get('/recipe/getAll').set('Cookie', cookie);
    expect(await read('glazecalc_session=' + token)).to.have.status(200);
    expect(await read('__Host-glazecalc_session=' + token)).to.have.status(401);
  });
});
