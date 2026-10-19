// Confirm before changes on the REST routes (docs/adr/0025-confirm-before-changes.md):
// the record routes (server/lib/record_routes.ts), putting a record back from
// the Trash (server/routes/trash_routes.ts) and the shelf
// (server/routes/shelf_routes.ts). Each change such a route makes is an Op,
// registered here by name ('recipes.delete'), which the route runs at once
// and a confirmed change runs later (server/lib/pending_changes.ts), so both
// are the same code.
//
// confirmFirst goes in front of a route's Op, after requireScope: for the web
// session it does nothing; for a token, when the account asks to confirm the
// change (and the token is not exempt), it keeps the change waiting and
// answers
//
//   202 { code: 'confirmation-needed', msg, pendingId, url, expiresAt }
//
// The script then asks GET /api/pending-changes/:id with the same token
// (server/routes/pending_change_routes.ts) until the person has decided: what
// the route would have answered is in its outcome.
import type { NextFunction, Request, Response } from 'express';
import type { UserDocument } from '../models/user.ts';
import { PENDING_MINUTES } from '../models/pending_change.ts';
import { say } from './messages.ts';
import {
  askToConfirm,
  confirmationFor,
  MOST_WAITING,
  registerRunner,
  TooManyWaiting,
  type BaseRef,
  type Summary
} from './pending_changes.ts';
import { countTokenDelete, countTokenWrite } from './rate_limit.ts';
import type { Permission } from './scopes.ts';
import type { Access } from './token_auth.ts';

/** Who a change is made as: the account, and how it got in (a token, or the web session). */
export interface Who {
  user: UserDocument;
  access?: Access;
}

/** What a route was given: its path's values and its body. */
export interface OpInput {
  params: Record<string, string>;
  body: unknown;
}

/** What a route answers. */
export interface Reply {
  status: number;
  body: unknown;
}

export type Op = (who: Who, input: OpInput) => Promise<Reply>;

interface Registered {
  op: Op;
  /** Whether it moves a record to the Trash: counted against its token's removals again when a confirmed one is made. */
  trashes: boolean;
}

const ops = new Map<string, Registered>();

/** Registers a route's change by name, for a confirmed change to run. */
export const registerOp = (name: string, op: Op, { trashes = false }: { trashes?: boolean } = {}): void => {
  ops.set(name, { op, trashes });
};

/** The route's input as a waiting change keeps it. */
export const inputOf = (req: Request): OpInput => ({
  params: { ...(req.params as Record<string, string>) },
  body: req.body ?? null
});

/** Sends what an Op answered. */
export const send = (res: Response, reply: Reply): void => {
  res.status(reply.status).json(reply.body);
};

// A confirmed change from a route: counted against the account's limits on
// changes made with tokens, and a removal against its token's, as requireScope
// and limits.tokenDeletes count them when the route runs at once; then the
// route's own Op, as the token. What it answered is kept as plain JSON.
registerRunner('rest', async (ctx, change) => {
  const registered = ops.get(change.action);
  if (!registered) return { made: false, reply: { code: 'pending-failed' } };
  if (!(await countTokenWrite(String(ctx.user._id)))) {
    return { made: false, reply: { status: 429, body: say('too-many-changes') } };
  }
  if (registered.trashes && !(await countTokenDelete(ctx.tokenId))) {
    return { made: false, reply: { status: 429, body: say('too-many-deletes') } };
  }
  const access: Access = {
    via: ctx.actor.via,
    tokenId: ctx.tokenId,
    name: ctx.actor.name,
    scopes: ctx.scopes,
    permission: change.permission as Permission
  };
  const reply = await registered.op({ user: ctx.user, access }, change.args as OpInput);
  return {
    made: reply.status >= 200 && reply.status < 300,
    reply: { status: reply.status, body: JSON.parse(JSON.stringify(reply.body ?? null)) as unknown }
  };
});

/** What a change is, and the record or shelf it is made to; null when there is nothing to ask about (the route refuses anyway). */
export type Describe = (req: Request, who: Who) => Promise<{ summary: Summary; base?: BaseRef } | null>;

/**
 * In front of a route's change: a token's change waits for the person's
 * approval when the account asks for it, answered 202; anything else goes on.
 */
export const confirmFirst =
  (name: string, { removal, describe }: { removal: boolean; describe: Describe }) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const access = req.access;
    const user = req.user;
    if (!access || access.via === 'session' || !user) return next();
    const setting = await confirmationFor(user._id, access.tokenId, removal);
    if (!setting) return next();
    const described = await describe(req, { user, access });
    if (!described) return next();
    try {
      const waiting = await askToConfirm({
        userId: String(user._id),
        tokenId: access.tokenId,
        via: access.via,
        client: access.name,
        source: 'rest',
        action: name,
        permission: access.permission,
        removal,
        args: inputOf(req),
        summary: described.summary,
        base: described.base ?? null
      });
      res.status(202).json({
        ...say('confirmation-needed', { minutes: PENDING_MINUTES }),
        pendingId: waiting.id,
        url: waiting.url,
        expiresAt: waiting.expiresAt
      });
    } catch (err) {
      if (!(err instanceof TooManyWaiting)) throw err;
      res.status(429).json(say('pending-too-many', { most: MOST_WAITING }));
    }
  };

/** A summary's values for a kind of record and its title ('' for none). */
export const named = (kind: string, title: string | undefined) => ({
  kind,
  title: title ?? '',
  named: title ? 'yes' : 'no'
});
