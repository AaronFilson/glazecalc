import { api, expect, makeUser } from './support/app.ts';

// Saving, listing, changing and removing your own recipes. Other users' records
// are covered in ownership_tests.ts.
describe('recipe API', () => {
  const leach = {
    title: 'Leach Celadon 4.5',
    materials: [
      { name: 'Custer Feldspar', amount: 40 },
      { name: 'Silica', amount: 30 },
      { name: 'Whiting', amount: 20 },
      { name: 'EPK', amount: 10 }
    ],
    additives: [{ name: 'Red iron oxide', amount: 4.5 }],
    notes: ['Cone 10 reduction']
  };
  let token: string;
  // send() is typed for objects; for null it sends an empty request.
  const create = (recipe: object | null = leach) =>
    api()
      .post('/recipe/create')
      .set('Authorization', 'Bearer ' + token)
      .send(recipe as object);

  beforeEach(async () => {
    ({ token } = await makeUser());
  });

  it('saves a recipe and answers with it', async () => {
    const res = await create();
    expect(res).to.have.status(200);
    expect(res.body).to.include({ title: 'Leach Celadon 4.5' });
    expect(res.body.materials).to.eql(leach.materials);
    expect(res.body.additives).to.eql(leach.additives);
    expect(res.body._id).to.be.a('string');
  });

  it('keeps whether the unity formula counts the additives', async () => {
    const res = await create({ ...leach, includeAdditives: true });
    expect(res).to.have.status(200);
    expect(res.body.includeAdditives).to.equal(true);
  });

  it('lists all of your recipes, and finds the newest', async () => {
    for (const title of ['First', 'Second', 'Third']) {
      expect(await create({ ...leach, title })).to.have.status(200);
    }
    const all = await api()
      .get('/recipe/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all).to.have.status(200);
    expect((all.body as { title: string }[]).map((r) => r.title)).to.eql(['First', 'Second', 'Third']);

    const latest = await api()
      .get('/recipe/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest).to.have.status(200);
    expect(latest.body.title).to.eql('Third');
  });

  it('says when there is no recipe yet', async () => {
    const res = await api()
      .get('/recipe/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(404);
    expect(res.body.msg).to.eql('No recipe saved yet');
  });

  it('changes a recipe', async () => {
    const saved = (await create()).body as { _id: string };
    const res = await api()
      .put('/recipe/change/' + saved._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ recipe: { ...saved, title: 'Leach Celadon 2' } });
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully updated recipe');
    const latest = await api()
      .get('/recipe/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest.body.title).to.eql('Leach Celadon 2');
  });

  it('removes a recipe', async () => {
    const saved = (await create()).body as { _id: string };
    const res = await api()
      .delete('/recipe/delete/' + saved._id)
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully deleted recipe');
    const all = await api()
      .get('/recipe/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('answers 400 when the title or materials are missing', async () => {
    for (const body of [null, { title: 'No materials' }, { materials: leach.materials }]) {
      const res = await create(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Missing required information');
    }
  });

  it('needs a sign-in', async () => {
    expect(await api().post('/recipe/create').send(leach)).to.have.status(401);
    expect(await api().get('/recipe/getAll')).to.have.status(401);
  });

  it('shares the standard recipes with anyone, cached briefly', async () => {
    const res = await api().get('/recipe/getStandard');
    expect(res).to.have.status(200);
    expect(res.body).to.be.an('array');
    expect(res.headers['cache-control']).to.eql('public, max-age=300');
  });
});
