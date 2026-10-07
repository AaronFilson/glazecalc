import Additive from '../models/additive.ts';
import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

// Saving, listing, changing and removing your own additives, and the shared
// standard list.
describe('additives API', () => {
  const ochre = {
    name: 'Yellow Ochre',
    fields: [
      { name: 'Iron', amount: 1 },
      { name: 'Clay', amount: 1 }
    ],
    notes: ['fake note id 3', 'fake note id 4'],
    relatedTo: ['RIO', 'Rust', 'Clay']
  };
  let user: UserDocument;
  let token: string;
  // send() is typed for objects; for null it sends an empty request.
  const create = (additive: object | null = ochre) =>
    api()
      .post('/additives/create')
      .set('Authorization', 'Bearer ' + token)
      .send(additive as object);

  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  it('saves an additive and answers with it', async () => {
    const res = await create();
    expect(res).to.have.status(200);
    expect(res.body).to.include({ name: 'Yellow Ochre', ownedBy: user.id });
    expect(res.body.fields).to.eql(ochre.fields);
    expect(res.body.notes).to.eql(ochre.notes);
    expect(res.body.relatedTo).to.eql(ochre.relatedTo);
    expect(res.body._id).to.be.a('string');
  });

  it('saves a stain with no chemistry, for recipes to leave out of the unity formula', async () => {
    const res = await create({ name: 'Mason 6600', fields: [], noChemistry: true });
    expect(res).to.have.status(200);
    expect(res.body).to.include({ name: 'Mason 6600', noChemistry: true });
    expect(res.body.fields).to.eql([]);
  });

  it('keeps the chemistry of an additive, so a recipe can count it in the unity formula', async () => {
    const cobalt = {
      name: 'My cobalt oxide',
      rawformula: 'Co₃O₄',
      percentmole: 'molecular',
      loi: 6.64,
      molecularweight: 80.26,
      equivalent: 80.26,
      formulaweight: 74.93,
      fields: [{ name: 'CoO', amount: '1', amountUnity: 1 }]
    };
    const res = await create(cobalt);
    expect(res).to.have.status(200);
    expect(res.body).to.include({ percentmole: 'molecular', loi: 6.64, equivalent: 80.26, formulaweight: 74.93 });
    expect(res.body.fields).to.eql(cobalt.fields);
  });

  it('lists all of your additives, and finds the newest', async () => {
    for (const name of ['First', 'Second', 'Third', 'Fourth']) {
      expect(await create({ ...ochre, name })).to.have.status(200);
    }
    const all = await api()
      .get('/additives/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all).to.have.status(200);
    expect((all.body as { name: string }[]).map((a) => a.name)).to.eql(['First', 'Second', 'Third', 'Fourth']);

    const latest = await api()
      .get('/additives/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest).to.have.status(200);
    expect(latest.body.name).to.eql('Fourth');
  });

  it('says when there is no additive yet', async () => {
    const res = await api()
      .get('/additives/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(404);
    expect(res.body.msg).to.eql('No additive saved yet');
  });

  it('changes an additive', async () => {
    const saved = (await create()).body as { _id: string };
    // The client sends back the whole record it was given, _id and ownedBy included.
    const res = await api()
      .put('/additives/change/' + saved._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ ...saved, name: 'Red Ochre' });
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully updated additive');
    const latest = await api()
      .get('/additives/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest.body).to.include({ _id: saved._id, name: 'Red Ochre' });
  });

  it('removes an additive', async () => {
    const saved = (await create()).body as { _id: string };
    const res = await api()
      .delete('/additives/delete/' + saved._id)
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully deleted additive');
    const all = await api()
      .get('/additives/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('answers 400 when the name or fields are missing, request after request', async () => {
    for (const body of [null, null, { name: 'No fields' }, { fields: ochre.fields }]) {
      const res = await create(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Missing required information');
    }
    const all = await api()
      .get('/additives/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('needs a sign-in', async () => {
    expect(await api().post('/additives/create').send(ochre)).to.have.status(401);
    expect(await api().get('/additives/getAll')).to.have.status(401);
  });

  describe('standard additives', () => {
    const standard = { name: 'Standard test ochre', fields: ochre.fields, ownedBy: 'Standard' };

    after(() => Additive.deleteMany({ ownedBy: 'Standard', name: standard.name }));

    it('are shared with anyone, cached briefly, and leave out your own additives', async () => {
      await Additive.create(standard);
      expect(await create({ ...ochre, name: 'Private ochre' })).to.have.status(200);

      const res = await api().get('/additives/getStandard');
      expect(res).to.have.status(200);
      expect(res.headers['cache-control']).to.eql('public, max-age=300');
      const names = (res.body as { name: string }[]).map((a) => a.name);
      expect(names).to.include(standard.name);
      expect(names).to.not.include('Private ochre');
      expect((res.body as { ownedBy: string }[]).every((a) => a.ownedBy === 'Standard')).to.eql(true);
    });
  });
});
