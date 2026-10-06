import jwt from 'jsonwebtoken';
import { api, expect, makeUser } from './support/app.ts';
import appSecret from '../lib/app_secret.ts';

// Each of these used to reject a promise with no handler, which exits the
// whole server process on current versions of Node.
describe('error handling', () => {
  let token: string;

  beforeEach(async () => {
    ({ token } = await makeUser());
  });

  const changeWithBadId = () =>
    api()
      .put('/recipe/change/not-an-id')
      .set('Authorization', 'Bearer ' + token)
      .send({ recipe: { title: 'x', materials: [1] } });
  const deleteWithBadId = () =>
    api()
      .delete('/materials/delete/not-an-id')
      .set('Authorization', 'Bearer ' + token);
  const tokenWithBadId = () => jwt.sign({ id: 'not-an-id' }, appSecret);

  it('answers 400 to a change with a malformed id', async () => {
    const res = await changeWithBadId();
    expect(res).to.have.status(400);
    expect(res.body.msg).to.eql('Invalid id');
  });

  it('answers 400 to a delete with a malformed id', async () => {
    const res = await deleteWithBadId();
    expect(res).to.have.status(400);
    expect(res.body.msg).to.eql('Invalid id');
  });

  it('answers getLatest with not found for a user with no recipes', async () => {
    const res = await api()
      .get('/recipe/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(404);
    expect(res.body.msg).to.eql('No recipe saved yet');
  });

  it('lists the standard recipes and materials', async () => {
    for (const path of ['/recipe/getStandard', '/materials/getStandard']) {
      const res = await api()
        .get(path)
        .set('Authorization', 'Bearer ' + token);
      expect(res, path).to.have.status(200);
      expect(res.body, path).to.be.an('array');
    }
  });

  it('refuses a token whose user id is not an ObjectId', async () => {
    const res = await api()
      .get('/recipe/getAll')
      .set('Authorization', 'Bearer ' + tokenWithBadId());
    expect(res).to.have.status(401);
    expect(res.body.msg).to.eql('could not authenticate user');
  });

  it('keeps serving requests after all of these', async () => {
    expect(await changeWithBadId()).to.have.status(400);
    expect(await deleteWithBadId()).to.have.status(400);
    expect(
      await api()
        .get('/recipe/getLatest')
        .set('Authorization', 'Bearer ' + token)
    ).to.have.status(404);
    expect(
      await api()
        .get('/recipe/getAll')
        .set('Authorization', 'Bearer ' + tokenWithBadId())
    ).to.have.status(401);

    const res = await api()
      .get('/recipe/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(200);
    expect(res.body).to.eql([]);
  });
});
