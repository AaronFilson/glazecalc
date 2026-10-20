// The state a write tool hands an assistant's client while the person is asked
// to confirm a change (MCP 2026-07-28 multi-round-trip requests; docs/adr/0025).
// The client sends it back unchanged with its retry, so it is signed: HMAC-SHA256
// with a key made from the app's secret for this use alone, through the SDK's
// codec, which also puts in when it expires. server.ts gives its verify to the
// SDK, which refuses any state that fails it before a tool runs ("Invalid or
// expired requestState"); the tool then checks that the state is for this
// account, this token, this tool and these exact arguments
// (tools/account_write.ts). It is signed, not secret: it names only the
// waiting change and who asked. It says nothing about whether the change
// needs approving or how: a retry reads the setting again, and only the
// person's approval on the website makes the change.
import crypto from 'node:crypto';
import { createRequestStateCodec } from '@modelcontextprotocol/server';
import appSecret from '../lib/app_secret.ts';
import { PENDING_MINUTES } from '../models/pending_change.ts';

/** What the state holds. */
export interface ConfirmState {
  /** The waiting change (models/pending_change.ts). */
  pendingId: string;
  userId: string;
  tokenId: string;
  tool: string;
  /** pending_changes.ts digestOf the tool and its arguments. */
  argsDigest: string;
  /** Which round of asking this is: the client retries until the change is decided, or MAX_ROUNDS. */
  round: number;
}

/** The key: the app's secret, made into one for signing this state only. */
const key = crypto.createHmac('sha256', appSecret).update('glazecalc mcp requestState v1').digest();

export const requestStateCodec = createRequestStateCodec<ConfirmState>({ key, ttlSeconds: PENDING_MINUTES * 60 });

/** Whether a decoded state has every field, of the right type. */
export const isConfirmState = (value: unknown): value is ConfirmState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  return (
    ['pendingId', 'userId', 'tokenId', 'tool', 'argsDigest'].every((name) => typeof state[name] === 'string') &&
    typeof state.round === 'number'
  );
};
