// A change or delete that came with an Idempotency-Key is made once: a repeat of the key (the offline outbox
// sends again when an answer was lost) gets the first answer back (server/models/idempotency.ts).
import Idempotency from '../models/idempotency.ts';
import type { Op } from './rest_changes.ts';

/** The Op, answering a repeated key with what it answered the first time. */
export const idempotent =
  (op: Op): Op =>
  async (who, input) => {
    const key = input.idemKey;
    if (!key) return op(who, input);
    const ownedBy = String(who.user._id);
    const earlier = await Idempotency.findOne({ ownedBy, key }).lean();
    if (earlier) return { status: earlier.status, body: earlier.body as unknown };
    const reply = await op(who, input);
    // Only answers that are final: a server error is tried again.
    if (reply.status < 500) {
      try {
        await Idempotency.create({
          ownedBy,
          key,
          status: reply.status,
          body: JSON.parse(JSON.stringify(reply.body ?? null)) as unknown
        });
      } catch (err) {
        // The same key came in twice at once and the other was kept first: its answer stands.
        if ((err as { code?: number }).code !== 11000) throw err;
      }
    }
    return reply;
  };
