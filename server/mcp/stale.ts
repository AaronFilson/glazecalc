// What an update tool says when it was given a `rev` the record has moved past
// (server/lib/record_rev.ts): nothing is changed, and the record's rev now is
// named so the assistant can read it again and decide.
import type { RecordModel } from '../lib/guest_limits.ts';
import { revOf } from '../lib/record_rev.ts';
import { ToolProblem } from './common.ts';

/** The refusal for a record found at another revision; `kind` is how the tool names it ('recipe'). */
export const conflictText = (kind: string, current: object): string =>
  `Nothing was changed: this ${kind === 'note' ? 'notebook entry' : kind} was changed somewhere else since you read it ` +
  `(its rev is now ${revOf(current)}, not the one you gave). Read it again and, if the change still fits, repeat it with the new rev.`;

/**
 * After an update that named a `rev` found nothing: throws the conflict when the
 * record is there at another revision, or the "gone" refusal when it is not (the
 * caller throws its own "no such record" for a record that was never there, and
 * it is that one this also throws when the filter simply matched nothing).
 */
export const staleProblem = async (
  Model: RecordModel,
  mine: { _id: unknown; ownedBy: string },
  rev: number,
  kind: string
): Promise<void> => {
  const current = (await Model.findOne(mine).lean()) as { rev?: unknown } | null;
  if (!current) {
    throw new ToolProblem(
      `Nothing was changed: this ${kind} is no longer in your account (it was removed or moved to the Trash).`
    );
  }
  if (revOf(current) !== rev) throw new ToolProblem(conflictText(kind, current));
};
