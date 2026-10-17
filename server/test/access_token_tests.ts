import { Types } from 'mongoose';
import AccessToken, { revokeAll } from '../models/access_token.ts';
import User, { type UserDocument } from '../models/user.ts';
import { hashToken, kindOf, mintToken, verifyAccessToken } from '../lib/token_auth.ts';
import { allows, scopeFor, SCOPES } from '../lib/scopes.ts';
import { api, expect, makeUser } from './support/app.ts';
import { makeToken } from './support/tokens.ts';
import * as mail from './support/mail.ts';

const DAY = 24 * 60 * 60 * 1000;

const recipe = { title: 'Celadon', materials: [{ name: 'Silica', amount: '30' }] };

describe('access tokens: format and storage', () => {
  it('makes tokens with the prefix, 43 characters and a checksum, and knows them again', () => {
    const pat = mintToken('pat');
    expect(pat.token).to.match(/^glazecalc_pat_[0-9A-Za-z]{49}$/);
    expect(kindOf(pat.token)).to.equal('pat');
    expect(kindOf(mintToken('oauth').token)).to.equal('oauth');
    expect(pat.hash)
      .to.equal(hashToken(pat.token))
      .and.to.match(/^[0-9a-f]{64}$/);
    expect(pat.hint).to.equal(pat.token.slice(-4));
    expect(mintToken('pat').token).not.to.equal(pat.token);
  });

  it('turns away a token whose checksum does not fit, or that is written otherwise', () => {
    const { token } = mintToken('pat');
    const changed = token.slice(0, 20) + (token[20] === 'a' ? 'b' : 'a') + token.slice(21);
    expect(kindOf(changed)).to.equal(null);
    expect(kindOf(token.replace('glazecalc_pat_', 'glazecalc_xyz_'))).to.equal(null);
    expect(kindOf(token + 'a')).to.equal(null);
    expect(kindOf('')).to.equal(null);
  });

  it('stores only the hash and hint, never the token', async () => {
    const { user } = await makeUser();
    const token = await makeToken(user);
    const row = await AccessToken.findOne({ userId: user._id }).lean();
    expect(JSON.stringify(row)).not.to.include(token);
    expect(row!.hash).to.equal(hashToken(token));
  });

  it('needs an expiry and a known scope', async () => {
    const { user } = await makeUser();
    const base = { kind: 'pat' as const, userId: user._id, name: 'x', hash: mintToken('pat').hash };
    const refusal = async (fields: object): Promise<string> => {
      try {
        await new AccessToken({ ...base, ...fields }).save();
      } catch (err) {
        return String(err);
      }
      return 'saved';
    };
    const later = new Date(Date.now() + DAY);
    expect(await refusal({ scopes: ['data:read'] })).to.match(/expiresAt/);
    expect(await refusal({ scopes: ['admin'], expiresAt: later })).to.match(/scopes/);
    expect(await refusal({ scopes: [], expiresAt: later })).to.match(/scope/);
  });

  it('verifies a working token and records its use, and refuses revoked, expired, unknown and trial ones', async () => {
    const { user } = await makeUser();
    const good = await makeToken(user);
    const found = await verifyAccessToken(good);
    expect(String(found?.user._id)).to.equal(String(user._id));
    expect((await AccessToken.findOne({ hash: hashToken(good) }))!.lastUsedAt).to.be.instanceOf(Date);

    expect(await verifyAccessToken(await makeToken(user, { revokedAt: new Date() }))).to.equal(null);
    expect(await verifyAccessToken(await makeToken(user, { expiresAt: new Date(Date.now() - 1000) }))).to.equal(null);
    expect(await verifyAccessToken(mintToken('pat').token)).to.equal(null);
    // A token of the other kind's prefix does not match a row of this kind.
    expect(await verifyAccessToken(good.replace('_pat_', '_oat_'))).to.equal(null);

    const { user: trial } = await makeUser();
    await User.updateOne({ _id: trial._id }, { $set: { guest: true, expiresAt: new Date(Date.now() + DAY) } });
    expect(await verifyAccessToken(await makeToken(trial))).to.equal(null);

    const gone = await makeToken(user);
    await User.deleteOne({ _id: user._id });
    expect(await verifyAccessToken(gone)).to.equal(null);
  });

  it('revokes every token of an account still in use, and no one else’s', async () => {
    const { user } = await makeUser();
    const { user: other } = await makeUser();
    await makeToken(user);
    await makeToken(user, { kind: 'oauth', scopes: ['data:write'] });
    const others = await makeToken(other);
    expect(await revokeAll(user._id, 'person')).to.equal(2);
    expect(await AccessToken.countDocuments({ userId: user._id, revokedWhy: 'person' })).to.equal(2);
    expect(await verifyAccessToken(others)).not.to.equal(null);
    expect(await revokeAll(new Types.ObjectId(), 'person')).to.equal(0);
  });
});

describe('access tokens: scopes', () => {
  it('lets data:read read every area and change none; data:write do both', () => {
    expect(SCOPES).to.eql(['data:read', 'data:write']);
    expect(allows(['data:read'], 'recipes:read')).to.equal(true);
    expect(allows(['data:read'], 'recipes:write')).to.equal(false);
    expect(allows(['data:write'], 'recipes:read')).to.equal(true);
    expect(allows(['data:write'], 'notes:write')).to.equal(true);
    expect(allows(['data:write'], 'preferences:write')).to.equal(false);
    expect(allows(['admin'], 'recipes:read')).to.equal(false);
    expect(allows([], 'recipes:read')).to.equal(false);
    expect(scopeFor('recipes:read')).to.equal('data:read');
    expect(scopeFor('recipes:write')).to.equal('data:write');
  });
});

describe('access tokens: routes', () => {
  let user: UserDocument;
  let session: string;
  beforeEach(async () => {
    ({ user, token: session } = await makeUser());
  });
  const bearer = (token: string) => 'Bearer ' + token;

  it('reads records with data:read, and gets 403 insufficient_scope to change them', async () => {
    await api().post('/recipe/create').set('Authorization', bearer(session)).send(recipe);
    const token = await makeToken(user, { scopes: ['data:read'] });
    const list = await api().get('/recipe/getAll').set('Authorization', bearer(token));
    expect(list).to.have.status(200);
    expect(list.body).to.have.length(1);

    const refused = await api().post('/recipe/create').set('Authorization', bearer(token)).send(recipe);
    expect(refused).to.have.status(403);
    expect(refused.headers['www-authenticate']).to.match(/^Bearer realm="glazecalc", error="insufficient_scope"/);
    expect(refused.headers['www-authenticate']).to.include('scope="data:write"');
    expect(refused.body.code).to.equal('token-scope');
    expect(refused.headers['set-cookie']).to.equal(undefined);
  });

  it('creates, changes and deletes records with data:write, as the token’s owner', async () => {
    const token = await makeToken(user, { scopes: ['data:write'] });
    const made = await api().post('/recipe/create').set('Authorization', bearer(token)).send(recipe);
    expect(made).to.have.status(200);
    expect(made.body.ownedBy).to.equal(String(user._id));
    const id = made.body._id as string;
    const changed = await api()
      .put('/recipe/change/' + id)
      .set('Authorization', bearer(token))
      .send({ recipe: { title: 'Celadon 2' } });
    expect(changed).to.have.status(200);
    expect(
      await api()
        .delete('/recipe/delete/' + id)
        .set('Authorization', bearer(token))
    ).to.have.status(200);
  });

  it('answers 401 invalid_token for a token that does not work', async () => {
    const tokens = [
      mintToken('pat').token,
      'glazecalc_pat_nonsense',
      await makeToken(user, { revokedAt: new Date() }),
      await makeToken(user, { expiresAt: new Date(Date.now() - 1000) })
    ];
    for (const token of tokens) {
      const res = await api().get('/recipe/getAll').set('Authorization', bearer(token));
      expect(res).to.have.status(401);
      expect(res.headers['www-authenticate']).to.match(/^Bearer realm="glazecalc", error="invalid_token"/);
      expect(res.body.code).to.equal('token-invalid');
    }
  });

  it('never lets a token reach the account, the password, signing out, two-step sign-in or the export', async () => {
    const token = await makeToken(user, { scopes: ['data:write'] });
    const id = String(user._id);
    const tries = [
      api().get('/verify'),
      api()
        .put('/usersettings/' + id)
        .send({ displayname: 'x' }),
      api()
        .delete('/deleteuser/' + id)
        .send({ password: 'password123' }),
      api().put('/password').send({ current: 'password123', password: 'newpassword123' }),
      api().post('/password/forgot').send({ email: user.email }),
      api().post('/signout'),
      api().post('/signout-everywhere'),
      api().get('/mfa'),
      api().post('/mfa/confirm/options'),
      api().get('/export'),
      api().get('/preferences'),
      api().put('/shelf').send({ shelf: [] }),
      api().post('/email/resend'),
      api().post('/guest/claim'),
      api().get('/no-such-route'),
      // Deleting for good and emptying the Trash stay with the web session.
      api().delete('/trash/empty')
    ];
    for (const [i, request] of tries.entries()) {
      const res = await request.set('Authorization', bearer(token));
      expect(res, 'request ' + i).to.have.status(403);
      expect(res.headers['www-authenticate']).to.match(/error="insufficient_scope"/);
      expect(res.headers['www-authenticate']).not.to.include('scope="');
      expect(res.body.code).to.equal('token-not-here');
      expect(res.headers['set-cookie'], 'request ' + i).to.equal(undefined);
    }
    // Nothing was changed.
    const after = await User.findById(user._id);
    expect(after!.displayname).not.to.equal('x');
    expect(after!.tokenVersion || 0).to.equal(user.tokenVersion || 0);
  });

  it('judges a request with a token by the token alone, never by a session cookie with it', async () => {
    const token = await makeToken(user, { scopes: ['data:read'] });
    const res = await api()
      .get('/verify')
      .set('Authorization', bearer(token))
      .set('Cookie', 'glazecalc_session=' + session);
    expect(res).to.have.status(403);
    const write = await api()
      .post('/recipe/create')
      .set('Authorization', bearer(token))
      .set('Cookie', 'glazecalc_session=' + session)
      .send(recipe);
    expect(write).to.have.status(403);
  });

  it('is revoked by a password reset and by signing out everywhere, but not by a password change', async () => {
    const token = await makeToken(user);
    const changed = await api()
      .put('/password')
      .set('Authorization', bearer(session))
      .send({ current: 'password123', password: 'newpassword123' });
    expect(changed).to.have.status(200);
    expect(await api().get('/recipe/getAll').set('Authorization', bearer(token))).to.have.status(200);

    // The change signed out every session; a new one, as signing in again gives.
    const fresh = (await User.findById(user._id))!.generateToken();
    const out = await api().post('/signout-everywhere').set('Authorization', bearer(fresh));
    expect(out).to.have.status(200);
    expect(await api().get('/recipe/getAll').set('Authorization', bearer(token))).to.have.status(401);
    expect((await AccessToken.findOne({ hash: hashToken(token) }))!.revokedWhy).to.equal('signed-out-everywhere');
  });

  it('gets replies no browser or proxy keeps, as every signed-in reply is', async () => {
    const write = await makeToken(user, { scopes: ['data:write'] });
    const made = await api().post('/recipe/create').set('Authorization', bearer(write)).send(recipe);
    const replies = [
      made,
      await api().get('/recipe/getAll').set('Authorization', bearer(write)),
      await api()
        .get('/recipe/versions/' + made.body._id)
        .set('Authorization', bearer(write)),
      await api().get('/trash/getAll').set('Authorization', bearer(session)),
      await api().get('/verify').set('Authorization', bearer(write)),
      await api()
        .get('/recipe/getAll')
        .set('Authorization', bearer(mintToken('pat').token))
    ];
    for (const [i, res] of replies.entries()) expect(res.headers['cache-control'], 'reply ' + i).to.equal('no-store');
  });

  it('is revoked, every one, by a password reset', async () => {
    const read = await makeToken(user);
    const write = await makeToken(user, { kind: 'oauth', scopes: ['data:write'] });
    const before = mail.to(user.email).length;
    expect(await api().post('/password/forgot').send({ email: user.email })).to.have.status(200);
    const sent = await mail.waitFor(user.email, before + 1);
    const link = mail.tokenIn(sent[sent.length - 1]);
    expect(await api().post('/password/reset').send({ token: link, password: 'brand-new-password' })).to.have.status(
      200
    );
    for (const token of [read, write]) {
      expect(await api().get('/recipe/getAll').set('Authorization', bearer(token))).to.have.status(401);
    }
    expect(await AccessToken.countDocuments({ userId: user._id, revokedWhy: 'password-reset' })).to.equal(2);
  });

  it('limits tokens that do not work per address, without counting ones that do', async () => {
    process.env.RATE_LIMITS = 'on';
    try {
      const good = await makeToken(user);
      for (let i = 0; i < 5; i++) {
        expect(await api().get('/recipe/getAll').set('Authorization', bearer(good))).to.have.status(200);
      }
      let last;
      for (let i = 0; i < 31; i++) {
        last = await api()
          .get('/recipe/getAll')
          .set('Authorization', bearer(mintToken('pat').token));
      }
      expect(last).to.have.status(429);
      expect(last!.body.code).to.equal('too-many-tokens');
      // A request without a token is not held up.
      expect(await api().get('/recipe/getAll').set('Authorization', bearer(session))).to.have.status(200);
    } finally {
      process.env.RATE_LIMITS = 'off';
    }
  });
});
