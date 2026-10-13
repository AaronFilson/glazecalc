// Deletes again every account in the deletion log, with its records: run after
// a backup is restored and before the app starts (deploy/restore.sh). The app
// does the same each time it starts; this says what it did, and fails loudly.
//   node server/reapply_deletions.ts
import mongoose from 'mongoose';
import { reapplyDeletions } from './lib/account_data.ts';
import Deletion from './models/deletion.ts';

await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_app_dev');
try {
  const logged = await Deletion.countDocuments();
  const { accounts, records } = await reapplyDeletions();
  console.log(
    `Deletion log: ${logged} entries. Deleted again: ${accounts} accounts and ${records} records from the backup.`
  );
} finally {
  await mongoose.disconnect();
}
