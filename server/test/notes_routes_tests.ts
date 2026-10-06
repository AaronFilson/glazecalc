import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

// Saving, listing, changing and removing your own notes. Other users' records
// are covered in ownership_tests.ts.
describe('notes API', () => {
  const note = {
    title: 'Kiln',
    content: 'This is a note for testing.',
    relatedCollection: 'Notes',
    relatedId: '7'
  };
  const without = (field: keyof typeof note) => {
    const copy: Partial<typeof note> = { ...note };
    delete copy[field];
    return copy;
  };
  let user: UserDocument;
  let token: string;
  // superagent's types leave out null, which the 400 test sends on purpose.
  const create = (body: object | null = note) =>
    api()
      .post('/notes/create')
      .set('Authorization', 'Bearer ' + token)
      .send(body as object);

  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  it('saves a note and answers with it', async () => {
    const res = await create();
    expect(res).to.have.status(200);
    expect(res.body).to.include({ ...note, ownedBy: String(user._id) });
    expect(res.body._id).to.be.a('string');
  });

  it('lists all of your notes, and finds the newest', async () => {
    for (const relatedId of ['1', '2', '3', '4']) {
      expect(await create({ ...note, relatedId })).to.have.status(200);
    }
    const all = await api()
      .get('/notes/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all).to.have.status(200);
    expect((all.body as { relatedId: string }[]).map((n) => n.relatedId)).to.eql(['1', '2', '3', '4']);

    const latest = await api()
      .get('/notes/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest).to.have.status(200);
    expect(latest.body.relatedId).to.eql('4');
  });

  it('says when there is no note yet', async () => {
    const res = await api()
      .get('/notes/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(404);
    expect(res.body.msg).to.eql('No note saved yet');
  });

  it('changes a note', async () => {
    const saved = (await create()).body;
    const res = await api()
      .put('/notes/change/' + saved._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ ...saved, content: 'Element 3 is weak' });
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully updated note');
    const latest = await api()
      .get('/notes/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest.body).to.include({ content: 'Element 3 is weak', relatedId: '7' });
  });

  it('removes a note', async () => {
    const saved = (await create()).body;
    const res = await api()
      .delete('/notes/delete/' + saved._id)
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully deleted note');
    const all = await api()
      .get('/notes/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('answers 400 when the content or what it belongs to is missing', async () => {
    const bodies = [
      null,
      { trashdata: 'not anything good' },
      without('content'),
      without('relatedCollection'),
      without('relatedId')
    ];
    for (const body of bodies) {
      const res = await create(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Missing required information');
    }
    const all = await api()
      .get('/notes/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('needs a sign-in', async () => {
    expect(await api().post('/notes/create').send(note)).to.have.status(401);
    expect(await api().get('/notes/getAll')).to.have.status(401);
  });
});
