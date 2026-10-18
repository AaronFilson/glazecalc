import text from '../../../../data/advice.ndjson';
import { Advice } from '../../core/models';

/**
 * The standard advice, from the file the database is seeded from
 * (data/advice.ndjson, scripts/seed-standard.js), in the bundle, so the page is
 * rendered with it at build time and needs no request for it. Its words in
 * other languages are in advice/<language>.json (scripts/advice-i18n.mjs).
 */
export const STANDARD_ADVICE: readonly Advice[] = text
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => {
    const record = JSON.parse(line) as Omit<Advice, '_id'> & { _id: string | { $oid: string } };
    const id = typeof record._id === 'string' ? record._id : record._id.$oid;
    return { _id: id, ownedBy: record.ownedBy, title: record.title, content: record.content, tags: record.tags };
  });
