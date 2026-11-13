import chemistry from '../../lib/chemistry/index.js';
import standardData from '../../data/index.js';
import { RECORD_MOST } from '../lib/record_fields.ts';
import PendingChange from '../models/pending_change.ts';
import Recipe from '../models/recipe.ts';
import User, { type UserDocument } from '../models/user.ts';
import { api, expect, makeUser } from './support/app.ts';
import { makeToken } from './support/tokens.ts';

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
    for (const body of [{ displayname: { a: 1 } }, { displayname: { $gt: '' } }]) {
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

// server/lib/record_fields.ts RECORD_MOST: far past any real record, so that one
// account cannot make the server store, and hold, many times what it sent.
describe('records larger than any real one', () => {
  let token: string;
  let user: UserDocument;
  const create = (path: string, body: object | string, as = token) =>
    api()
      .post(path)
      .set('Authorization', 'Bearer ' + as)
      .set('Content-Type', 'application/json')
      .send(typeof body === 'string' ? body : JSON.stringify(body));
  /** Lists `count` deep inside a recipe's materials list (the record is 1, its materials 2). */
  const nested = (count: number): string => '['.repeat(count) + ']'.repeat(count);
  const refused = (res: Awaited<ReturnType<typeof create>>, limit: string, field: string) => {
    expect(res, JSON.stringify(res.body).slice(0, 200)).to.have.status(400);
    expect(res.body).to.include({ code: 'record-too-large', field });
    expect(res.body.params).to.include({ label: 'recipe', limit });
  };

  before(async () => {
    ({ user, token } = await makeUser());
  });

  it('saves a recipe as large as a real one gets: 30 lines, each a whole copy of a library material', async () => {
    const size = (record: object) => JSON.stringify(record).length;
    const largest = standardData.load<Record<string, unknown>>('materials').sort((a, b) => size(b) - size(a));
    const big = { title: 'Thirty lines', materials: largest.slice(0, 30).map((m) => ({ ...m, amount: '3' })) };
    expect(size(big)).to.be.above(50_000);
    expect(await create('/recipe/create', big)).to.have.status(200);
  });

  it('refuses too many items in a list, or keys in an object, naming the field', async () => {
    const most = RECORD_MOST.items;
    expect(
      await create('/recipe/create', { title: 'x', materials: Array.from({ length: most }, () => ({})) })
    ).to.have.status(200);
    // The reviewer's record: 33,000 empty lines are 100 KB, and 165 bytes gzipped.
    refused(
      await create('/recipe/create', { title: 'x', materials: Array.from({ length: 33000 }, () => ({})) }),
      'items',
      'materials'
    );
    const keys = Object.fromEntries(Array.from({ length: most + 1 }, (_, i) => ['k' + i, 1]));
    refused(await create('/recipe/create', { title: 'x', materials: [keys] }), 'items', 'materials');
    const firing = await create('/firing/create', {
      title: 'Long',
      fieldsIncluded: ['t'],
      rows: Array.from({ length: most + 1 }, () => ['1'])
    });
    expect(firing).to.have.status(400);
    expect(firing.body).to.include({ code: 'record-too-large', field: 'rows' });
  });

  it('refuses a text longer than the limit', async () => {
    refused(
      await create('/recipe/create', { title: 'x'.repeat(RECORD_MOST.chars + 1), materials: [] }),
      'chars',
      'title'
    );
    const note = await create('/notes/create', {
      content: 'x'.repeat(RECORD_MOST.chars + 1),
      relatedCollection: 'Notes',
      relatedId: 'general notes'
    });
    expect(note).to.have.status(400);
    expect(note.body).to.include({ code: 'record-too-large', field: 'content' });
  });

  it('refuses nesting past the limit with 400, however deep, never a server error', async () => {
    const at = (count: number) => `{"title":"deep","materials":[${nested(count)}]}`;
    // The materials list is the second level: 14 more lists inside it reach the limit, 16.
    expect(await create('/recipe/create', at(RECORD_MOST.depth - 2))).to.have.status(200);
    refused(await create('/recipe/create', at(RECORD_MOST.depth - 1)), 'depth', 'materials');
    // Past MongoDB's own 100, and far past.
    for (const count of [200, 5000, 40000]) refused(await create('/recipe/create', at(count)), 'depth', 'materials');
  });

  it('refuses a change the same way, and changes nothing', async () => {
    const made = await create('/recipe/create', { title: 'Kept', materials: [{ name: 'Silica', amount: '10' }] });
    const change = (recipe: string) =>
      api()
        .put('/recipe/change/' + made.body._id)
        .set('Authorization', 'Bearer ' + token)
        .set('Content-Type', 'application/json')
        .send(`{"recipe":${recipe}}`);
    refused(await change(`{"materials":[${nested(5000)}]}`), 'depth', 'materials');
    refused(await change(JSON.stringify({ notes: Array.from({ length: 1001 }, () => 'n') })), 'items', 'notes');
    const stored = await Recipe.findById(made.body._id).lean();
    expect(stored).to.include({ title: 'Kept', rev: 0 });
    expect(stored!.materials).to.eql([{ name: 'Silica', amount: '10' }]);
  });

  it("refuses an access token's change at once, rather than keeping it to be approved", async () => {
    await User.updateOne({ _id: user._id }, { $set: { confirmChanges: 'all' } });
    try {
      const writer = await makeToken(user, { scopes: ['data:write'] });
      const tooMany = { title: 'x', materials: Array.from({ length: RECORD_MOST.items + 1 }, () => ({})) };
      refused(await create('/recipe/create', tooMany, writer), 'items', 'materials');
      expect(await PendingChange.countDocuments({ userId: user._id })).to.equal(0);
      // One within the limits still waits.
      expect(await create('/recipe/create', { title: 'Fine', materials: [] }, writer)).to.have.status(202);
    } finally {
      await User.updateOne({ _id: user._id }, { $unset: { confirmChanges: 1 } });
    }
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
