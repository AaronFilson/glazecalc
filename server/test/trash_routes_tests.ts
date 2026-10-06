import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

// Saving, listing, changing and removing your own trash records. Creating and
// changing one wrap the record: { trash: {...} }.
describe('trash API', () => {
  const trash = {
    content: ['Trash info here.'],
    date: '1/1/2017',
    fromCollection: 'test collection: i.e. advice'
  };
  const without = (field: keyof typeof trash) => {
    const copy: Partial<typeof trash> = { ...trash };
    delete copy[field];
    return copy;
  };
  let user: UserDocument;
  let token: string;
  // superagent's types leave out null, which the 400 test sends on purpose.
  const create = (body: object | null = { trash }) =>
    api()
      .post('/trash/create')
      .set('Authorization', 'Bearer ' + token)
      .send(body as object);

  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  it('saves a trash record and answers with it', async () => {
    const res = await create();
    expect(res).to.have.status(200);
    expect(res.body).to.include({ date: '1/1/2017', fromCollection: trash.fromCollection, ownedBy: String(user._id) });
    expect(res.body.content).to.eql(['Trash info here.']);
    expect(res.body._id).to.be.a('string');
  });

  it('lists all of your trash records, and finds the newest', async () => {
    for (const date of ['1/1/2017', '1/2/2017', '1/3/2017', '1/4/2017']) {
      expect(await create({ trash: { ...trash, date } })).to.have.status(200);
    }
    const all = await api()
      .get('/trash/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all).to.have.status(200);
    expect((all.body as { date: string }[]).map((t) => t.date)).to.eql([
      '1/1/2017',
      '1/2/2017',
      '1/3/2017',
      '1/4/2017'
    ]);

    const latest = await api()
      .get('/trash/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest).to.have.status(200);
    expect(latest.body.date).to.eql('1/4/2017');
  });

  it('says when there is no trash record yet', async () => {
    const res = await api()
      .get('/trash/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(404);
    expect(res.body.msg).to.eql('No trash saved yet');
  });

  it('changes a trash record', async () => {
    const saved = (await create()).body;
    const res = await api()
      .put('/trash/change/' + saved._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ trash: { ...saved, content: ['Changed info.'] } });
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully updated trash');
    const latest = await api()
      .get('/trash/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest.body.content).to.eql(['Changed info.']);
    expect(latest.body.date).to.eql('1/1/2017');
  });

  it('removes a trash record', async () => {
    const saved = (await create()).body;
    const res = await api()
      .delete('/trash/delete/' + saved._id)
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully deleted trash');
    const all = await api()
      .get('/trash/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('answers 400 when a field or the trash wrapper is missing', async () => {
    const bodies = [
      null,
      { trashdata: 'not anything good' },
      trash,
      { trash: without('content') },
      { trash: without('date') },
      { trash: without('fromCollection') }
    ];
    for (const body of bodies) {
      const res = await create(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Missing required information');
    }
    const all = await api()
      .get('/trash/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('needs a sign-in', async () => {
    expect(await api().post('/trash/create').send({ trash })).to.have.status(401);
    expect(await api().get('/trash/getAll')).to.have.status(401);
  });
});
