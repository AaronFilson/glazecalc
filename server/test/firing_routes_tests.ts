import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

// Saving, listing, changing and removing your own firing logs. Other users'
// records are covered in ownership_tests.ts.
describe('firing API', () => {
  const firing = {
    date: 'A date string',
    fieldsIncluded: ['gas', 'air', 'damper', 'temp', 'cone', 'weather'],
    kiln: 'Test kiln #1',
    notes: ['fake note id 1', 'fake note id 2'],
    rows: [
      ['row1', 'a second part of row1'],
      ['row2', 'row2', 'row2 part 3']
    ],
    title: 'test firing chart 1'
  };
  const without = (field: keyof typeof firing) => {
    const copy: Partial<typeof firing> = { ...firing };
    delete copy[field];
    return copy;
  };
  let user: UserDocument;
  let token: string;
  // superagent's types leave out null, which the 400 test sends on purpose.
  const create = (body: object | null = firing) =>
    api()
      .post('/firing/create')
      .set('Authorization', 'Bearer ' + token)
      .send(body as object);

  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  it('saves a firing log and answers with it', async () => {
    const res = await create();
    expect(res).to.have.status(200);
    expect(res.body).to.include({
      title: 'test firing chart 1',
      kiln: 'Test kiln #1',
      date: 'A date string',
      ownedBy: String(user._id)
    });
    expect(res.body.fieldsIncluded).to.eql(firing.fieldsIncluded);
    expect(res.body.rows).to.eql(firing.rows);
    expect(res.body.notes).to.eql(firing.notes);
    expect(res.body._id).to.be.a('string');
  });

  it('lists all of your firing logs, and finds the newest', async () => {
    for (const title of ['First', 'Second', 'Third', 'Fourth']) {
      expect(await create({ ...firing, title })).to.have.status(200);
    }
    const all = await api()
      .get('/firing/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all).to.have.status(200);
    expect((all.body as { title: string }[]).map((f) => f.title)).to.eql(['First', 'Second', 'Third', 'Fourth']);

    const latest = await api()
      .get('/firing/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest).to.have.status(200);
    expect(latest.body.title).to.eql('Fourth');
  });

  it('says when there is no firing log yet', async () => {
    const res = await api()
      .get('/firing/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(404);
    expect(res.body.msg).to.eql('No firing saved yet');
  });

  it('changes a firing log', async () => {
    const saved = (await create()).body;
    const res = await api()
      .put('/firing/change/' + saved._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ ...saved, title: 'newly updated title' });
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully updated firing');
    const latest = await api()
      .get('/firing/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest.body.title).to.eql('newly updated title');
    expect(latest.body.rows).to.eql(firing.rows);
  });

  it('removes a firing log', async () => {
    const saved = (await create()).body;
    const res = await api()
      .delete('/firing/delete/' + saved._id)
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully deleted firing');
    const all = await api()
      .get('/firing/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('answers 400 when the title, fields or rows are missing', async () => {
    const bodies = [
      null,
      { trashdata: 'not anything good' },
      without('title'),
      without('fieldsIncluded'),
      without('rows')
    ];
    for (const body of bodies) {
      const res = await create(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Missing required information');
    }
    const all = await api()
      .get('/firing/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('needs a sign-in', async () => {
    expect(await api().post('/firing/create').send(firing)).to.have.status(401);
    expect(await api().get('/firing/getAll')).to.have.status(401);
  });
});
