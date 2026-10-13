import mongoose from 'mongoose';

// The deletion log: the id of each account removed (deleted by its user or an
// admin, a trial discarded, swept or merged into an account) and when. It
// holds no email or anything else about the person. A restored backup still
// has the accounts deleted since it was made; reapplyDeletions
// (lib/account_data.ts) deletes them again from this log, before the app
// serves anyone (server/main.ts, deploy/restore.sh).
//
// The nightly dumps leave this collection out (deploy/backup.sh), so restoring
// one, even with --drop, never replaces the log with an older one.

/**
 * How long an entry is kept, in days: longer than any backup it may have to
 * be re-applied to. Dumps expire after 30 days (deploy/aws/README.md, section
 * 3) and the daily EBS snapshots after 7 (deploy/aws/dlm-policy.json); the
 * week beyond allows for S3 removing expired dumps a day or two late.
 */
export const KEEP_DAYS = 37;

const deletionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    deletedAt: { type: Date, required: true, default: () => new Date() }
  },
  { versionKey: false }
);

// MongoDB removes entries KEEP_DAYS after the deletion.
deletionSchema.index({ deletedAt: 1 }, { expireAfterSeconds: KEEP_DAYS * 24 * 60 * 60 });

export default mongoose.model('Deletion', deletionSchema);
