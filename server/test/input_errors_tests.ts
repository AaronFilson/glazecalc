import chemistry from '../../lib/chemistry/index.js';
import type { UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';

const NOT_VALID = 'Some of the information sent is not valid.';

// Mistakes in what a client sends are 400s with a message, not server errors.
describe('requests with values of the wrong type', () => {
  let user: UserDocument;
  let token: string;

  before(async () => {
    ({ user, token } = await makeUser());
  });

  it('answers 400 for an additive whose name is an object', async () => {
    const res = await api()
      .post('/additives/create')
      .set('Authorization', 'Bearer ' + token)
      .send({ name: { a: 1 }, fields: [1] });
    expect(res).to.have.status(400);
    expect(res.body.msg).to.eql(NOT_VALID);
  });

  it('answers 400 for a material whose numbers are words', async () => {
    const res = await api()
      .post('/materials/create')
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: 'Odd',
        fields: [{ SiO2: 1 }],
        formulaweight: 'abc',
        loi: 0,
        molecularweight: 60,
        percentmole: 'mole',
        equivalent: 60
      });
    expect(res).to.have.status(400);
    expect(res.body.msg).to.eql(NOT_VALID);
  });

  it('answers 400 for account settings of the wrong type', async () => {
    for (const body of [{ displayname: { a: 1 } }, { settings: { $gt: 1 } }]) {
      const res = await api()
        .put('/usersettings/' + user._id)
        .set('Authorization', 'Bearer ' + token)
        .send(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql(NOT_VALID);
    }
  });

  it('answers 400 when there is nothing to update', async () => {
    const res = await api()
      .put('/usersettings/' + user._id)
      .set('Authorization', 'Bearer ' + token)
      .send({});
    expect(res).to.have.status(400);
    expect(res.body.msg).to.eql('Nothing to update');
  });
});

describe('material names that match built-in object properties', () => {
  it('reports them as unknown materials', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(() =>
        chemistry.calculateUMF([
          { material: name, amount: 10 },
          { material: 'Whiting', amount: 5 }
        ])
      ).to.throw('Unknown material ' + name);
    }
  });
});
