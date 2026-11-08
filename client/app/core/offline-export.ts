import type { OutboxEntry } from './outbox';

/** The copies of the records, by the name the copy keeps them under (core/offline-records.ts RECORD_COLLECTIONS). */
const RECORDS: Record<string, string> = {
  recipe: 'recipes',
  materials: 'materials',
  additives: 'additives',
  firing: 'firing',
  notes: 'notes'
};

type Body = Record<string, unknown>;
const isBody = (value: unknown): value is Body => !!value && typeof value === 'object' && !Array.isArray(value);

/** A record without the database's own bookkeeping, as GET /api/export writes it (server/lib/export_data.ts). */
const bare = (record: unknown): unknown => {
  if (!isBody(record)) return record;
  const { ownedBy: _owner, __v: _version, ...rest } = record;
  return rest;
};

/**
 * The offline copy of one account as a file in the format of "Download my data" (GET /api/export,
 * server/lib/export_data.ts: format "glazecalc-export"), so the account page's import can read it back into a new
 * account. `copies` are the copy's bodies by their name (recipe, materials, ..., preferences, prices), with the
 * changes still waiting already made to them; `unsent` lists those changes as they wait. Only what this device
 * holds is in it: no sign-in details, versions, activity or share links.
 */
export function deviceExport(
  userId: string,
  copies: Readonly<Record<string, unknown>>,
  unsent: readonly OutboxEntry[],
  now = new Date()
): Body {
  const records: Body = {};
  for (const [name, kind] of Object.entries(RECORDS)) {
    const list = copies[name];
    records[kind] = Array.isArray(list) ? list.map(bare) : [];
  }
  const prefs = copies['preferences'];
  const prices = copies['prices'];
  return {
    format: 'glazecalc-export',
    version: 1,
    exportedAt: now.toISOString(),
    // Made on this device from its offline copy, not by the server.
    source: 'device',
    account: { id: userId },
    preferences: isBody(prefs) ? (isBody(prefs['preferences']) ? prefs['preferences'] : prefs) : {},
    shelf: [],
    prices: isBody(prices) && Array.isArray(prices['prices']) ? prices['prices'] : [],
    records,
    unsent: unsent.map(({ area, op, id, body, queuedAt, state }) => ({
      area,
      op,
      id,
      body,
      queuedAt: new Date(queuedAt).toISOString(),
      state
    }))
  };
}

/** Has the browser save `data` as a JSON file. */
export function saveJson(data: unknown, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Later: some browsers start the download only after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
