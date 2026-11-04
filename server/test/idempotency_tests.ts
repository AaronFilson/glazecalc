import Idempotency from '../models/idempotency.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import { api, expect, makeUser } from './support/app.ts';

const bearer = (token: string) => 'Bearer ' + token;
const recipe = { title: 'Celadon', materials: [{ name: 'Silica', amount: '30' }] };
const KEY = 'a1b2c3d4-0000-4000-8000-000000000001';

describe('Idempotency-Key on writes the offline outbox sends again', () => {
  let token: string;
  let userId: string;
  beforeEach(async () => {
    const made = await makeUser();
    token = made.token;
    userId = String(made.user._id);
  });

  const create = (key?: string, body: object = recipe) => {
    const req = api().post('/recipe/create').set('Authorization', bearer(token));
    return (key ? req.set('Idempotency-Key', key) : req).send(body);
  };

  it('answers a repeated create with the record the first made, and makes one', async () => {
    const first = await create(KEY);
    const second = await create(KEY);
    expect(first).to.have.status(200);
    expect(second).to.have.status(200);
    expect(second.body._id).to.equal(first.body._id);
    expect(await Recipe.countDocuments({ ownedBy: userId })).to.equal(1);
  });

  it('treats another key, or none, as another create', async () => {
    await create(KEY);
    await create('a1b2c3d4-0000-4000-8000-000000000002');
    await create();
    await create();
    expect(await Recipe.countDocuments({ ownedBy: userId })).to.equal(4);
  });

  it('keeps one key apart between accounts', async () => {
    const other = await makeUser();
    await create(KEY);
    const theirs = await api()
      .post('/recipe/create')
      .set('Authorization', bearer(other.token))
      .set('Idempotency-Key', KEY)
      .send(recipe);
    expect(theirs).to.have.status(200);
    expect(await Recipe.countDocuments({ ownedBy: userId })).to.equal(1);
    expect(await Recipe.countDocuments({ ownedBy: String(other.user._id) })).to.equal(1);
  });

  it('answers a repeated change with its first answer, making it once', async () => {
    const saved = (await create()).body as { _id: string };
    const send = (title: string) =>
      api()
        .put('/recipe/change/' + saved._id)
        .set('Authorization', bearer(token))
        .set('Idempotency-Key', KEY)
        .set('If-Match', '"0"')
        .send({ recipe: { title } });
    const first = await send('One');
    const again = await send('One');
    expect(first).to.have.status(200);
    expect(again).to.have.status(200);
    expect(again.body.rev).to.equal(1);
    // Without the key the second would have been a 409; the record was changed once.
    expect(await Recipe.findById(saved._id).lean()).to.include({ title: 'One', rev: 1 });
    expect(await Idempotency.countDocuments({ ownedBy: userId, key: KEY })).to.equal(1);
  });

  it('answers a repeated delete with its first answer, not a 404', async () => {
    const saved = (await create()).body as { _id: string };
    const remove = () =>
      api()
        .delete('/recipe/delete/' + saved._id)
        .set('Authorization', bearer(token))
        .set('Idempotency-Key', KEY);
    const first = await remove();
    const again = await remove();
    expect(first).to.have.status(200);
    expect(again).to.have.status(200);
    expect(again.body.trashId).to.equal(first.body.trashId);
  });

  it('answers a repeated stale change with the same 409', async () => {
    const saved = (await create()).body as { _id: string };
    await api()
      .put('/recipe/change/' + saved._id)
      .set('Authorization', bearer(token))
      .send({ recipe: { title: 'Theirs' } });
    const send = () =>
      api()
        .put('/recipe/change/' + saved._id)
        .set('Authorization', bearer(token))
        .set('Idempotency-Key', KEY)
        .set('If-Match', '"0"')
        .send({ recipe: { title: 'Mine' } });
    expect((await send()).status).to.equal(409);
    expect((await send()).status).to.equal(409);
  });

  it('ignores a key that is not a plain token', async () => {
    await create('not a key!');
    await create('not a key!');
    expect(await Recipe.countDocuments({ ownedBy: userId })).to.equal(2);
  });

  it('works for notes too', async () => {
    const body = { content: 'x', relatedCollection: 'recipe', relatedId: 'r1' };
    const send = () =>
      api().post('/notes/create').set('Authorization', bearer(token)).set('Idempotency-Key', KEY).send(body);
    const first = await send();
    const second = await send();
    expect(second.body._id).to.equal(first.body._id);
    expect(await Note.countDocuments({ ownedBy: userId })).to.equal(1);
  });
});
