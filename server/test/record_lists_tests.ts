// An account's records of a kind (GET /api/<kind>/getAll) and its export are
// read lean and written a record at a time (server/lib/stream_json.ts): the
// same JSON as before, but the server never holds the whole list at once.
import http from 'node:http';
import standardData from '../../data/index.js';
import type { RecordModel } from '../lib/guest_limits.ts';
import Additive from '../models/additive.ts';
import Advice from '../models/advice.ts';
import Firing from '../models/firing.ts';
import Material from '../models/material.ts';
import Note from '../models/note.ts';
import Recipe from '../models/recipe.ts';
import { api, base, expect, makeUser } from './support/app.ts';

type TestUser = Awaited<ReturnType<typeof makeUser>>;
type Row = Record<string, unknown>;

const get = (path: string, token: string) =>
  api()
    .get(path)
    .set('Authorization', 'Bearer ' + token)
    .buffer(true);

/** A recipe as large as a real one gets: 12 lines, each a whole copy of one of the largest library materials. */
const largeRecipe = (title: string): Row => {
  const size = (record: object) => JSON.stringify(record).length;
  const largest = standardData.load<Row>('materials').sort((a, b) => size(b) - size(a));
  return { title, materials: largest.slice(0, 12).map((m) => ({ ...m, amount: '8' })), notes: ['A note'] };
};

const saveMany = async (who: TestUser, count: number): Promise<void> => {
  for (let i = 0; i < count; i++) {
    const res = await api()
      .post('/recipe/create')
      .set('Authorization', 'Bearer ' + who.token)
      .send(largeRecipe('Large ' + i));
    expect(res).to.have.status(200);
  }
};

describe('lists written a record at a time', () => {
  let alice: TestUser;

  beforeEach(async () => {
    alice = await makeUser();
  });

  it('sends getAll as the documents wrote it, for every kind: defaults first, empty objects left out', async () => {
    const ownedBy = String(alice.user._id);
    // As stored by older versions, and by hand: fields missing, in another order, empty objects.
    const stored: Array<[string, RecordModel, Row[]]> = [
      [
        'recipe',
        Recipe,
        [
          { title: 'Bare', materials: [], ownedBy },
          {
            ownedBy,
            materials: [{ name: 'Silica', amount: '1', source: {} }, {}],
            title: 'Out of order',
            computed: [{ uList: {} }],
            firedAt: {},
            firings: [{ result: 'Glossy', firing: '6a0000000000000000000001', cone: '6' }],
            notes: ['x'],
            rev: 3,
            __v: 0
          }
        ]
      ],
      [
        'materials',
        Material,
        [
          {
            name: 'Plain',
            ownedBy,
            fields: [],
            equivalent: 1,
            formulaweight: 1,
            loi: 0,
            molecularweight: 1,
            percentmole: 'x'
          },
          { name: 'Odd', ownedBy, source: {}, aliases: null, fields: [{ name: 'CaO', amount: 1 }] }
        ]
      ],
      ['additives', Additive, [{ name: 'Stain', ownedBy, fields: [] }]],
      ['advice', Advice, [{ title: 'Tip', content: 'Sieve twice', ownedBy }]],
      ['notes', Note, [{ content: 'Crawled', ownedBy, relatedCollection: 'Notes', relatedId: 'general notes' }]],
      [
        'firing',
        Firing,
        [
          { title: 'Empty', ownedBy },
          { title: 'Rows', ownedBy, rows: [['9:00', '600']], fieldsIncluded: ['Time', 'Temperature'] }
        ]
      ]
    ];
    for (const [path, Model, docs] of stored) {
      await Model.collection.insertMany(docs.map((doc) => ({ ...doc })));
      if (path === 'recipe') {
        const made = await api()
          .post('/recipe/create')
          .set('Authorization', 'Bearer ' + alice.token)
          .send(largeRecipe('Saved here'));
        expect(made).to.have.status(200);
      }
      const res = await get('/' + path + '/getAll', alice.token);
      expect(res, path).to.have.status(200);
      expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
      expect(res.text, path).to.equal(JSON.stringify(await Model.find({ ownedBy }).sort({ _id: 1 })));
    }
  });

  it('sends a short list whole, and a long one in pieces as it is read', async () => {
    const one = await get('/recipe/getAll', alice.token);
    expect(one.text).to.equal('[]');
    expect(one.headers['content-length']).to.equal('2');
    await saveMany(alice, 40);
    const many = await get('/recipe/getAll', alice.token);
    expect(many).to.have.status(200);
    expect(many.headers['transfer-encoding']).to.equal('chunked');
    expect(many.headers['content-length']).to.equal(undefined);
    expect(many.text.length).to.be.above(500_000);
    expect(many.text).to.equal(JSON.stringify(await Recipe.find({ ownedBy: String(alice.user._id) }).sort({ _id: 1 })));
  });

  it('lets go of a list when the browser goes away, and answers the next request', async () => {
    await saveMany(alice, 40);
    const cut = await new Promise<number>((resolve, reject) => {
      const req = http.get(
        base() + '/api/recipe/getAll',
        { headers: { Authorization: 'Bearer ' + alice.token } },
        (res) => {
          res.once('data', () => {
            req.destroy();
            resolve(res.statusCode ?? 0);
          });
        }
      );
      req.on('error', (err) => ((err as { code?: string }).code === 'ECONNRESET' ? undefined : reject(err)));
    });
    expect(cut).to.equal(200);
    const again = await get('/recipe/getAll', alice.token);
    expect(again).to.have.status(200);
    expect(JSON.parse(again.text)).to.have.length(40);
  });

  it('writes the export without indenting, in pieces for a large account, and whole', async () => {
    await saveMany(alice, 40);
    const res = await get('/export', alice.token);
    expect(res).to.have.status(200);
    expect(res.headers['transfer-encoding']).to.equal('chunked');
    expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
    // Indenting, as before, made it larger by the spaces before every line of every record.
    expect(res.text).to.not.include('\n');
    const data = JSON.parse(res.text) as Row & { records: Record<string, Row[]> };
    expect(Object.keys(data)).to.eql([
      'format',
      'version',
      'exportedAt',
      'account',
      'preferences',
      'shelf',
      'prices',
      'signIn',
      'records',
      'versions',
      'activity',
      'accessTokens',
      'shareLinks'
    ]);
    expect(Object.keys(data.records)).to.eql([
      'additives',
      'advice',
      'firing',
      'materials',
      'notes',
      'recipes',
      'trash'
    ]);
    expect(data.records.recipes!.map((r) => r.title)).to.eql(Array.from({ length: 40 }, (_, i) => 'Large ' + i));
    // The spreadsheets too: a header, then a row for each of 12 lines in each of 40 recipes.
    const csv = await get('/export/recipes.csv', alice.token);
    expect(csv.text.trimEnd().split('\r\n')).to.have.length(1 + 40 * 12);
  });
});
