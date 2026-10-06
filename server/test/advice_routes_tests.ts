import Advice from '../models/advice.ts';
import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

// Saving, listing, changing and removing your own advice, and the shared
// standard list.
describe('advice API', () => {
  const backups = {
    title: 'Test Advice',
    content: 'Use care in storing notes, and make backups of formulas.',
    tags: ['test', 'test tag', 'test tags here', 'test one', 'advice tag']
  };
  let user: UserDocument;
  let token: string;
  // send() is typed for objects; for null it sends an empty request.
  const create = (advice: object | null = backups) =>
    api()
      .post('/advice/create')
      .set('Authorization', 'Bearer ' + token)
      .send(advice as object);

  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  it('saves a piece of advice and answers with it', async () => {
    const res = await create();
    expect(res).to.have.status(200);
    expect(res.body).to.include({ title: 'Test Advice', content: backups.content, ownedBy: user.id });
    expect(res.body.tags).to.eql(backups.tags);
    expect(res.body._id).to.be.a('string');
  });

  it('lists all of your advice, and finds the newest', async () => {
    for (const title of ['First', 'Second', 'Third', 'Fourth']) {
      expect(await create({ ...backups, title })).to.have.status(200);
    }
    const all = await api()
      .get('/advice/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all).to.have.status(200);
    expect((all.body as { title: string }[]).map((a) => a.title)).to.eql(['First', 'Second', 'Third', 'Fourth']);

    const latest = await api()
      .get('/advice/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest).to.have.status(200);
    expect(latest.body.title).to.eql('Fourth');
  });

  it('says when there is no advice yet', async () => {
    const res = await api()
      .get('/advice/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(404);
    expect(res.body.msg).to.eql('No advice saved yet');
  });

  it('changes a piece of advice', async () => {
    const saved = (await create()).body as { _id: string };
    // The client sends back the whole record it was given, _id and ownedBy included.
    const res = await api()
      .put('/advice/change/' + saved._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ ...saved, content: 'Wear protective glasses when checking kilns.' });
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully updated advice');
    const latest = await api()
      .get('/advice/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest.body).to.include({ _id: saved._id, content: 'Wear protective glasses when checking kilns.' });
  });

  it('removes a piece of advice', async () => {
    const saved = (await create()).body as { _id: string };
    const res = await api()
      .delete('/advice/delete/' + saved._id)
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully deleted advice');
    const all = await api()
      .get('/advice/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('answers 400 when the title, content or tags are missing, request after request', async () => {
    const { title, content, tags } = backups;
    for (const body of [null, null, { content, tags }, { title, tags }, { title, content }]) {
      const res = await create(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Missing required information');
    }
    const all = await api()
      .get('/advice/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('needs a sign-in', async () => {
    expect(await api().post('/advice/create').send(backups)).to.have.status(401);
    expect(await api().get('/advice/getAll')).to.have.status(401);
  });

  describe('standard advice', () => {
    const standard = { ...backups, title: 'Standard test advice', ownedBy: 'Standard' };

    after(() => Advice.deleteMany({ ownedBy: 'Standard', title: standard.title }));

    it('is shared with anyone, cached briefly, and leaves out your own advice', async () => {
      await Advice.create(standard);
      expect(await create({ ...backups, title: 'Private advice' })).to.have.status(200);

      const res = await api().get('/advice/getStandard');
      expect(res).to.have.status(200);
      expect(res.headers['cache-control']).to.eql('public, max-age=300');
      const titles = (res.body as { title: string }[]).map((a) => a.title);
      expect(titles).to.include(standard.title);
      expect(titles).to.not.include('Private advice');
      expect((res.body as { ownedBy: string }[]).every((a) => a.ownedBy === 'Standard')).to.eql(true);
    });
  });
});
