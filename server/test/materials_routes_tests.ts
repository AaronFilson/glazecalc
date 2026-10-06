import Material from '../models/material.ts';
import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

// Saving, listing, changing and removing your own materials, and the shared
// standard list.
describe('materials API', () => {
  const porcelain = {
    name: 'porcelain',
    // The second row is blank, as the client can send it.
    fields: [{ name: 'Oxide1', amount: 1, amountUnity: 1 }, {}],
    formulaweight: 255,
    loi: 3,
    equivalent: 284,
    molecularweight: 284,
    percentmole: 'molecular',
    notes: ['fake note id 1', 'fake note id 2'],
    relatedTo: ['china clay', 'kaolin'],
    rawformula: 'Al2O3-2SiO2-2H2O'
  };
  const required: (keyof typeof porcelain)[] = [
    'fields',
    'name',
    'formulaweight',
    'loi',
    'molecularweight',
    'percentmole',
    'equivalent'
  ];
  let user: UserDocument;
  let token: string;
  // send() is typed for objects; for null it sends an empty request.
  const create = (material: object | null = porcelain) =>
    api()
      .post('/materials/create')
      .set('Authorization', 'Bearer ' + token)
      .send(material as object);
  const without = (field: keyof typeof porcelain) => {
    const material: Partial<typeof porcelain> = { ...porcelain };
    delete material[field];
    return material;
  };

  beforeEach(async () => {
    ({ user, token } = await makeUser());
  });

  it('saves a material and answers with it', async () => {
    const res = await create();
    expect(res).to.have.status(200);
    const { fields, notes, relatedTo, ...rest } = porcelain;
    expect(res.body).to.include({ ...rest, ownedBy: user.id });
    expect(res.body.fields).to.eql(fields);
    expect(res.body.notes).to.eql(notes);
    expect(res.body.relatedTo).to.eql(relatedTo);
    expect(res.body._id).to.be.a('string');
  });

  it('lists all of your materials, and finds the newest', async () => {
    for (const name of ['First', 'Second', 'Third', 'Fourth']) {
      expect(await create({ ...porcelain, name })).to.have.status(200);
    }
    const all = await api()
      .get('/materials/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all).to.have.status(200);
    expect((all.body as { name: string }[]).map((m) => m.name)).to.eql(['First', 'Second', 'Third', 'Fourth']);

    const latest = await api()
      .get('/materials/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest).to.have.status(200);
    expect(latest.body.name).to.eql('Fourth');
  });

  it('says when there is no material yet', async () => {
    const res = await api()
      .get('/materials/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(404);
    expect(res.body.msg).to.eql('No material saved yet');
  });

  it('changes a material', async () => {
    const saved = (await create()).body as { _id: string };
    // The client sends back the whole record it was given, _id and ownedBy included.
    const res = await api()
      .put('/materials/change/' + saved._id)
      .set('Authorization', 'Bearer ' + token)
      .send({ ...saved, name: 'kaolin', loi: 14 });
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully updated material');
    const latest = await api()
      .get('/materials/getLatest')
      .set('Authorization', 'Bearer ' + token);
    expect(latest.body).to.include({ _id: saved._id, name: 'kaolin', loi: 14 });
  });

  it('removes a material', async () => {
    const saved = (await create()).body as { _id: string };
    const res = await api()
      .delete('/materials/delete/' + saved._id)
      .set('Authorization', 'Bearer ' + token);
    expect(res).to.have.status(200);
    expect(res.body.msg).to.eql('Successfully deleted material');
    const all = await api()
      .get('/materials/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('answers 400 for an empty or unrelated body, request after request', async () => {
    for (const body of [null, { trashdata: 'not anything good' }]) {
      const res = await create(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql('Missing required information');
    }
  });

  it('answers 400 when any required value is missing', async () => {
    for (const field of required) {
      const res = await create(without(field));
      expect(res, field).to.have.status(400);
      expect(res.body.msg, field).to.eql('Missing required information');
    }
    const all = await api()
      .get('/materials/getAll')
      .set('Authorization', 'Bearer ' + token);
    expect(all.body).to.eql([]);
  });

  it('accepts an LOI of 0, as for silica', async () => {
    const silica = {
      ...porcelain,
      name: 'silica',
      loi: 0,
      fields: [{ name: 'SiO2', amount: 1, amountUnity: 1 }],
      equivalent: 60.08,
      formulaweight: 60.08,
      molecularweight: 60.08
    };
    const res = await create(silica);
    expect(res).to.have.status(200);
    expect(res.body).to.include({ name: 'silica', loi: 0 });
  });

  it('needs a sign-in', async () => {
    expect(await api().post('/materials/create').send(porcelain)).to.have.status(401);
    expect(await api().get('/materials/getAll')).to.have.status(401);
  });

  describe('standard materials', () => {
    const standard = { ...porcelain, name: 'Standard test porcelain', ownedBy: 'Standard' };

    after(() => Material.deleteMany({ ownedBy: 'Standard', name: standard.name }));

    it('are shared with anyone, cached briefly, and leave out your own materials', async () => {
      await Material.create(standard);
      expect(await create({ ...porcelain, name: 'Private porcelain' })).to.have.status(200);

      const res = await api().get('/materials/getStandard');
      expect(res).to.have.status(200);
      expect(res.headers['cache-control']).to.eql('public, max-age=300');
      const names = (res.body as { name: string }[]).map((m) => m.name);
      expect(names).to.include(standard.name);
      expect(names).to.not.include('Private porcelain');
      expect((res.body as { ownedBy: string }[]).every((m) => m.ownedBy === 'Standard')).to.eql(true);
    });
  });
});
