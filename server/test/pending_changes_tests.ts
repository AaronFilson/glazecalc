// Confirm before changes (docs/adr/0025-confirm-before-changes.md): the
// setting on Connected apps, changes from tokens that wait for the person's
// approval on the REST routes (202 and polling) and the MCP write tools (the
// website's link for 2025 clients and those with only a form of their own;
// URL elicitation for 2026 ones), the signed state they carry, and everything
// an app led astray might try: approving its own change, answering yes in its
// own form, reusing an approval, another account's, filling the queue.
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  MOST_WAITING,
  MOST_WAITING_PER_TOKEN,
  approve,
  confirmSettingOf,
  confirmationFor,
  digestOf
} from '../lib/pending_changes.ts';
import { countTokenDelete, countTokenWrite, TOKEN_DELETES_PER_HOUR, TOKEN_WRITE_LIMITS } from '../lib/rate_limit.ts';
import { permissionOf } from '../lib/require_scope.ts';
import { isConfirmGate } from '../lib/rest_changes.ts';
import app from '../app.ts';
import Firing from '../models/firing.ts';
import AccessToken from '../models/access_token.ts';
import Note from '../models/note.ts';
import PendingChange from '../models/pending_change.ts';
import Recipe from '../models/recipe.ts';
import Trash from '../models/trash.ts';
import User, { type UserDocument } from '../models/user.ts';
import {
  approveAt,
  MOST_ROUNDS,
  NOT_WAITING,
  OTHER_CHANGE,
  TOO_MANY_CHANGES,
  TOO_MANY_WAITING_HERE,
  WRITE_TOOLS
} from '../mcp/tools/account_write.ts';
import { requestStateCodec } from '../mcp/request_state.ts';
import { isAppOnlyPage, isPage, isPrivatePage } from '../lib/pages.ts';
import { api, base, expect, makeUser } from './support/app.ts';
import { waitFor } from './support/mail.ts';
import { makeToken } from './support/tokens.ts';

const bearer = (token: string) => 'Bearer ' + token;
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- JSON read in the tests

const setting = (session: string, confirmChanges: unknown) =>
  api().put('/connections/confirm-setting').set('Authorization', bearer(session)).send({ confirmChanges });

const newNote = (as: string, title = 'Glaze test') =>
  api()
    .post('/notes/create')
    .set('Authorization', bearer(as))
    .send({ title, content: 'Glossy at cone 6.', relatedCollection: 'Notes', relatedId: 'general notes' });

let rpcId = 0;
/**
 * A tools/call to /mcp: as a 2025 client sends it, or (with `envelope`) as a
 * 2026-07-28 one, with the client capabilities it declares and any retry fields.
 */
const callTool = async (
  token: string,
  name: string,
  args: object,
  modern?: { capabilities: object; inputResponses?: object; requestState?: string }
): Promise<{ status: number; body: Json }> => {
  const params: Json = { name, arguments: args };
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
      authorization: bearer(token),
      'mcp-protocol-version': modern ? '2026-07-28' : '2025-06-18',
      ...(modern && { 'mcp-method': 'tools/call', 'mcp-name': name })
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params })
  });
  const text = await res.text();
  const data = text.includes('data: ')
    ? text
        .split('\n')
        .find((line) => line.startsWith('data: '))!
        .slice(6)
    : text;
  return { status: res.status, body: JSON.parse(data) as Json };
};
const textOf = (body: Json): string => body.result?.content?.[0]?.text ?? JSON.stringify(body);
const pendingIdIn = (text: string): string => /\/confirm\/([A-Za-z0-9_-]+)/.exec(text)![1]!;

describe('confirm before changes: the page', () => {
  it('is a page of the app in every language, private as a share link is', () => {
    for (const path of ['/confirm/AbC_12-xyzAbC_12-xyz12', '/de/confirm/AbC_12-xyzAbC_12-xyz12']) {
      expect(isPage(path), path).to.equal(true);
      expect(isPrivatePage(path), path).to.equal(true);
      expect(isAppOnlyPage(path), path).to.equal(false);
    }
    for (const path of ['/confirm', '/confirm/', '/confirm/a/b', '/confirm/short', '/confirm/' + 'x'.repeat(23)]) {
      expect(isPage(path), path).to.equal(false);
    }
  });
});

describe('confirm before changes: the setting', () => {
  let mine: Awaited<ReturnType<typeof makeUser>>;
  beforeEach(async () => {
    mine = await makeUser();
  });

  it('is off until chosen, takes the three choices, and only from the web session', async () => {
    const listed = await api().get('/connections').set('Authorization', bearer(mine.token));
    expect(listed.body.confirmChanges).to.equal('off');
    expect(await confirmSettingOf(mine.user._id)).to.equal('off');
    for (const choice of ['removals', 'all', 'off']) {
      const res = await setting(mine.token, choice);
      expect(res, JSON.stringify(res.body)).to.have.status(200);
      expect(res.body.confirmChanges).to.equal(choice);
      expect((await User.findById(mine.user._id).lean())!.confirmChanges).to.equal(choice);
    }
    const bad = await setting(mine.token, 'sometimes');
    expect(bad).to.have.status(400);
    expect(bad.body.code).to.equal('confirm-setting-invalid');
    // No token can change it, not even one that can change records.
    const write = await makeToken(mine.user, { scopes: ['data:write'] });
    expect(await setting(write, 'off')).to.have.status(403);
  });

  it('emails the owner when it asks less, and not when it asks more', async () => {
    await setting(mine.token, 'all');
    await setting(mine.token, 'removals');
    const sent = await waitFor(mine.email, 1);
    expect(sent).to.have.length(1);
    expect(sent[0]!.subject).to.equal('Glazecalc now asks less before apps change your records');
    expect(sent[0]!.text).to.include('ask before removals only');
    expect(sent[0]!.text).to.include('/account/apps');
    await setting(mine.token, 'off');
    expect((await waitFor(mine.email, 2))[1]!.text).to.include('never ask. Changes from apps');
  });

  it('fails closed: an account that cannot be read asks', async () => {
    expect(await confirmSettingOf(new mongoose.Types.ObjectId())).to.equal('all');
    await User.collection.updateOne({ _id: mine.user._id }, { $set: { confirmChanges: 'sometimes' } });
    expect(await confirmSettingOf(mine.user._id)).to.equal('all');
    const token = await makeToken(mine.user, { scopes: ['data:write'] });
    const row = await AccessToken.findOne({ userId: mine.user._id }).lean();
    expect(await confirmationFor(mine.user._id, row!._id, false)).to.equal('all');
    expect(token).to.be.a('string');
  });

  it('shows in get_my_settings, read only', async () => {
    await setting(mine.token, 'removals');
    const token = await makeToken(mine.user, { scopes: ['data:read'] });
    const { body } = await callTool(token, 'get_my_settings', {});
    expect(body.result.structuredContent.confirmChanges).to.equal('removals');
  });
});

describe('confirm before changes: the REST routes', () => {
  let mine: Awaited<ReturnType<typeof makeUser>>;
  let write: string;
  let noteId: string;
  beforeEach(async () => {
    mine = await makeUser();
    write = await makeToken(mine.user, { scopes: ['data:write'] });
    noteId = (await newNote(mine.token)).body._id as string;
  });

  it('works as before while the setting is off', async () => {
    expect(await newNote(write)).to.have.status(200);
    expect(
      await api()
        .delete('/notes/delete/' + noteId)
        .set('Authorization', bearer(write))
    ).to.have.status(200);
    expect(await PendingChange.countDocuments({ userId: mine.user._id })).to.equal(0);
  });

  it('keeps a removal waiting (202), lets the token poll, and makes it once the person approves', async () => {
    await setting(mine.token, 'removals');
    // A change that removes nothing goes through.
    expect(await newNote(write)).to.have.status(200);

    const asked = await api()
      .delete('/notes/delete/' + noteId)
      .set('Authorization', bearer(write));
    expect(asked, JSON.stringify(asked.body)).to.have.status(202);
    expect(asked.body.code).to.equal('confirmation-needed');
    const id = asked.body.pendingId as string;
    expect(id).to.match(/^[A-Za-z0-9_-]{22}$/);
    expect(asked.body.url).to.equal('https://glazecalc.test/confirm/' + id);
    expect(await Note.exists({ _id: noteId })).to.not.equal(null);

    // The token sees it waiting.
    const waiting = await api()
      .get('/pending-changes/' + id)
      .set('Authorization', bearer(write));
    expect(waiting.body).to.include({ status: 'pending', code: 'pending-waiting' });

    // The page, with the session: the server's own words, never the arguments.
    const page = await api()
      .get('/pending-changes/' + id)
      .set('Authorization', bearer(mine.token));
    expect(page).to.have.status(200);
    expect(page.body.summary.msg).to.equal('Move the notebook entry “Glaze test” to the Trash.');
    expect(page.body).to.include({ client: 'Test token', via: 'pat', removal: true, status: 'pending' });
    expect(page.body).to.not.have.property('args');

    const approved = await api()
      .post('/pending-changes/' + id + '/approve')
      .set('Authorization', bearer(mine.token));
    expect(approved, JSON.stringify(approved.body)).to.have.status(200);
    expect(approved.body).to.include({ status: 'done', code: 'pending-made' });
    expect(await Note.exists({ _id: noteId })).to.equal(null);
    const entry = await Trash.findOne({ recordId: noteId }).lean();
    expect(entry).to.include({ by: 'pat' });
    // The arguments are gone once it is decided.
    expect((await PendingChange.findById(id).lean())!.args).to.equal(undefined);

    // The token reads what the route answered, as often as it likes; reading it changes nothing.
    for (let i = 0; i < 2; i++) {
      const done = await api()
        .get('/pending-changes/' + id)
        .set('Authorization', bearer(write));
      expect(done.body.status).to.equal('done');
      expect(done.body.outcome.status).to.equal(200);
      expect(done.body.outcome.body.code).to.equal('record-trashed');
    }
    // So the person's page still says what came of it, not "not found".
    const after = await api()
      .get('/pending-changes/' + id)
      .set('Authorization', bearer(mine.token));
    expect(after).to.have.status(200);
    expect(after.body.status).to.equal('done');
    expect(after.body.result.msg).to.equal('Done: the change was made.');
    expect(after.body.others).to.deep.equal([]);
  });

  it('asks before every change with "all", on records, the Trash and the shelf', async () => {
    await setting(mine.token, 'all');
    const made = await newNote(write, 'New one');
    expect(made).to.have.status(202);
    expect(await Note.countDocuments({ title: 'New one' })).to.equal(0);
    const changed = await api()
      .put('/notes/change/' + noteId)
      .set('Authorization', bearer(write))
      .send({ title: 'Renamed' });
    expect(changed).to.have.status(202);
    expect(await api().post('/shelf/add').set('Authorization', bearer(write)).send({ name: 'Silica' })).to.have.status(
      202
    );
    expect(await api().post('/shelf/undo').set('Authorization', bearer(write))).to.have.status(202);
    // The website is never asked.
    expect(await newNote(mine.token, 'Mine')).to.have.status(200);

    const page = await api()
      .get('/pending-changes/' + changed.body.pendingId)
      .set('Authorization', bearer(mine.token));
    expect(page.body.summary.msg).to.equal('Change the notebook entry “Glaze test”: title.');
    // The fields it sets, as they are now and would be: built for the person's session.
    expect(page.body.changes).to.deep.equal([{ field: 'title', before: 'Glaze test', after: 'Renamed' }]);
    // Every other change waiting from the same token, each in the server's words.
    expect(page.body.others.map((other: Json) => other.summary.msg)).to.deep.equal([
      'Save a new notebook entry “New one”.',
      'Mark as on hand: Silica.',
      'Put the materials on hand back as they were before their last change.'
    ]);
    expect(page.body.others[0].changes).to.deep.include({ field: 'title', after: 'New one' });

    const ok = await api()
      .post('/pending-changes/' + made.body.pendingId + '/approve')
      .set('Authorization', bearer(mine.token));
    expect(ok.body.status).to.equal('done');
    expect(await Note.countDocuments({ title: 'New one', ownedBy: String(mine.user._id) })).to.equal(1);
  });

  it('puts a token exempt when it was made so, with the password', async () => {
    await setting(mine.token, 'all');
    const made = await api()
      .post('/tokens')
      .set('Authorization', bearer(mine.token))
      .send({ name: 'Script', days: 30, scope: 'data:write', noConfirm: true, password: mine.password });
    expect(made, JSON.stringify(made.body)).to.have.status(201);
    expect(made.body.row.noConfirm).to.equal(true);
    expect(await newNote(made.body.token)).to.have.status(200);
    // Only a token that can change records is made exempt.
    const read = await api()
      .post('/tokens')
      .set('Authorization', bearer(mine.token))
      .send({ name: 'Reader', days: 30, noConfirm: true, password: mine.password });
    expect(read.body.row.noConfirm).to.equal(undefined);
    const listed = await api().get('/connections').set('Authorization', bearer(mine.token));
    expect(listed.body.connections.find((row: Json) => row.name === 'Script').noConfirm).to.equal(true);
  });

  it('never lets a token approve, decline or approve all, nor another account see or approve', async () => {
    await setting(mine.token, 'removals');
    const id = (
      await api()
        .delete('/notes/delete/' + noteId)
        .set('Authorization', bearer(write))
    ).body.pendingId as string;
    for (const path of [`/pending-changes/${id}/approve`, `/pending-changes/${id}/decline`]) {
      expect(await api().post(path).set('Authorization', bearer(write))).to.have.status(403);
    }
    const row = await AccessToken.findOne({ userId: mine.user._id }).lean();
    expect(
      await api()
        .post('/pending-changes/approve-all?tokenId=' + String(row!._id))
        .set('Authorization', bearer(write))
    ).to.have.status(403);

    const other = await makeUser();
    expect(
      await api()
        .get('/pending-changes/' + id)
        .set('Authorization', bearer(other.token))
    ).to.have.status(404);
    expect(
      await api()
        .post('/pending-changes/' + id + '/approve')
        .set('Authorization', bearer(other.token))
    ).to.have.status(404);
    // Another token of the same account cannot read it either.
    const second = await makeToken(mine.user, { scopes: ['data:write'] });
    expect(
      await api()
        .get('/pending-changes/' + id)
        .set('Authorization', bearer(second))
    ).to.have.status(404);
    // A page on another site cannot approve it through the person's browser.
    expect(
      await api()
        .post('/pending-changes/' + id + '/approve')
        .set('Authorization', bearer(mine.token))
        .set('Sec-Fetch-Site', 'cross-site')
    ).to.have.status(403);
    expect(await Note.exists({ _id: noteId })).to.not.equal(null);
  });

  it('runs once, however many approve it at the same moment', async () => {
    await setting(mine.token, 'removals');
    const id = (
      await api()
        .delete('/notes/delete/' + noteId)
        .set('Authorization', bearer(write))
    ).body.pendingId as string;
    const answers = await Promise.all([1, 2, 3].map(() => approve(id, mine.user._id)));
    expect(answers.filter(Boolean)).to.have.length(1);
    expect(await Trash.countDocuments({ recordId: noteId })).to.equal(1);
  });

  it('changes nothing when declined, past its time, or when the token was revoked meanwhile', async () => {
    await setting(mine.token, 'removals');
    const ask = async () =>
      (
        await api()
          .delete('/notes/delete/' + noteId)
          .set('Authorization', bearer(write))
      ).body.pendingId as string;

    const declined = await ask();
    expect(
      await api()
        .post('/pending-changes/' + declined + '/decline')
        .set('Authorization', bearer(mine.token))
    ).to.have.status(200);
    expect(
      (
        await api()
          .get('/pending-changes/' + declined)
          .set('Authorization', bearer(write))
      ).body.status
    ).to.equal('declined');

    const late = await ask();
    await PendingChange.updateOne({ _id: late }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(
      await api()
        .post('/pending-changes/' + late + '/approve')
        .set('Authorization', bearer(mine.token))
    ).to.have.status(404);

    const orphan = await ask();
    await AccessToken.updateMany({ userId: mine.user._id }, { $set: { revokedAt: new Date() } });
    const res = await api()
      .post('/pending-changes/' + orphan + '/approve')
      .set('Authorization', bearer(mine.token));
    expect(res.body).to.include({ status: 'failed', code: 'pending-token-gone' });
    expect(await Note.exists({ _id: noteId })).to.not.equal(null);
  });

  it('changes nothing when the record changed after it was asked for (a version conflict)', async () => {
    await setting(mine.token, 'all');
    const asked = await api()
      .put('/notes/change/' + noteId)
      .set('Authorization', bearer(write))
      .send({ title: 'From the app' });
    await api()
      .put('/notes/change/' + noteId)
      .set('Authorization', bearer(mine.token))
      .send({ title: 'Mine' });
    const res = await api()
      .post('/pending-changes/' + asked.body.pendingId + '/approve')
      .set('Authorization', bearer(mine.token));
    expect(res.body).to.include({ status: 'conflict', code: 'pending-conflict' });
    expect((await Note.findById(noteId).lean())!.title).to.equal('Mine');
  });

  it('approves all from one app: only the changes the page showed, never one that came later', async () => {
    await setting(mine.token, 'all');
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) ids.push((await newNote(write, 'Batch ' + i)).body.pendingId as string);
    const page = await api()
      .get('/pending-changes/' + ids[0])
      .set('Authorization', bearer(mine.token));
    const shown = [page.body.id as string, ...page.body.others.map((other: Json) => other.id as string)];
    expect(shown).to.deep.equal(ids);
    // Asked for after the page was opened: not on it, so not approved with it.
    const later = (await newNote(write, 'Sneaked in')).body.pendingId as string;
    const all = await api()
      .post('/pending-changes/approve-all?tokenId=' + String(page.body.tokenId))
      .set('Authorization', bearer(mine.token))
      .send({ ids: shown });
    expect(all.body).to.include({ made: 2, notMade: 0, msg: '2 changes were made.' });
    expect(await Note.countDocuments({ title: /^Batch / })).to.equal(2);
    expect(await Note.countDocuments({ title: 'Sneaked in' })).to.equal(0);
    expect((await PendingChange.findById(later).lean())!.status).to.equal('pending');
    // Without the ids shown, nothing is approved.
    expect(
      await api()
        .post('/pending-changes/approve-all?tokenId=' + String(page.body.tokenId))
        .set('Authorization', bearer(mine.token))
    ).to.have.status(400);
    // Another token's change among the ids is left alone.
    const other = await makeToken(mine.user, { scopes: ['data:write'] });
    const theirs = (await newNote(other, 'From another')).body.pendingId as string;
    const mixed = await api()
      .post('/pending-changes/approve-all?tokenId=' + String(page.body.tokenId))
      .set('Authorization', bearer(mine.token))
      .send({ ids: [later, theirs] });
    expect(mixed.body).to.include({ made: 1, notMade: 0 });
    expect((await PendingChange.findById(theirs).lean())!.status).to.equal('pending');
  });

  it('declines all from one app: the changes the page showed', async () => {
    await setting(mine.token, 'all');
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await newNote(write, 'Unwanted ' + i)).body.pendingId as string);
    const row = await AccessToken.findOne({ userId: mine.user._id }).lean();
    const res = await api()
      .post('/pending-changes/decline-all?tokenId=' + String(row!._id))
      .set('Authorization', bearer(mine.token))
      .send({ ids: ids.slice(0, 2) });
    expect(res.body).to.include({ declined: 2, msg: '2 changes were declined: nothing was changed.' });
    expect(await Note.countDocuments({ title: /^Unwanted / })).to.equal(0);
    expect((await PendingChange.findById(ids[2]).lean())!.status).to.equal('pending');
    // A token cannot.
    expect(
      await api()
        .post('/pending-changes/decline-all?tokenId=' + String(row!._id))
        .set('Authorization', bearer(write))
        .send({ ids })
    ).to.have.status(403);
  });

  it(`lets at most ${MOST_WAITING_PER_TOKEN} wait from one token and ${MOST_WAITING} in all, not counting revoked tokens`, async () => {
    await setting(mine.token, 'all');
    for (let i = 0; i < MOST_WAITING_PER_TOKEN; i++) expect(await newNote(write, 'More ' + i)).to.have.status(202);
    const over = await newNote(write, 'One too many');
    expect(over).to.have.status(429);
    expect(over.body.code).to.equal('pending-too-many-app');
    expect(await PendingChange.countDocuments({ userId: mine.user._id })).to.equal(MOST_WAITING_PER_TOKEN);

    // Other tokens fill the account's queue to MOST_WAITING...
    const others: string[] = [];
    while ((others.length + 1) * MOST_WAITING_PER_TOKEN < MOST_WAITING) {
      others.push(await makeToken(mine.user, { scopes: ['data:write'] }));
    }
    for (const token of others) {
      for (let i = 0; i < MOST_WAITING_PER_TOKEN; i++) expect(await newNote(token, 'Other')).to.have.status(202);
    }
    const last = await makeToken(mine.user, { scopes: ['data:write'] });
    const full = await newNote(last, 'Over the account');
    expect(full).to.have.status(429);
    expect(full.body.code).to.equal('pending-too-many');

    // ...and one revoked or expired no longer counts: its changes stop waiting.
    const row = await AccessToken.findOne({ userId: mine.user._id }).sort({ _id: 1 }).lean();
    await AccessToken.updateOne({ _id: row!._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await newNote(last, 'Room again')).to.have.status(202);
  });

  it('ends the changes a token was waiting on when it is revoked, and the page says why', async () => {
    await setting(mine.token, 'all');
    const id = (await newNote(write, 'Then revoked')).body.pendingId as string;
    const row = await AccessToken.findOne({ userId: mine.user._id }).lean();
    expect(
      await api()
        .delete('/tokens/' + String(row!._id))
        .set('Authorization', bearer(mine.token))
    ).to.have.status(200);
    const change = await PendingChange.findById(id).lean();
    expect(change).to.include({ status: 'failed' });
    expect(change!.args).to.equal(undefined);
    const page = await api()
      .get('/pending-changes/' + id)
      .set('Authorization', bearer(mine.token));
    expect(page.body.status).to.equal('failed');
    expect(page.body.result.code).to.equal('pending-token-gone');
    expect(
      await api()
        .post('/pending-changes/' + id + '/approve')
        .set('Authorization', bearer(mine.token))
    ).to.have.status(404);
    expect(await Note.countDocuments({ title: 'Then revoked' })).to.equal(0);
  });

  it('counts a confirmed removal once against its token’s removals', async () => {
    await setting(mine.token, 'removals');
    const row = await AccessToken.findOne({ userId: mine.user._id }).lean();
    process.env.RATE_LIMITS = 'on';
    try {
      // One removal left this hour.
      for (let i = 1; i < TOKEN_DELETES_PER_HOUR; i++) await countTokenDelete(String(row!._id));
      const asked = await api()
        .delete('/notes/delete/' + noteId)
        .set('Authorization', bearer(write));
      expect(asked).to.have.status(202);
      const res = await api()
        .post('/pending-changes/' + asked.body.pendingId + '/approve')
        .set('Authorization', bearer(mine.token));
      expect(res.body, JSON.stringify(res.body)).to.include({ status: 'done' });
      expect(await Note.exists({ _id: noteId })).to.equal(null);
    } finally {
      process.env.RATE_LIMITS = 'off';
    }
  });

  it('shows, for a removal, what the record was called before this app changed it, and when', async () => {
    // The token renames it while nothing is asked.
    expect(
      await api()
        .put('/notes/change/' + noteId)
        .set('Authorization', bearer(write))
        .send({ title: 'Old tests, delete me' })
    ).to.have.status(200);
    await setting(mine.token, 'removals');
    const asked = await api()
      .delete('/notes/delete/' + noteId)
      .set('Authorization', bearer(write));
    const page = await api()
      .get('/pending-changes/' + asked.body.pendingId)
      .set('Authorization', bearer(mine.token));
    expect(page.body.summary.msg).to.equal('Move the notebook entry “Old tests, delete me” to the Trash.');
    expect(page.body.history).to.deep.equal({ titleBefore: 'Glaze test', minutesAgo: 0 });
    // Another token's removal: this token's changes are not its own.
    const other = await makeToken(mine.user, { scopes: ['data:write'] });
    const second = await api()
      .delete('/notes/delete/' + noteId)
      .set('Authorization', bearer(other));
    const theirs = await api()
      .get('/pending-changes/' + second.body.pendingId)
      .set('Authorization', bearer(mine.token));
    expect(theirs.body.history).to.equal(null);
    // The token that asked is never shown the details.
    const polled = await api()
      .get('/pending-changes/' + asked.body.pendingId)
      .set('Authorization', bearer(write));
    expect(polled.body).to.not.have.property('history');
    expect(polled.body).to.not.have.property('changes');
  });

  it('marks an app that registered itself as self-described', async () => {
    await setting(mine.token, 'all');
    const id = (await newNote(write, 'From an app')).body.pendingId as string;
    const page = async () =>
      (
        await api()
          .get('/pending-changes/' + id)
          .set('Authorization', bearer(mine.token))
      ).body;
    expect((await page()).selfDescribed).to.equal(false);
    await AccessToken.updateOne({ userId: mine.user._id }, { $set: { kind: 'oauth', clientSource: 'dcr' } });
    expect((await page()).selfDescribed).to.equal(true);
    await AccessToken.updateOne({ userId: mine.user._id }, { $set: { clientSource: 'cimd' } });
    expect((await page()).selfDescribed).to.equal(false);
  });

  it('asks before changing a recipe’s firing links, and taking one off is a removal', async () => {
    const recipe = String(
      (
        await Recipe.create({
          title: 'Shino',
          materials: [{ name: 'Silica', amount: '30' }],
          ownedBy: String(mine.user._id)
        })
      )._id
    );
    const firing = String(
      (await Firing.create({ title: 'Cone 6 glaze', fieldsIncluded: [], rows: [[]], ownedBy: String(mine.user._id) }))
        ._id
    );
    await setting(mine.token, 'removals');
    expect(
      await api()
        .post('/recipe/firings/' + recipe)
        .set('Authorization', bearer(write))
        .send({ firing })
    ).to.have.status(200);
    const unlink = await api().delete(`/recipe/firings/${recipe}/${firing}`).set('Authorization', bearer(write));
    expect(unlink).to.have.status(202);
    const page = await api()
      .get('/pending-changes/' + unlink.body.pendingId)
      .set('Authorization', bearer(mine.token));
    expect(page.body.summary.msg).to.equal('Take the firing log “Cone 6 glaze” off the recipe “Shino”.');
    expect(page.body.removal).to.equal(true);
    expect((await Recipe.findById(recipe).lean())!.firings).to.have.length(1);
    const ok = await api()
      .post('/pending-changes/' + unlink.body.pendingId + '/approve')
      .set('Authorization', bearer(mine.token));
    expect(ok.body.status).to.equal('done');
    expect((await Recipe.findById(recipe).lean())!.firings).to.have.length(0);

    await setting(mine.token, 'all');
    const link = await api()
      .post('/recipe/firings/' + recipe)
      .set('Authorization', bearer(write))
      .send({ firing, result: 'Glossy' });
    expect(link).to.have.status(202);
    expect((await Recipe.findById(recipe).lean())!.firings).to.have.length(0);
    await approve(link.body.pendingId as string, mine.user._id);
    const change = await api()
      .put(`/recipe/firings/${recipe}/${firing}`)
      .set('Authorization', bearer(write))
      .send({ result: 'Matte' });
    expect(change).to.have.status(202);
    const changePage = await api()
      .get('/pending-changes/' + change.body.pendingId)
      .set('Authorization', bearer(mine.token));
    expect(changePage.body.changes).to.deep.equal([{ field: 'result', before: 'Glossy', after: 'Matte' }]);
  });
});

/** Every route of the app, with its method, path and handlers in order. */
const routesOf = (): Array<{ method: string; path: string; handlers: unknown[] }> => {
  type Layer = {
    handle: unknown & { stack?: Layer[] };
    matchers?: unknown[];
    regexp?: RegExp;
    route?: { path: string; methods: Record<string, boolean>; stack: Layer[] };
  };
  const found: Array<{ method: string; path: string; handlers: unknown[] }> = [];
  const walk = (stack: Layer[], prefix: string[], before: unknown[]) => {
    const handlers = [...before];
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods)) {
          found.push({
            method,
            path: [...prefix, layer.route.path].join(''),
            handlers: [...handlers, ...layer.route.stack.map((l) => l.handle)]
          });
        }
      } else if (layer.handle.stack) {
        walk(layer.handle.stack, [...prefix, '…'], handlers);
      } else {
        handlers.push(layer.handle);
      }
    }
  };
  walk((app as unknown as { router: { stack: Layer[] } }).router.stack, [], []);
  return found;
};

describe('confirm before changes: every way to change records asks', () => {
  it('has the confirm gate on every route a token may change records through', () => {
    const writing = routesOf().filter((route) =>
      route.handlers.some((handler) => permissionOf(handler)?.endsWith(':write'))
    );
    // The record routes for each kind, the firing links, the Trash's put back and the shelf.
    expect(writing.length).to.be.greaterThan(30);
    const ungated = writing.filter((route) => {
      const scope = route.handlers.findIndex((handler) => permissionOf(handler)?.endsWith(':write'));
      return !route.handlers.slice(scope + 1).some(isConfirmGate);
    });
    expect(ungated.map((route) => route.method + ' ' + route.path)).to.deep.equal([]);
  });

  it('asks before every MCP write tool', async () => {
    const mine = await makeUser();
    const write = await makeToken(mine.user, { scopes: ['data:write'] });
    const owner = String(mine.user._id);
    const recipeId = String(
      (await Recipe.create({ title: 'Celadon', materials: [{ name: 'Silica', amount: '30' }], ownedBy: owner }))._id
    );
    const materialId = String(
      (
        await mongoose.model('Material').create({
          name: 'My frit',
          fields: [{ name: 'SiO2', amount: '60' }],
          percentmole: 'percent',
          loi: 0,
          molecularweight: 60,
          equivalent: 60,
          formulaweight: 60,
          ownedBy: owner
        })
      )._id
    );
    await setting(mine.token, 'all');
    const calls: Record<string, object> = {
      create_recipe: { title: 'New', lines: [{ material: 'Silica', amount: 30 }] },
      update_recipe: { id: recipeId, title: 'Renamed' },
      add_notebook_entry: { content: 'A note' },
      add_my_material: { name: 'Another frit', analysis: { SiO2: 60, Na2O: 10 } },
      update_my_material: { id: materialId, name: 'Renamed frit' },
      add_to_shelf: { materials: ['Silica'] },
      remove_from_shelf: { materials: ['Silica'] },
      undo_shelf_change: {},
      move_to_trash: { kind: 'recipe', id: recipeId }
    };
    // A new write tool must be added here, and so to the gate.
    expect(Object.keys(calls).sort()).to.deep.equal([...WRITE_TOOLS].sort());
    let waiting = 0;
    for (const [tool, args] of Object.entries(calls)) {
      const before = await PendingChange.countDocuments({ userId: mine.user._id });
      const asked = await callTool(write, tool, args);
      expect(textOf(asked.body), tool).to.match(/^Nothing changed yet\. Ask the person to approve it at /);
      expect(await PendingChange.countDocuments({ userId: mine.user._id }), tool).to.equal(before + 1);
      // Room for the next: the queue holds MOST_WAITING_PER_TOKEN from one token.
      if (++waiting === MOST_WAITING_PER_TOKEN) {
        await PendingChange.deleteMany({ userId: mine.user._id });
        waiting = 0;
      }
    }
    expect(await Recipe.findById(recipeId).lean()).to.include({ title: 'Celadon' });
  });
});

describe('confirm before changes: the MCP write tools', () => {
  let mine: Awaited<ReturnType<typeof makeUser>>;
  let write: string;
  let user: UserDocument;
  let recipeId: string;
  beforeEach(async () => {
    mine = await makeUser();
    user = mine.user;
    write = await makeToken(user, { scopes: ['data:write'] });
    recipeId = String(
      (
        await Recipe.create({
          title: 'Celadon',
          materials: [{ name: 'Silica', amount: '30' }],
          ownedBy: String(user._id)
        })
      )._id
    );
  });

  it('works as before while the setting is off, and with "removals" for a change that removes nothing', async () => {
    let made = await callTool(write, 'add_notebook_entry', { content: 'A test' });
    expect(made.body.result.isError).to.not.equal(true);
    await setting(mine.token, 'removals');
    made = await callTool(write, 'add_notebook_entry', { content: 'Another' });
    expect(made.body.result.structuredContent.saved).to.equal(true);
  });

  it('tells a 2025 client to have the person approve it on the website, and makes it when they do', async () => {
    await setting(mine.token, 'removals');
    const asked = await callTool(write, 'move_to_trash', { kind: 'recipe', id: recipeId });
    expect(asked.body.result.isError).to.equal(true);
    const text = textOf(asked.body);
    const id = pendingIdIn(text);
    expect(text).to.equal(approveAt('https://glazecalc.test/confirm/' + id));
    expect(
      text.startsWith('Nothing changed yet. Ask the person to approve it at https://glazecalc.test/confirm/')
    ).to.equal(true);
    expect(await Recipe.exists({ _id: recipeId })).to.not.equal(null);
    const page = await api()
      .get('/pending-changes/' + id)
      .set('Authorization', bearer(mine.token));
    expect(page.body.summary.msg).to.equal('Move the recipe “Celadon” to the Trash.');
    const res = await api()
      .post('/pending-changes/' + id + '/approve')
      .set('Authorization', bearer(mine.token));
    expect(res.body.status).to.equal('done');
    expect(await Recipe.exists({ _id: recipeId })).to.equal(null);
    expect(await Trash.countDocuments({ recordId: recipeId, by: 'pat' })).to.equal(1);
  });

  it('never takes a yes from the client’s own form: only the website approves', async () => {
    await setting(mine.token, 'removals');
    const args = { kind: 'recipe', id: recipeId };
    // A client that offers only a form of its own is given the website's link, as a 2025 one is.
    for (const capabilities of [{ elicitation: { form: {} } }, { elicitation: {} }]) {
      const first = await callTool(write, 'move_to_trash', args, { capabilities });
      expect(first.body.result.resultType).to.not.equal('input_required');
      expect(first.body.result.isError).to.equal(true);
      expect(textOf(first.body)).to.match(/^Nothing changed yet\. Ask the person to approve it at /);
    }
    // Nor does a yes in a form count when it comes back with a state handed out for the website.
    const url = await callTool(write, 'move_to_trash', args, { capabilities: { elicitation: { url: {} } } });
    const yes = { confirm: { action: 'accept', content: { approve: true } } };
    const again = await callTool(write, 'move_to_trash', args, {
      capabilities: { elicitation: { form: {}, url: {} } },
      inputResponses: yes,
      requestState: url.body.result.requestState
    });
    expect(again.body.result.resultType).to.equal('input_required');
    expect(await Recipe.exists({ _id: recipeId })).to.not.equal(null);
    expect(await Trash.countDocuments({ recordId: recipeId })).to.equal(0);
    expect(await PendingChange.countDocuments({ userId: user._id, status: { $ne: 'pending' } })).to.equal(0);
  });

  it('changes nothing when the client says the person would not open the page', async () => {
    await setting(mine.token, 'removals');
    const capabilities = { elicitation: { url: {} } };
    const first = await callTool(write, 'remove_from_shelf', { materials: ['Silica'] }, { capabilities });
    const state = first.body.result.requestState as string;
    const no = await callTool(
      write,
      'remove_from_shelf',
      { materials: ['Silica'] },
      { capabilities, inputResponses: { confirm: { action: 'decline' } }, requestState: state }
    );
    expect(textOf(no.body)).to.equal('Nothing was changed: the person did not approve this change.');
    // Past its time, a retry says it no longer waits.
    const second = await callTool(write, 'remove_from_shelf', { materials: ['Whiting'] }, { capabilities });
    await PendingChange.updateMany({ userId: user._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const late = await callTool(
      write,
      'remove_from_shelf',
      { materials: ['Whiting'] },
      { capabilities, inputResponses: { confirm: { action: 'accept' } }, requestState: second.body.result.requestState }
    );
    expect(textOf(late.body)).to.equal(NOT_WAITING);
  });

  it('reads the setting again on a retry: turned off meanwhile, the change is made as any call would be, once', async () => {
    await setting(mine.token, 'all');
    const capabilities = { elicitation: { url: {} } };
    const args = { content: 'Made once', title: 'Once' };
    const first = await callTool(write, 'add_notebook_entry', args, { capabilities });
    const id = pendingIdIn(first.body.result.inputRequests.confirm.params.url);
    await setting(mine.token, 'off');
    const again = await callTool(write, 'add_notebook_entry', args, {
      capabilities,
      inputResponses: { confirm: { action: 'accept' } },
      requestState: first.body.result.requestState
    });
    expect(again.body.result.structuredContent.saved, textOf(again.body)).to.equal(true);
    // The waiting one is withdrawn, so approving it later makes nothing more.
    expect((await PendingChange.findById(id).lean())!.status).to.equal('declined');
    expect(await approve(id, user._id)).to.equal(null);
    expect(await Note.countDocuments({ title: 'Once' })).to.equal(1);
  });

  it(`refuses a token's ${MOST_WAITING_PER_TOKEN + 1}th waiting change, and counts asks against the limits on changes`, async () => {
    await setting(mine.token, 'all');
    for (let i = 0; i < MOST_WAITING_PER_TOKEN; i++) {
      expect(textOf((await callTool(write, 'add_notebook_entry', { content: 'Ask ' + i })).body)).to.match(
        /^Nothing changed yet/
      );
    }
    expect(textOf((await callTool(write, 'add_notebook_entry', { content: 'More' })).body)).to.equal(
      TOO_MANY_WAITING_HERE
    );
    await PendingChange.deleteMany({ userId: user._id });

    process.env.RATE_LIMITS = 'on';
    try {
      for (let i = 0; i < TOKEN_WRITE_LIMITS.minute; i++) await countTokenWrite(String(user._id));
      const asked = await callTool(write, 'add_notebook_entry', { content: 'Over the limit' });
      expect(textOf(asked.body)).to.equal(TOO_MANY_CHANGES);
      expect(await PendingChange.countDocuments({ userId: user._id })).to.equal(0);
    } finally {
      process.env.RATE_LIMITS = 'off';
    }
  });

  it('shows the person each field an assistant’s change sets, as it is now and would be', async () => {
    await setting(mine.token, 'all');
    const long = 'Wax resist on the foot. '.repeat(40);
    const asked = await callTool(write, 'update_recipe', { id: recipeId, title: 'Celadon blue', notes: long });
    const page = await api()
      .get('/pending-changes/' + pendingIdIn(textOf(asked.body)))
      .set('Authorization', bearer(mine.token));
    expect(page.body.changes).to.deep.equal([
      { field: 'title', before: 'Celadon', after: 'Celadon blue' },
      { field: 'notes', before: '', after: long }
    ]);
  });

  it('sends a 2026 client with URL elicitation to the website for "all", and answers once it is approved', async () => {
    await setting(mine.token, 'all');
    const capabilities = { elicitation: { form: {}, url: {} } };
    const args = { content: 'Crawled at the rim', title: 'Rim test' };
    const first = await callTool(write, 'add_notebook_entry', args, { capabilities });
    const result = first.body.result;
    expect(result.resultType).to.equal('input_required');
    const request = result.inputRequests.confirm;
    expect(request.params.mode).to.equal('url');
    const id = pendingIdIn(request.params.url);
    expect(request.params.url).to.equal('https://glazecalc.test/confirm/' + id);

    // Retried before the person decides: asked again, the next round.
    const opened = { confirm: { action: 'accept' } };
    const early = await callTool(write, 'add_notebook_entry', args, {
      capabilities,
      inputResponses: opened,
      requestState: result.requestState
    });
    expect(early.body.result.resultType).to.equal('input_required');
    expect(await Note.countDocuments({ title: 'Rim test' })).to.equal(0);

    await api()
      .post('/pending-changes/' + id + '/approve')
      .set('Authorization', bearer(mine.token));
    const done = await callTool(write, 'add_notebook_entry', args, {
      capabilities,
      inputResponses: opened,
      requestState: early.body.result.requestState
    });
    expect(done.body.result.structuredContent.saved, textOf(done.body)).to.equal(true);
    expect(await Note.countDocuments({ title: 'Rim test' })).to.equal(1);
  });

  it(`stops asking after ${MOST_ROUNDS} rounds and gives the link`, async () => {
    await setting(mine.token, 'all');
    const capabilities = { elicitation: { url: {} } };
    const args = { content: 'Waiting' };
    let state = (await callTool(write, 'add_notebook_entry', args, { capabilities })).body.result.requestState;
    let last: Json = {};
    for (let i = 0; i < MOST_ROUNDS; i++) {
      last = (
        await callTool(write, 'add_notebook_entry', args, {
          capabilities,
          inputResponses: { confirm: { action: 'accept' } },
          requestState: state
        })
      ).body;
      state = last.result.requestState;
    }
    expect(textOf(last)).to.match(/^Nothing changed yet\. Ask the person to approve it at /);
  });

  it('refuses state that was changed, is another account’s or change’s, or has expired', async () => {
    await setting(mine.token, 'removals');
    const capabilities = { elicitation: { url: {} } };
    const args = { kind: 'recipe', id: recipeId };
    const first = await callTool(write, 'move_to_trash', args, { capabilities });
    const state = first.body.result.requestState as string;
    const yes = { confirm: { action: 'accept' } };

    // Changed by one character: refused before any tool runs.
    const [head, body, mac] = state.split('.');
    // (A middle character: the last one of a base64url MAC can carry only padding bits.)
    const forged = [head, body, mac!.slice(0, 5) + (mac![5] === 'A' ? 'B' : 'A') + mac!.slice(6)].join('.');
    const tampered = await callTool(write, 'move_to_trash', args, {
      capabilities,
      inputResponses: yes,
      requestState: forged
    });
    expect(tampered.body.error.message).to.equal('Invalid or expired requestState');

    // For other arguments (another record): refused.
    const other = String(
      (
        await Recipe.create({
          title: 'Tenmoku',
          materials: [{ name: 'Silica', amount: '1' }],
          ownedBy: String(user._id)
        })
      )._id
    );
    const swapped = await callTool(
      write,
      'move_to_trash',
      { kind: 'recipe', id: other },
      { capabilities, inputResponses: yes, requestState: state }
    );
    expect(textOf(swapped.body)).to.equal(OTHER_CHANGE);

    // Another account's token with this account's state: refused.
    const stranger = await makeUser();
    const theirs = await makeToken(stranger.user, { scopes: ['data:write'] });
    const stolen = await callTool(theirs, 'move_to_trash', args, {
      capabilities,
      inputResponses: yes,
      requestState: state
    });
    expect(textOf(stolen.body)).to.equal(OTHER_CHANGE);
    expect(await Recipe.countDocuments({ _id: { $in: [recipeId, other] } })).to.equal(2);

    // Signed for this very change, but long ago: refused as expired.
    const real = Date.now;
    Date.now = () => real() - 31 * 60 * 1000;
    let old: string;
    try {
      old = await requestStateCodec.mint({
        pendingId: (await PendingChange.findOne({ userId: user._id }).lean())!._id,
        userId: String(user._id),
        tokenId: String((await AccessToken.findOne({ userId: user._id }).lean())!._id),
        tool: 'move_to_trash',
        argsDigest: digestOf('mcp', 'move_to_trash', args),
        round: 1
      });
    } finally {
      Date.now = real;
    }
    const expired = await callTool(write, 'move_to_trash', args, {
      capabilities,
      inputResponses: yes,
      requestState: old
    });
    expect(expired.body.error.message).to.equal('Invalid or expired requestState');
    expect(await Recipe.exists({ _id: recipeId })).to.not.equal(null);
  });

  it('cannot be approved by an assistant holding the token: only the person’s session approves', async () => {
    await setting(mine.token, 'all');
    const asked = await callTool(write, 'create_recipe', {
      title: 'Injected',
      lines: [
        { material: 'Silica', amount: 30 },
        { material: 'Whiting', amount: 20 }
      ]
    });
    const id = pendingIdIn(textOf(asked.body));
    expect(await api().post(`/pending-changes/${id}/approve`).set('Authorization', bearer(write))).to.have.status(403);
    // A state made up for it, without the key, is refused.
    const madeUp =
      'v1.' +
      Buffer.from(JSON.stringify({ p: { pendingId: id }, exp: 9999999999 })).toString('base64url') +
      '.' +
      crypto.randomBytes(32).toString('base64url');
    const forged = await callTool(
      write,
      'create_recipe',
      { title: 'Injected', lines: [{ material: 'Silica', amount: 30 }] },
      {
        capabilities: { elicitation: { form: {} } },
        inputResponses: { confirm: { action: 'accept', content: { approve: true } } },
        requestState: madeUp
      }
    );
    expect(forged.body.error.message).to.equal('Invalid or expired requestState');
    expect(await Recipe.countDocuments({ title: 'Injected' })).to.equal(0);
  });

  it('keeps the record unchanged when it changed while the change waited', async () => {
    await setting(mine.token, 'all');
    const asked = await callTool(write, 'update_recipe', { id: recipeId, title: 'From the assistant' });
    const id = pendingIdIn(textOf(asked.body));
    await Recipe.updateOne({ _id: recipeId }, { $set: { title: 'Changed on the website' } });
    const res = await api()
      .post('/pending-changes/' + id + '/approve')
      .set('Authorization', bearer(mine.token));
    expect(res.body.status).to.equal('conflict');
    expect((await Recipe.findById(recipeId).lean())!.title).to.equal('Changed on the website');
  });
});
