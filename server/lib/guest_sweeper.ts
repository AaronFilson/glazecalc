// Removes trial ("guest") accounts once they expire, with everything saved in
// them. It runs inside the server process (there is one): at start, then hourly.
import User from '../models/user.ts';
import { deleteAccount } from './account_data.ts';
import * as log from './log.ts';

const HOUR = 60 * 60 * 1000;
// Per run; any more wait for the next run.
const BATCH = 500;

/** Deletes trials that expired by `now`; resolves with how many. */
export const sweepExpiredGuests = async (now = new Date()): Promise<number> => {
  const expired = await User.find({ guest: true, expiresAt: { $lte: now } })
    .select('_id')
    .limit(BATCH)
    .lean();
  for (const { _id } of expired) await deleteAccount(_id);
  return expired.length;
};

/** Sweeps now and every `every` ms (an hour); the timer does not keep the process alive. */
export const start = (
  every = HOUR,
  sweep: () => Promise<number> = () => sweepExpiredGuests()
): ReturnType<typeof setInterval> => {
  const run = () =>
    sweep().then(
      (count) => count && log.info('Removed expired trials', { count }),
      (err: unknown) => log.error('Could not remove expired trials', { err })
    );
  void run();
  return setInterval(run, every).unref();
};
