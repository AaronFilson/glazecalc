import mongoose from 'mongoose';
import { expect } from 'chai';
import { summary, usage } from '../../scripts/usage-stats.mjs';

// Usage at a glance (scripts/usage-stats.mjs): totals for the README, and nothing about a person.
const DAY = 24 * 60 * 60 * 1000;

describe('usage at a glance (scripts/usage-stats.mjs)', () => {
  it('counts accounts, trials, what they keep and the apps connected, leaving out the standard records', async () => {
    const db = mongoose.connection.db!;
    const now = new Date();
    const longAgo = (days: number) =>
      mongoose.Types.ObjectId.createFromTime(Math.floor((now.getTime() - days * DAY) / 1000));
    const later = new Date(now.getTime() + 30 * DAY);
    const earlier = new Date(now.getTime() - DAY);
    const grant = (clientId: string) => ({
      kind: 'Grant',
      payload: JSON.stringify({ clientId, accountId: 'someone' })
    });

    await db.collection('users').insertMany([
      { _id: longAgo(90), email: 'potter@example.com', region: 'US', language: 'en' },
      { email: 'another@example.com', region: 'DE', language: 'de' },
      { email: 'unset@example.com', region: '', language: 'en' },
      { email: 'speckled-quiet-kilns@glazecalc.invalid', guest: true, region: 'JP', language: 'ja' }
    ]);
    await db
      .collection('recipes')
      .insertMany([{ _id: longAgo(60), ownedBy: 'u1' }, { ownedBy: 'u2' }, { ownedBy: 'Standard' }]);
    await db.collection('materials').insertMany([{ ownedBy: 'u1' }, { ownedBy: 'Standard' }]);
    await db.collection('additives').insertMany([{ ownedBy: 'u2' }, { ownedBy: 'Standard' }]);
    await db.collection('firings').insertOne({ ownedBy: 'u1' });
    await db.collection('notes').insertMany([{ ownedBy: 'u1' }, { ownedBy: 'u2' }]);
    await db.collection('sharelinks').insertOne({ ownedBy: 'u1' });
    await db.collection('accesstokens').insertMany([
      { userId: 'u1', expiresAt: later, revokedAt: null },
      { userId: 'u1', expiresAt: later, revokedAt: earlier },
      { userId: 'u2', expiresAt: earlier, revokedAt: null }
    ]);
    await db
      .collection('oauth_records')
      .insertMany([
        grant('claude'),
        grant('claude'),
        grant('chatgpt'),
        { kind: 'Grant', payload: 'not json' },
        { kind: 'Client', payload: JSON.stringify({ client_id: 'cursor' }) }
      ]);
    await db.collection('activities').insertMany([{ at: earlier }, { at: new Date(now.getTime() - 45 * DAY) }]);

    const totals = await usage(db, now);
    expect(totals).to.deep.include({
      accounts: 3,
      accountsNewThisMonth: 2,
      trialsNow: 1,
      countries: 2,
      languages: 2,
      recipes: 2,
      recipesNewThisMonth: 1,
      ownMaterials: 1,
      ownAdditives: 1,
      firingLogs: 1,
      notes: 2,
      shareLinks: 1,
      accessTokensActive: 1,
      oauthGrants: 4,
      connectedApps: 2,
      appChangesThisMonth: 1
    });

    const text = summary(totals);
    expect(text).to.include('3 accounts (2 new in the last 30 days) and 1 trials now');
    expect(text).to.include('2 AI apps connected through 4 grants');
    // Counts only: no address or name of anyone.
    expect(text + JSON.stringify(totals)).not.to.match(/@|potter|speckled/);
  });
});
