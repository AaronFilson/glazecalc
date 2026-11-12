// Usage at a glance, as totals only: how many accounts and trials there are, what they keep, the
// share links and the apps connected to them, and in how many countries and languages. Nothing about
// a person leaves the database: every figure is a count, and the countries and languages are counted,
// not listed. For the README and the case study.
//
//   node scripts/usage-stats.mjs                          against MONGODB_URI (or the local database)
//   docker compose exec app node scripts/usage-stats.mjs  on the live instance; the image has this script
//
// Calls to the MCP endpoint are not in the database (it keeps no sessions). On the instance, nginx's
// access log has them, for as many days as logrotate keeps:
//   sudo zgrep -c '"POST /mcp' /var/log/nginx/access.log*
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

const DAY = 24 * 60 * 60 * 1000;

/** An ObjectId made at a moment: every _id made after it sorts after it. */
const idAt = (date) => mongoose.Types.ObjectId.createFromTime(Math.floor(date.getTime() / 1000));

/** The totals, from a connected database. */
export async function usage(db, now = new Date()) {
  const monthAgo = new Date(now.getTime() - 30 * DAY);
  const count = (name, filter = {}) => db.collection(name).countDocuments(filter);
  const own = { ownedBy: { $ne: 'Standard' } };
  const accounts = { guest: { $ne: true } };
  const distinct = async (field) =>
    (await db.collection('users').distinct(field, { ...accounts, [field]: { $nin: ['', null] } })).length;

  const grants = await db
    .collection('oauth_records')
    .find({ kind: 'Grant' }, { projection: { payload: 1 } })
    .toArray();
  const apps = new Set();
  for (const grant of grants) {
    try {
      const clientId = JSON.parse(grant.payload).clientId;
      if (clientId) apps.add(clientId);
    } catch {
      // A payload that does not parse names no app.
    }
  }

  return {
    at: now.toISOString(),
    accounts: await count('users', accounts),
    accountsNewThisMonth: await count('users', { ...accounts, _id: { $gte: idAt(monthAgo) } }),
    trialsNow: await count('users', { guest: true }),
    countries: await distinct('region'),
    languages: await distinct('language'),
    recipes: await count('recipes', own),
    recipesNewThisMonth: await count('recipes', { ...own, _id: { $gte: idAt(monthAgo) } }),
    ownMaterials: await count('materials', own),
    ownAdditives: await count('additives', own),
    firingLogs: await count('firings', own),
    notes: await count('notes', own),
    shareLinks: await count('sharelinks'),
    accessTokensActive: await count('accesstokens', { revokedAt: null, expiresAt: { $gt: now } }),
    oauthGrants: grants.length,
    connectedApps: apps.size,
    appChangesThisMonth: await count('activities', { at: { $gte: monthAgo } })
  };
}

/** The totals as a few lines a person can read or paste. */
export function summary(u) {
  return [
    `${u.accounts} accounts (${u.accountsNewThisMonth} new in the last 30 days) and ${u.trialsNow} trials now,`,
    `in ${u.countries} countries and ${u.languages} languages;`,
    `${u.recipes} recipes saved (${u.recipesNewThisMonth} this month), ${u.ownMaterials} materials and ` +
      `${u.ownAdditives} colorants of their own, ${u.firingLogs} firing logs and ${u.notes} notes;`,
    `${u.shareLinks} recipes shared by link; ${u.connectedApps} AI apps connected through ${u.oauthGrants} grants, ` +
      `${u.accessTokensActive} access tokens in use, and ${u.appChangesThisMonth} changes made by apps this month.`
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/glazecalc', {
    serverSelectionTimeoutMS: 10000
  });
  try {
    const u = await usage(mongoose.connection.db);
    console.log(JSON.stringify(u, null, 2));
    console.log('\n' + summary(u));
  } finally {
    await mongoose.disconnect();
  }
}
