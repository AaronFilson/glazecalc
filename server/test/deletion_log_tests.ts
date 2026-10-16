import mongoose from 'mongoose';
import { api, expect, makeUser, sessionToken } from './support/app.ts';
import * as mail from './support/mail.ts';
import { deleteExpiredTrial, reapplyDeletions } from '../lib/account_data.ts';
import AuthChallenge from '../models/auth_challenge.ts';
import Deletion, { KEEP_DAYS } from '../models/deletion.ts';
import Note from '../models/note.ts';
import PasswordReset from '../models/password_reset.ts';
import PendingSignIn from '../models/pending_sign_in.ts';
import Recipe from '../models/recipe.ts';
import Trash from '../models/trash.ts';
import User from '../models/user.ts';

const DAY = 24 * 60 * 60 * 1000;

// Every account removed is logged by id and time, and nothing else, so that a
// restored backup can be put right: re-applying the log deletes those accounts
// again, the same way.
describe('deletion log', () => {
  const logOf = (id: string | mongoose.Types.ObjectId) => Deletion.find({ userId: id }).lean();

  /** An account with a recipe, a note, a trash record and a reset request. */
  const makeOwner = async () => {
    const owner = await makeUser();
    const id = String(owner.user._id);
    await Recipe.create({ title: 'Shino', materials: [{ name: 'Silica', amount: '30' }], ownedBy: id });
    await Note.create({ content: 'Cone 6', relatedCollection: 'Notes', relatedId: 'general', ownedBy: id });
    await Trash.create({ content: ['old'], date: '1/1/2017', fromCollection: 'notes', ownedBy: id });
    await PasswordReset.create({
      userId: owner.user._id,
      tokenHash: 'hash-' + id,
      expiresAt: new Date(Date.now() + DAY)
    });
    return owner;
  };

  const COLLECTIONS = [User, Recipe, Note, Trash, PasswordReset];
  /** The documents a backup made now would hold for this account. */
  const backupOf = async (id: mongoose.Types.ObjectId) =>
    Promise.all(
      COLLECTIONS.map((Model) =>
        Model.collection.find({ $or: [{ _id: id }, { ownedBy: String(id) }, { userId: id }] }).toArray()
      )
    );
  /** Puts them back, as mongorestore would. */
  const restore = async (backup: Awaited<ReturnType<typeof backupOf>>) => {
    for (const [i, docs] of backup.entries()) if (docs.length) await COLLECTIONS[i]!.collection.insertMany(docs);
  };
  const countsOf = async (id: mongoose.Types.ObjectId) =>
    Promise.all([
      User.countDocuments({ _id: id }),
      Recipe.countDocuments({ ownedBy: String(id) }),
      Note.countDocuments({ ownedBy: String(id) }),
      Trash.countDocuments({ ownedBy: String(id) }),
      PasswordReset.countDocuments({ userId: id })
    ]);

  it('logs your own deletion by id and time, with no email', async () => {
    const owner = await makeOwner();
    const before = Date.now();
    const res = await api()
      .delete('/deleteuser/' + owner.user._id)
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ password: owner.password });
    expect(res).to.have.status(200);
    const [entry, ...more] = await logOf(owner.user._id);
    expect(more).to.eql([]);
    expect(Object.keys(entry!).sort()).to.eql(['_id', 'deletedAt', 'userId']);
    expect(entry!.deletedAt.getTime()).to.be.within(before, Date.now());
    expect(JSON.stringify(entry)).to.not.include(owner.email);
  });

  it("logs an admin's deletion of another account", async () => {
    const admin = await makeUser({ role: 'admin' });
    const owner = await makeOwner();
    const res = await api()
      .delete('/deleteuser/' + owner.user._id)
      .set('Authorization', 'Bearer ' + admin.token)
      .send({ password: admin.password });
    expect(res).to.have.status(200);
    expect(await logOf(owner.user._id)).to.have.length(1);
    expect(await logOf(admin.user._id)).to.have.length(0);
  });

  it('logs nothing when there is no account to delete', async () => {
    const admin = await makeUser({ role: 'admin' });
    const missing = new mongoose.Types.ObjectId();
    const res = await api()
      .delete('/deleteuser/' + missing)
      .set('Authorization', 'Bearer ' + admin.token)
      .send({ password: admin.password });
    expect(res).to.have.status(404);
    expect(await logOf(missing)).to.have.length(0);
  });

  it('logs a trial discarded, or swept once it runs out', async () => {
    const started = await api().post('/guest');
    const token = sessionToken(started);
    const id = (
      await api()
        .get('/verify')
        .set('Authorization', 'Bearer ' + token)
    ).body.id as string;
    await api()
      .delete('/deleteuser/' + id)
      .set('Authorization', 'Bearer ' + token);
    expect(await logOf(id)).to.have.length(1);

    const expired = await User.create({
      email: 'swept-' + Date.now() + '@guest.invalid',
      password: 'x',
      guest: true,
      expiresAt: new Date(Date.now() - DAY)
    });
    expect(await deleteExpiredTrial(expired._id, new Date())).to.eql(true);
    expect(await logOf(expired._id)).to.have.length(1);
  });

  it('keeps entries longer than any backup lives', async () => {
    expect(KEEP_DAYS).to.be.at.least(37);
    const indexes = await Deletion.collection.indexes();
    const ttl = indexes.find((index) => index.key.deletedAt === 1);
    expect(ttl?.expireAfterSeconds).to.eql(KEEP_DAYS * 24 * 60 * 60);
  });

  it('deletes again an account that a restored backup brought back, and only that one', async () => {
    const owner = await makeOwner();
    const other = await makeOwner();
    const backup = await backupOf(owner.user._id);
    expect(await countsOf(owner.user._id)).to.eql([1, 1, 1, 1, 1]);

    const res = await api()
      .delete('/deleteuser/' + owner.user._id)
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ password: owner.password });
    expect(res).to.have.status(200);
    expect(await countsOf(owner.user._id)).to.eql([0, 0, 0, 0, 0]);

    // The backup from before the deletion is restored: everything is back.
    await restore(backup);
    expect(await countsOf(owner.user._id)).to.eql([1, 1, 1, 1, 1]);

    const removed = await reapplyDeletions();
    expect(removed.accounts).to.eql(1);
    expect(removed.records).to.eql(4);
    expect(await countsOf(owner.user._id)).to.eql([0, 0, 0, 0, 0]);
    expect(await countsOf(other.user._id)).to.eql([1, 1, 1, 1, 1]);
    // Re-applying again changes nothing, and adds nothing to the log.
    expect(await reapplyDeletions()).to.eql({ accounts: 0, records: 0 });
    expect(await logOf(owner.user._id)).to.have.length(1);
  });

  it('removes two-step sign-in in progress with the account, in every way it is deleted', async () => {
    const soon = () => new Date(Date.now() + DAY);
    const inProgress = (userId: mongoose.Types.ObjectId) =>
      Promise.all([
        AuthChallenge.create({ userId, kind: 'passkey-confirm', challenge: 'c-' + String(userId), expiresAt: soon() }),
        AuthChallenge.create({ userId, kind: 'totp-add', secret: 'v1.a.b.c', expiresAt: soon() }),
        PendingSignIn.create({ tokenId: 't-' + String(userId), userId, tokenVersion: 0, expiresAt: soon() })
      ]);
    const countOf = async (userId: mongoose.Types.ObjectId) =>
      (await AuthChallenge.countDocuments({ userId })) + (await PendingSignIn.countDocuments({ userId }));

    // Deleted by its owner, then brought back by a backup and deleted again.
    const owner = await makeUser();
    const other = await makeUser();
    await inProgress(owner.user._id);
    await inProgress(other.user._id);
    const backup = await Promise.all(
      [AuthChallenge, PendingSignIn].map((Model) => Model.collection.find({ userId: owner.user._id }).toArray())
    );
    const res = await api()
      .delete('/deleteuser/' + owner.user._id)
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ password: owner.password });
    expect(res).to.have.status(200);
    expect(await countOf(owner.user._id)).to.eql(0);
    await AuthChallenge.collection.insertMany(backup[0]!);
    await PendingSignIn.collection.insertMany(backup[1]!);
    await reapplyDeletions();
    expect(await countOf(owner.user._id)).to.eql(0);
    expect(await countOf(other.user._id)).to.eql(3);

    // A trial swept once it runs out.
    const expired = await User.create({
      email: 'swept-mfa-' + Date.now() + '@guest.invalid',
      password: 'x',
      guest: true,
      expiresAt: new Date(Date.now() - DAY)
    });
    await inProgress(expired._id);
    expect(await deleteExpiredTrial(expired._id, new Date())).to.eql(true);
    expect(await countOf(expired._id)).to.eql(0);
  });

  it('sends a confirmation that says how long backups keep the account', async () => {
    const owner = await makeUser();
    await api()
      .delete('/deleteuser/' + owner.user._id)
      .set('Authorization', 'Bearer ' + owner.token)
      .send({ password: owner.password });
    const [sent] = await mail.waitFor(owner.email, 1);
    expect(sent!.subject).to.equal('Your Glazecalc account was deleted');
    expect(sent!.text).to.include(owner.email);
    expect(sent!.text).to.include('within 30 days');
  });
});
