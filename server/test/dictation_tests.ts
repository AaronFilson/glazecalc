// The studio notes skill (docs/adr/0027-dictation-skill.md): the skill's own
// files, its ZIP, the MCP prompt and resource made from them, and the write
// tools it saves with (create_firing_log, add_firing_rows, link_firing, and
// add_notebook_entry's about), with the token's permission and the person's
// approval (docs/adr/0025-confirm-before-changes.md).
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import mongoose from 'mongoose';
import { approve } from '../lib/pending_changes.ts';
import { frontmatterOf, readSkill, SKILL_DIR, SKILL_NAME, SKILL_REFERENCES, SKILL_URI } from '../mcp/dictation.ts';
import { securitySchemes } from '../mcp/server.ts';
import { OTHER_CHANGE, READ_ONLY_TOKEN, WRITE_TOOLS } from '../mcp/tools/account_write.ts';
import { FIRING_ROWS_MOST, SAVE_ONLY_WHAT_WAS_SAID } from '../mcp/tools/dictation_write.ts';
import Activity from '../models/activity.ts';
import Firing from '../models/firing.ts';
import Note from '../models/note.ts';
import PendingChange from '../models/pending_change.ts';
import Recipe, { FIRING_LINKS } from '../models/recipe.ts';
import RecordVersion from '../models/record_version.ts';
import { skillZip } from '../../scripts/build-skills.mjs';
import { api, base, expect, makeUser } from './support/app.ts';
import { makeToken } from './support/tokens.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON read in the tests
type Json = Record<string, any>;

let rpcId = 0;
/** A JSON-RPC request to /mcp, as a 2025 client sends it, or (with `modern`) a 2026-07-28 one. */
const rpc = async (
  method: string,
  params: Json,
  token?: string,
  modern?: { capabilities: object; inputResponses?: object; requestState?: string }
): Promise<Json> => {
  if (modern) {
    params._meta = {
      'io.modelcontextprotocol/protocolVersion': '2026-07-28',
      'io.modelcontextprotocol/clientInfo': { name: 'test', version: '1' },
      'io.modelcontextprotocol/clientCapabilities': modern.capabilities
    };
    if (modern.inputResponses) params.inputResponses = modern.inputResponses;
    if (modern.requestState !== undefined) params.requestState = modern.requestState;
  }
  const res = await fetch(base() + '/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': modern ? '2026-07-28' : '2025-06-18',
      ...(token && { authorization: 'Bearer ' + token }),
      ...(modern && method === 'tools/call' && { 'mcp-method': 'tools/call', 'mcp-name': String(params.name) })
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params })
  });
  const text = await res.text();
  expect(res.status, text).to.equal(200);
  const data = text.includes('data: ')
    ? text
        .split('\n')
        .find((line) => line.startsWith('data: '))!
        .slice(6)
    : text;
  return JSON.parse(data) as Json;
};
const call = async (token: string, name: string, args: object, modern?: Parameters<typeof rpc>[3]) =>
  (await rpc('tools/call', { name, arguments: args }, token, modern)).result as Json;
const textOf = (result: Json): string => result?.content?.[0]?.text ?? JSON.stringify(result);
/** A tool's data; fails the test when it refused. */
const data = async (token: string, name: string, args: object): Promise<Json> => {
  const result = await call(token, name, args);
  expect(result.isError, textOf(result)).to.not.equal(true);
  return result.structuredContent as Json;
};
/** Refused, as a refusal in words or as arguments the schema does not take; the words. */
const refused = async (token: string, name: string, args: object): Promise<string> => {
  const answer = await rpc('tools/call', { name, arguments: args }, token);
  if (answer.error) return String(answer.error.message);
  expect(answer.result.isError, textOf(answer.result)).to.equal(true);
  return textOf(answer.result);
};
const pendingIdIn = (text: string): string => /\/confirm\/([A-Za-z0-9_-]+)/.exec(text)![1]!;
const setting = (session: string, confirmChanges: string) =>
  api()
    .put('/connections/confirm-setting')
    .set('Authorization', 'Bearer ' + session)
    .send({ confirmChanges });

const TODAY = new Date().toISOString().slice(0, 10);
const COLUMNS = ['Time', 'Temperature F', 'Cone'];

describe('the studio notes skill: its files', () => {
  const skill = readSkill();

  it('has the frontmatter the Agent Skills format and Claude’s upload ask for', () => {
    const { frontmatter, metadata } = skill;
    expect(frontmatter.name).to.equal(SKILL_NAME);
    expect(path.basename(SKILL_DIR)).to.equal(frontmatter.name);
    // At most 64 characters, lowercase letters, digits and single hyphens, not at either end.
    expect(frontmatter.name).to.match(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(frontmatter.name!.length).to.be.at.most(64);
    // Claude's custom-skill upload takes at most 200 characters (the open format 1024).
    expect(frontmatter.description!.length).to.be.within(50, 200);
    expect(frontmatter.description).to.include('Glazecalc').and.include('yes');
    expect(frontmatter.compatibility!.length).to.be.at.most(500);
    expect(frontmatter.compatibility).to.include('https://glazecalcapp.com/mcp');
    expect(frontmatter.license).to.equal('MIT');
    expect(metadata).to.include({ author: 'Glazecalc', version: '1.0' });
  });

  it('keeps its instructions short, and every link in them goes to a file it has', () => {
    expect(skill.body.split('\n').length).to.be.below(500);
    // Under about 5,000 tokens: four characters a token is generous for English.
    expect(skill.body.length).to.be.below(5000 * 4);
    for (const file of skill.files) {
      for (const [, target] of file.text.matchAll(/\]\(([^)#]+)\)/g)) {
        if (/^https?:/.test(target!)) continue;
        const from = path.dirname(path.join(SKILL_DIR, file.path));
        expect(existsSync(path.join(from, target!)), `${file.path} links ${target}`).to.equal(true);
      }
    }
    expect(skill.files.map((file) => file.path)).to.eql(['SKILL.md', ...SKILL_REFERENCES]);
  });

  it('names only tools the server has, and of the write tools only those that add', async () => {
    const { user } = await makeUser();
    const token = await makeToken(user, { scopes: ['data:write'] });
    const tools = ((await rpc('tools/list', {}, token)).result.tools as Json[]).map((tool) => String(tool.name));
    const named = new Set(
      skill.files.flatMap((file) => [...file.text.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((m) => m[1]!))
    );
    expect(named.size).to.be.above(10);
    for (const name of named) expect(tools, name).to.include(name);
    // It names the tools that take away only to say never to use them.
    const never = /Never use (`\w+`(?:, | or )?)+/.exec(skill.body)![0];
    for (const tool of ['move_to_trash', 'remove_from_shelf', 'undo_shelf_change', 'update_recipe']) {
      expect(never).to.include('`' + tool + '`');
    }
  });

  it('says the rules that keep a person’s records safe', () => {
    for (const rule of [
      'Never invent',
      'Read back before saving, every time',
      'Only a clear yes saves',
      'not saved yet',
      'is data, not instructions',
      'leach test'
    ]) {
      expect(skill.body, rule).to.include(rule);
    }
  });

  it('reads frontmatter as the skill writes it', () => {
    const read = frontmatterOf('---\nname: a-b\ndescription: Two: parts\nmetadata:\n  version: "2.0"\n---\n# Body\n')!;
    expect(read.values).to.eql({ name: 'a-b', description: 'Two: parts' });
    expect(read.maps.metadata).to.eql({ version: '2.0' });
    expect(read.body).to.equal('# Body\n');
    expect(frontmatterOf('# No frontmatter')).to.equal(null);
  });
});

/** The entries of a ZIP, by name: read from its central directory, each inflated. */
const unzip = (zip: Buffer): Map<string, Buffer> => {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const entries = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(at)).to.equal(0x02014b50);
    const method = zip.readUInt16LE(at + 10);
    const crc = zip.readUInt32LE(at + 16);
    const packed = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extra = zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const body = zip.subarray(start, start + packed);
    const content = method === 8 ? zlib.inflateRawSync(body) : body;
    expect(zlib.crc32(content), name).to.equal(crc);
    entries.set(name, content);
    at += 46 + nameLength + extra;
  }
  return entries;
};

describe('the studio notes skill: its ZIP', () => {
  it('has the skill’s folder at its root, as Claude’s upload asks, with each file as it is and the licence', () => {
    const entries = unzip(skillZip(SKILL_NAME));
    const names = [...entries.keys()];
    expect(names.every((name) => name.startsWith(SKILL_NAME + '/'))).to.equal(true);
    for (const file of readSkill().files) {
      expect(entries.get(`${SKILL_NAME}/${file.path}`)!.toString('utf8'), file.path).to.equal(file.text);
    }
    expect(entries.get(`${SKILL_NAME}/LICENSE`)!.toString('utf8')).to.include('MIT');
    expect(names).to.include(`${SKILL_NAME}/references/`);
    // The same bytes each time, so a build changes it only when the skill changes.
    expect(skillZip(SKILL_NAME).equals(skillZip(SKILL_NAME))).to.equal(true);
  });
});

describe('the studio notes skill over MCP: the prompt and the resource', () => {
  it('lists the prompt dictation with the skill’s instructions, and the person’s notes when given', async () => {
    const prompts = (await rpc('prompts/list', {})).result.prompts as Json[];
    const listed = prompts.find((prompt) => prompt.name === 'dictation')!;
    expect(listed.arguments.map((a: Json) => a.name)).to.have.members(['kind', 'notes', 'language']);
    const plain = (await rpc('prompts/get', { name: 'dictation', arguments: {} })).result;
    const text = plain.messages[0].content.text as string;
    expect(text).to.include(readSkill().body);
    expect(text).to.include('get_my_settings');
    expect(text).to.not.include('Here is what I said');
    // The references come with it.
    expect(plain.messages.slice(1).map((m: Json) => m.content.resource.uri)).to.eql(
      SKILL_REFERENCES.map((file) => `${SKILL_URI}/${file}`)
    );
    const said = 'Floating blue: Custer 40, silica 30, whiting 20, EPK 10.';
    const withNotes = (
      await rpc('prompts/get', { name: 'dictation', arguments: { kind: 'recipe', notes: said, language: 'de' } })
    ).result;
    const asked = withNotes.messages[0].content.text as string;
    expect(asked).to.include('Here is what I said, to sort and read back before saving anything:\n\n' + said);
    expect(asked).to.include('I want to dictate a recipe.').and.include('"de"');
  });

  it('reads the skill’s files as one resource', async () => {
    const listed = (await rpc('resources/list', {})).result.resources as Json[];
    expect(listed.map((r) => r.uri)).to.include(SKILL_URI);
    const read = (await rpc('resources/read', { uri: SKILL_URI })).result.contents[0];
    expect(read.mimeType).to.equal('text/markdown');
    for (const file of readSkill().files) {
      expect(read.text).to.include(`<!-- ${SKILL_NAME}/${file.path} -->`);
      expect(read.text).to.include(file.text.trim());
    }
  });
});

describe('the studio notes skill: the write tools', () => {
  let mine: Awaited<ReturnType<typeof makeUser>>;
  let write: string;
  let ownedBy: string;
  let recipeId: string;
  beforeEach(async () => {
    mine = await makeUser();
    ownedBy = String(mine.user._id);
    write = await makeToken(mine.user, { scopes: ['data:write'] });
    recipeId = String(
      (await Recipe.create({ title: 'Whiting blend 3', materials: [{ name: 'Silica', amount: '30' }], ownedBy }))._id
    );
  });
  const newLog = (title = 'Bisque') =>
    Firing.create({ title, fieldsIncluded: COLUMNS, rows: [['9:00', '1000', '']], ownedBy }).then((f) => String(f._id));

  it('are write tools: listed with what they do, asked to step up for, never removing anything', async () => {
    const tools = (await rpc('tools/list', {}, write)).result.tools as Json[];
    for (const name of ['create_firing_log', 'add_firing_rows', 'link_firing']) {
      expect(WRITE_TOOLS.has(name), name).to.equal(true);
      expect(securitySchemes(name), name).to.eql([{ type: 'oauth2', scopes: ['data:read', 'data:write'] }]);
      const tool = tools.find((t) => t.name === name)!;
      expect(tool.description, name).to.include(SAVE_ONLY_WHAT_WAS_SAID);
      expect(tool.description, name).to.include('Needs an access token that can read and change your records.');
      expect(tool.annotations, name).to.include({ readOnlyHint: false, openWorldHint: false });
      expect(tool._meta.securitySchemes, name).to.eql(securitySchemes(name));
    }
    const hints = Object.fromEntries(tools.map((t) => [t.name, t.annotations.destructiveHint]));
    expect(hints).to.include({ create_firing_log: false, add_firing_rows: true, link_firing: true });
    const init = await rpc('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 't', version: '1' }
    });
    expect(init.result.instructions).to.include('create_firing_log').and.include('the prompt dictation');
  });

  it('refuse a read-only token, changing nothing', async () => {
    const read = await makeToken(mine.user, { scopes: ['data:read'] });
    const firingId = await newLog();
    const calls: Array<[string, object]> = [
      ['create_firing_log', { title: 'Glaze', columns: COLUMNS, rows: [] }],
      ['add_firing_rows', { id: firingId, rows: [['10:00', '1500', '']] }],
      ['link_firing', { recipeId, firingId, result: 'Satin' }],
      ['add_notebook_entry', { content: 'Runs', about: { kind: 'recipe', id: recipeId } }]
    ];
    for (const [name, args] of calls) expect(await refused(read, name, args), name).to.equal(READ_ONLY_TOKEN);
    expect(await Firing.countDocuments({ ownedBy })).to.equal(1);
    expect((await Firing.findById(firingId).lean())!.rows).to.have.length(1);
    expect((await Recipe.findById(recipeId).lean())!.firings ?? []).to.eql([]);
    expect(await Note.countDocuments({ ownedBy })).to.equal(0);
    expect(await Activity.countDocuments({ ownedBy })).to.equal(0);
  });

  it('create_firing_log saves a log as the Firing page saves one', async () => {
    const made = await data(write, 'create_firing_log', {
      title: 'Glaze firing, cone 6',
      kiln: 'Skutt',
      columns: COLUMNS,
      rows: [
        ['9:00', '1000', ''],
        ['11:30', '2000', ''],
        ['15:10', '', '6 down']
      ],
      notes: 'Slow cool from 1900.'
    });
    expect(made).to.include({ title: 'Glaze firing, cone 6', date: TODAY, rows: 3, saved: true });
    const saved = (await Firing.findById(made.id).lean())!;
    expect(saved).to.include({ ownedBy, kiln: 'Skutt', date: TODAY });
    expect(saved.fieldsIncluded).to.eql(COLUMNS);
    expect(saved.rows[2]).to.eql(['15:10', '', '6 down']);
    expect(saved.notes).to.eql(['Slow cool from 1900.']);
    expect(await Activity.findOne({ ownedBy }).lean()).to.include({
      action: 'create',
      fromCollection: 'firing',
      title: 'Glaze firing, cone 6',
      via: 'pat'
    });
    // A day given is kept; it reads as any other log.
    const dated = await data(write, 'create_firing_log', {
      title: 'Bisque',
      date: '2026-10-20',
      columns: ['Time'],
      rows: []
    });
    expect(dated.date).to.equal('2026-10-20');
    expect((await data(write, 'get_firing', { id: made.id })).rows).to.have.length(3);
  });

  it('create_firing_log refuses a column it does not know, one given twice, ragged rows and a day that is not one', async () => {
    const tries: Array<[object, RegExp]> = [
      [{ columns: ['Time', 'Colour'], rows: [] }, /./],
      [{ columns: ['Time', 'Time'], rows: [] }, /The column Time is given twice/],
      [
        { columns: COLUMNS, rows: [['9:00', '1000']] },
        /Row 1 has 2 cells: each row needs one for each of the 3 columns/
      ],
      [{ columns: ['Time'], rows: [], date: '2026-02-30' }, /./],
      [{ columns: ['Time'], rows: Array.from({ length: FIRING_ROWS_MOST + 1 }, () => ['x']) }, /./]
    ];
    for (const [args, text] of tries) {
      expect(await refused(write, 'create_firing_log', { title: 'Bad', ...args }), JSON.stringify(args)).to.match(text);
    }
    expect(await Firing.countDocuments({ ownedBy })).to.equal(0);
  });

  it('create_firing_log keeps within the account’s limit on records', async () => {
    process.env.ACCOUNT_MAX_RECORDS = '1';
    try {
      expect(await refused(write, 'create_firing_log', { title: 'Two', columns: ['Time'], rows: [] })).to.include(
        'An account can keep up to 1 records'
      );
    } finally {
      delete process.env.ACCOUNT_MAX_RECORDS;
    }
  });

  it('add_firing_rows adds to the end of the account’s own log, keeping it as it was', async () => {
    const id = await newLog('Glaze');
    const added = await data(write, 'add_firing_rows', {
      id,
      rows: [
        ['10:00', '1500', ''],
        ['14:40', '2150', '5 bending']
      ]
    });
    expect(added).to.include({ id, title: 'Glaze', added: 2, rows: 3 });
    expect((await Firing.findById(id).lean())!.rows).to.eql([
      ['9:00', '1000', ''],
      ['10:00', '1500', ''],
      ['14:40', '2150', '5 bending']
    ]);
    const versions = await RecordVersion.find({ ownedBy, recordId: id }).lean();
    expect(versions).to.have.length(1);
    expect(versions[0]).to.include({ by: 'pat', fromCollection: 'firing' });
    expect((versions[0]!.record as Json).rows).to.have.length(1);
    expect(await Activity.findOne({ ownedBy, action: 'change' }).lean()).to.include({ fromCollection: 'firing' });

    // Rows in other columns, another account's log, an id that is none, and past the most rows.
    expect(await refused(write, 'add_firing_rows', { id, rows: [['10:00']] })).to.include('Row 1 has 1 cells');
    const other = await makeUser();
    const theirs = String(
      (await Firing.create({ title: 'Theirs', fieldsIncluded: ['Time'], rows: [], ownedBy: String(other.user._id) }))
        ._id
    );
    for (const target of [theirs, 'not-an-id', new mongoose.Types.ObjectId().toString()]) {
      expect(await refused(write, 'add_firing_rows', { id: target, rows: [['1']] }), target).to.include(
        'No firing log with id'
      );
    }
    await Firing.updateOne(
      { _id: id },
      { $set: { rows: Array.from({ length: FIRING_ROWS_MOST - 1 }, () => ['', '', '']) } }
    );
    expect(
      await refused(write, 'add_firing_rows', {
        id,
        rows: [
          ['', '', ''],
          ['', '', '']
        ]
      })
    ).to.include(`at most ${FIRING_ROWS_MOST} rows`);
    expect((await Firing.findById(id).lean())!.rows).to.have.length(FIRING_ROWS_MOST - 1);
    expect((await Firing.findById(theirs).lean())!.rows).to.eql([]);
  });

  it('link_firing links a recipe to a log, as the recipe routes do, then sets the result on the link', async () => {
    const firingId = await newLog('Glaze firing');
    const linked = await data(write, 'link_firing', { recipeId, firingId });
    expect(linked).to.eql({ recipeId, firingId, linked: true, link: { firing: firingId } });
    const result = await data(write, 'link_firing', { recipeId, firingId, result: 'Satin, no crazing.', cone: '6' });
    expect(result).to.eql({
      recipeId,
      firingId,
      linked: false,
      link: { firing: firingId, result: 'Satin, no crazing.', cone: '6' }
    });
    expect((await Recipe.findById(recipeId).lean())!.firings).to.eql([
      { firing: firingId, result: 'Satin, no crazing.', cone: '6' }
    ]);
    // Linked already, with nothing to set: nothing changes.
    expect(await refused(write, 'link_firing', { recipeId, firingId })).to.include('linked to the recipe already');
    // Each change is in the activity log, as the token's.
    expect(
      await Activity.countDocuments({ ownedBy, fromCollection: 'recipes', action: 'change', via: 'pat' })
    ).to.equal(2);

    // The same link as the recipe route makes, for the same log and result.
    const other = String(
      (await Recipe.create({ title: 'Other', materials: [{ name: 'Silica', amount: '1' }], ownedBy }))._id
    );
    await api()
      .post('/recipe/firings/' + other)
      .set('Authorization', 'Bearer ' + mine.token)
      .send({ firing: firingId, result: 'Glossy' });
    const fresh = await newLog('Second');
    await data(write, 'link_firing', { recipeId, firingId: fresh, result: 'Glossy' });
    const [rest, viaMcp] = await Promise.all([Recipe.findById(other).lean(), Recipe.findById(recipeId).lean()]);
    expect(viaMcp!.firings![1]).to.eql({ ...rest!.firings![0], firing: fresh });
  });

  it('link_firing refuses a result too long, a cone that is none, another account’s records, and past the most links', async () => {
    const firingId = await newLog();
    expect(
      await refused(write, 'link_firing', { recipeId, firingId, result: 'x'.repeat(FIRING_LINKS.result + 1) })
    ).to.match(/./);
    expect(await refused(write, 'link_firing', { recipeId, firingId, cone: '99' })).to.include('is not a cone');
    const other = await makeUser();
    const theirRecipe = String(
      (await Recipe.create({ title: 'Theirs', materials: [{}], ownedBy: String(other.user._id) }))._id
    );
    const theirLog = String(
      (await Firing.create({ title: 'Theirs', fieldsIncluded: ['Time'], rows: [], ownedBy: String(other.user._id) }))
        ._id
    );
    expect(await refused(write, 'link_firing', { recipeId: theirRecipe, firingId })).to.include('No recipe with id');
    expect(await refused(write, 'link_firing', { recipeId, firingId: theirLog })).to.include('No firing log with id');
    expect(await refused(write, 'link_firing', { recipeId: 'nope', firingId })).to.include('No recipe with id');
    expect((await Recipe.findById(recipeId).lean())!.firings ?? []).to.eql([]);

    const logs = await Firing.insertMany(
      Array.from({ length: FIRING_LINKS.most }, (_, i) => ({
        title: 'Log ' + i,
        fieldsIncluded: ['Cone'],
        rows: [],
        ownedBy
      }))
    );
    await Recipe.updateOne({ _id: recipeId }, { $set: { firings: logs.map((log) => ({ firing: String(log._id) })) } });
    const full = await refused(write, 'link_firing', { recipeId, firingId, result: 'One more' });
    expect(full).to.include(String(FIRING_LINKS.most)).and.include('Nothing was changed.');
    expect((await Recipe.findById(recipeId).lean())!.firings).to.have.length(FIRING_LINKS.most);
  });

  it('add_notebook_entry with about saves a note about the account’s own record, which list_notes finds', async () => {
    const firingId = await newLog();
    const about = await data(write, 'add_notebook_entry', {
      title: 'Whiting blend 3',
      content: 'Runs on the lower third.',
      about: { kind: 'recipe', id: recipeId }
    });
    expect((await Note.findById(about.id).lean())!).to.include({ relatedCollection: 'recipes', relatedId: recipeId });
    const onLog = await data(write, 'add_notebook_entry', {
      content: 'Element 3 weak',
      about: { kind: 'firing', id: firingId }
    });
    expect((await Note.findById(onLog.id).lean())!).to.include({ relatedCollection: 'firing', relatedId: firingId });
    const found = await data(write, 'list_notes', { about: recipeId });
    expect(found.notes).to.eql([
      {
        id: about.id,
        title: 'Whiting blend 3',
        content: 'Runs on the lower third.',
        about: { kind: 'recipes', id: recipeId }
      }
    ]);
    // Without about, a note of the Notebook page, as before.
    const general = await data(write, 'add_notebook_entry', { content: 'Order more silica' });
    expect((await Note.findById(general.id).lean())!).to.include({
      relatedCollection: 'Notes',
      relatedId: 'general notes'
    });
    // Another account's record, an id that is none, or the wrong kind: refused, nothing saved.
    const other = await makeUser();
    const theirs = String(
      (await Recipe.create({ title: 'Theirs', materials: [{}], ownedBy: String(other.user._id) }))._id
    );
    const tries: Array<[object, string]> = [
      [{ kind: 'recipe', id: theirs }, 'No recipe with id'],
      [{ kind: 'recipe', id: 'not-an-id' }, 'No recipe with id'],
      [{ kind: 'firing', id: recipeId }, 'No firing log with id'],
      [{ kind: 'material', id: recipeId }, 'No material with id']
    ];
    for (const [target, text] of tries) {
      expect(await refused(write, 'add_notebook_entry', { content: 'x', about: target }), text).to.include(text);
    }
    expect(await Note.countDocuments({ ownedBy })).to.equal(3);
  });
});

describe('the studio notes skill: its changes wait for the person’s approval', () => {
  let mine: Awaited<ReturnType<typeof makeUser>>;
  let write: string;
  let ownedBy: string;
  let recipeId: string;
  let firingId: string;
  beforeEach(async () => {
    mine = await makeUser();
    ownedBy = String(mine.user._id);
    write = await makeToken(mine.user, { scopes: ['data:write'] });
    recipeId = String(
      (await Recipe.create({ title: 'Celadon', materials: [{ name: 'Silica', amount: '30' }], ownedBy }))._id
    );
    firingId = String(
      (await Firing.create({ title: 'Glaze firing', fieldsIncluded: ['Time'], rows: [['9:00']], ownedBy }))._id
    );
  });

  /** Asks with setting "all"; the waiting change's page, as the person sees it. */
  const ask = async (tool: string, args: object) => {
    const asked = await call(write, tool, args);
    const text = textOf(asked);
    expect(text, tool).to.match(/^Nothing changed yet\. Ask the person to approve it at /);
    const id = pendingIdIn(text);
    const page = await api()
      .get('/pending-changes/' + id)
      .set('Authorization', 'Bearer ' + mine.token);
    return { id, page: page.body as Json };
  };

  it('each waits with the server’s words and what it sets, and is made once when the person approves', async () => {
    await setting(mine.token, 'all');
    const log = await ask('create_firing_log', {
      title: 'Glaze, cone 6',
      columns: ['Time', 'Cone'],
      rows: [['9:00', '']]
    });
    expect(log.page.summary.msg).to.equal('Save a new firing log “Glaze, cone 6”.');
    expect(log.page.changes.map((c: Json) => c.field)).to.include.members(['title', 'fieldsIncluded', 'rows', 'date']);
    expect(await Firing.countDocuments({ ownedBy })).to.equal(1);

    const rows = await ask('add_firing_rows', { id: firingId, rows: [['10:00']] });
    expect(rows.page.summary.msg).to.equal('Change the firing log “Glaze firing”: rows.');
    const change = rows.page.changes.find((c: Json) => c.field === 'rows');
    expect(change.before).to.include('9:00').and.not.include('10:00');
    expect(change.after).to.include('10:00');

    const link = await ask('link_firing', { recipeId, firingId, result: 'Satin' });
    expect(link.page.summary.msg).to.equal('Link the firing log “Glaze firing” to the recipe “Celadon”.');
    expect(link.page.changes.find((c: Json) => c.field === 'result').after).to.equal('Satin');

    const note = await ask('add_notebook_entry', { content: 'Runs', about: { kind: 'recipe', id: recipeId } });
    expect(note.page.summary.msg).to.equal('Save a new notebook entry.');
    expect(note.page.changes.find((c: Json) => c.field === 'about').after).to.include(recipeId);

    // Nothing was made while they waited.
    expect(await Firing.countDocuments({ ownedBy })).to.equal(1);
    expect((await Firing.findById(firingId).lean())!.rows).to.have.length(1);
    expect((await Recipe.findById(recipeId).lean())!.firings ?? []).to.eql([]);
    expect(await Note.countDocuments({ ownedBy })).to.equal(0);

    for (const { id } of [log, rows, link, note]) {
      expect((await approve(id, mine.user._id))!.status, id).to.equal('done');
      expect(await approve(id, mine.user._id), id).to.equal(null);
    }
    expect(await Firing.countDocuments({ ownedBy, title: 'Glaze, cone 6' })).to.equal(1);
    expect((await Firing.findById(firingId).lean())!.rows).to.eql([['9:00'], ['10:00']]);
    expect((await Recipe.findById(recipeId).lean())!.firings).to.eql([{ firing: firingId, result: 'Satin' }]);
    expect(await Note.countDocuments({ ownedBy, relatedId: recipeId })).to.equal(1);
  });

  it('a change to a link says which fields; a link waits for the recipe as it was', async () => {
    await Recipe.updateOne({ _id: recipeId }, { $set: { firings: [{ firing: firingId, result: 'Glossy' }] } });
    await setting(mine.token, 'all');
    const changed = await ask('link_firing', { recipeId, firingId, result: 'Satin', atmosphere: 'reduction' });
    expect(changed.page.summary.msg).to.equal(
      'Change the firing log “Glaze firing” linked to the recipe “Celadon”: result, atmosphere.'
    );
    const result = changed.page.changes.find((c: Json) => c.field === 'result');
    expect(result).to.include({ before: 'Glossy', after: 'Satin' });
    expect((await approve(changed.id, mine.user._id))!.status).to.equal('done');
    expect((await Recipe.findById(recipeId).lean())!.firings).to.eql([
      { firing: firingId, result: 'Satin', atmosphere: 'reduction' }
    ]);
  });

  it('never takes a retry with other arguments, and lets them through with "removals", none being a removal', async () => {
    await setting(mine.token, 'all');
    const capabilities = { elicitation: { url: {} } };
    const args = { id: firingId, rows: [['10:00']] };
    const first = await call(write, 'add_firing_rows', args, { capabilities });
    expect(first.resultType).to.equal('input_required');
    const other = await call(
      write,
      'add_firing_rows',
      { id: firingId, rows: [['23:59']] },
      {
        capabilities,
        inputResponses: { confirm: { action: 'accept' } },
        requestState: first.requestState
      }
    );
    expect(textOf(other)).to.equal(OTHER_CHANGE);
    expect((await Firing.findById(firingId).lean())!.rows).to.have.length(1);

    await PendingChange.deleteMany({ userId: mine.user._id });
    await setting(mine.token, 'removals');
    expect((await data(write, 'add_firing_rows', args)).added).to.equal(1);
    expect((await data(write, 'link_firing', { recipeId, firingId, result: 'Satin' })).linked).to.equal(true);
    expect((await data(write, 'create_firing_log', { title: 'Now', columns: ['Time'], rows: [] })).saved).to.equal(
      true
    );
    expect(await PendingChange.countDocuments({ userId: mine.user._id })).to.equal(0);
  });

  it('asks nothing for a change the tool refuses anyway', async () => {
    await setting(mine.token, 'all');
    const nobody = new mongoose.Types.ObjectId().toString();
    expect(await refused(write, 'add_firing_rows', { id: nobody, rows: [['1']] })).to.include('No firing log with id');
    expect(await refused(write, 'link_firing', { recipeId: nobody, firingId })).to.include('No recipe with id');
    await Recipe.updateOne({ _id: recipeId }, { $set: { firings: [{ firing: firingId }] } });
    expect(await refused(write, 'link_firing', { recipeId, firingId })).to.include('linked to the recipe already');
    expect(await PendingChange.countDocuments({ userId: mine.user._id })).to.equal(0);
  });
});

describe('the studio notes skill: the download', () => {
  it('is linked from the assistants page, and its English text says how to install it', () => {
    const page = readFileSync(
      path.join(import.meta.dirname, '..', '..', 'client', 'app', 'pages', 'assistants', 'assistants-page.ts'),
      'utf8'
    );
    expect(page).to.include(`'/downloads/${SKILL_NAME}.zip'`);
    const english = JSON.parse(
      readFileSync(path.join(import.meta.dirname, '..', '..', 'client', 'public', 'i18n', 'site', 'en.json'), 'utf8')
    ) as Json;
    expect(english.assistants.dictationClaudeCode).to.include('~/.claude/skills/');
  });
});
