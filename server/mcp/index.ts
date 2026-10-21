// POST /mcp: Glazecalc's tools for AI assistants over MCP's Streamable HTTP
// transport (docs/adr/0017-mcp-server.md; docs/integrations-plan.md, Phases 2
// and 3). Stateless: every request is answered by a fresh server from
// server.ts, through the SDK's createMcpHandler, which serves the 2026-07-28
// revision and, for older clients, the 2025 ones. No sessions, so GET and
// DELETE (and anything else but POST) are 405.
//
// In front of the SDK, in order: the Host and Origin checks (DNS rebinding;
// no CORS, so a web page on another site cannot read an answer either), the
// limit on access tokens that do not work, who is calling (auth.ts), the
// request limits, and a JSON body of at most 256 kB. No reply sets a cookie,
// and the request's cookies and Authorization header never reach the SDK.
import express, { type NextFunction, type Request, type Response } from 'express';
import { createMcpHandler, InMemoryServerEventBus } from '@modelcontextprotocol/server';
import * as log from '../lib/log.ts';
import * as limits from '../lib/rate_limit.ts';
import * as site from '../lib/site.ts';
import { mcpAuth, refuseToken, resourceMetadata, rpcError, signIn, stepUp } from './auth.ts';
import { makeServer } from './server.ts';

/** Access tokens that do not work, per address: over the limit still 401 with the challenge, never 429 (rate_limit.ts). */
const badTokens = limits.badTokenLimit((_req, res) => refuseToken(res));

/** The largest request body taken: far more than 40 recipe lines need. */
export const MOST_BODY = '256kb';

// The SDK's change-event bus, made here so the tests can see that a stream whose client went has ended.
const bus = new InMemoryServerEventBus();
/** How many subscription streams the SDK is serving now (the tests). */
export const sdkSubscribers = (): number => bus.listenerCount;

const handler = createMcpHandler(makeServer, {
  bus,
  onerror: (err) => log.debug('MCP request refused', { message: err.message })
});

/** Host names the endpoint answers to: the site's own, and this machine's for development and tests. */
const allowedHosts = (): Set<string> =>
  new Set([new URL(site.siteUrl()).hostname, 'localhost', '127.0.0.1', '[::1]', '::1']);

const hostnameOf = (host: string | undefined): string | null => {
  if (!host) return null;
  try {
    return new URL('http://' + host).hostname;
  } catch {
    return null;
  }
};

const checkHostAndOrigin = (req: Request, res: Response, next: NextFunction): void => {
  const host = hostnameOf(req.headers.host);
  if (!host || !allowedHosts().has(host)) {
    res.status(403).json(rpcError(-32000, 'This address does not serve the Glazecalc tools.'));
    return;
  }
  // A browser always says where a request comes from; only the site itself may
  // call from a page. Assistants and scripts send no Origin. Compared as
  // written, whole: "null" (a sandboxed frame, a file), a slash at the end,
  // other letter cases and two Origin headers (which arrive joined) are all
  // refused. Before the token check and the limits, so a refused request
  // counts against nobody.
  const origin = req.headers.origin;
  if (origin && origin !== site.origin()) {
    // The value, so the real-client test on staging can see whether an app sends one (docs/integrations/directories.md).
    log.debug('MCP request from another origin refused', { origin: String(origin).slice(0, 200) });
    res.status(403).json(rpcError(-32000, 'Requests from other sites are not accepted.'));
    return;
  }
  next();
};

/**
 * The request as a web-standard Request for the SDK: without cookies or the
 * Authorization header, and with a signal that aborts when the client goes,
 * so the SDK ends a subscription stream it was keeping open.
 */
const webRequest = (req: Request, signal: AbortSignal): globalThis.Request => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || name === 'cookie' || name === 'authorization' || name === 'content-length') continue;
    for (const one of ([] as string[]).concat(value)) headers.append(name, one);
  }
  return new Request(site.siteUrl() + '/mcp', { method: 'POST', headers, body: JSON.stringify(req.body), signal });
};

/**
 * Writes the SDK's answer: a JSON body, or an event stream (a 2025 client's
 * short one, or a subscription's long one). When the client goes (signal),
 * the stream is cancelled and nothing more is written.
 */
const send = async (answer: globalThis.Response, res: Response, signal: AbortSignal): Promise<void> => {
  res.status(answer.status);
  answer.headers.forEach((value, name) => {
    if (name === 'set-cookie' || name === 'content-length') return;
    // Kept by no cache; and no proxy may compress or hold back an event stream.
    res.setHeader(name, name === 'cache-control' ? 'no-store, no-transform' : value);
  });
  if (!answer.body) {
    res.end();
    return;
  }
  const reader = answer.body.getReader();
  const cancel = () => void reader.cancel().catch(() => {});
  if (signal.aborted) cancel();
  signal.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || signal.aborted) break;
      res.write(value);
    }
  } catch {
    // The stream ended badly or the client went: nothing more to write.
  } finally {
    signal.removeEventListener('abort', cancel);
  }
  res.end();
};

/**
 * At most this many subscription streams (subscriptions/listen) open at once
 * for one caller (auth.ts caller.key: an account, whichever of its tokens, or
 * an address without a token), so one cannot hold all the SDK's 1,024 for
 * everyone else. Per account when signed in, since many people's apps share
 * the few addresses of Claude's and ChatGPT's servers.
 */
export const MOST_STREAMS = 3;
const openStreams = new Map<string, number>();

/** How many subscription streams are open now (the tests). */
export const streamsOpen = (): number => [...openStreams.values()].reduce((sum, n) => sum + n, 0);

const isListen = (body: unknown): boolean =>
  Boolean(body) && typeof body === 'object' && (body as { method?: unknown }).method === 'subscriptions/listen';

/**
 * One JSON-RPC message per request: a batch (an array of them) is refused
 * before the SDK, so the request limits count every message. Neither revision
 * the endpoint is built for has batches: 2025-06-18 took them out, and
 * 2025-11-25 and 2026-07-28 have none. Only a 2025-03-26 client could send
 * one, and those send single messages too.
 */
const refuseBatches = (req: Request, res: Response, next: NextFunction): void => {
  if (Array.isArray(req.body)) {
    res.status(400).json(rpcError(-32600, 'Batches are not accepted: send one JSON-RPC message in each request.'));
    return;
  }
  next();
};

const mcpRouter = express.Router();
export default mcpRouter;

mcpRouter.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

mcpRouter.all('/', checkHostAndOrigin, (req, res, next) => {
  if (req.method === 'POST') return next();
  res.set('Allow', 'POST').status(405).json(rpcError(-32000, 'Method not allowed.'));
});

mcpRouter.post(
  '/',
  (req, res, next) => {
    if (!req.is('application/json')) {
      res.status(415).json(rpcError(-32700, 'The body must be JSON (Content-Type: application/json).'));
      return;
    }
    next();
  },
  badTokens,
  mcpAuth,
  limits.mcpMinute,
  limits.mcpDay,
  limits.mcpAnyoneAll,
  express.json({ limit: MOST_BODY }),
  refuseBatches,
  signIn,
  stepUp,
  async (req, res) => {
    const caller = req.mcpCaller!;
    const listen = isListen(req.body);
    const streamKey = caller.key;
    if (listen) {
      const open = openStreams.get(streamKey) ?? 0;
      if (open >= MOST_STREAMS) {
        res
          .status(429)
          .json(
            rpcError(
              -32000,
              `Too many subscription streams are open for you (at most ${MOST_STREAMS}). Close one and try again.`
            )
          );
        return;
      }
      openStreams.set(streamKey, open + 1);
    }
    const gone = new AbortController();
    const abort = () => gone.abort();
    // 'close' comes when the client goes, or after the answer is written: either way the exchange is over.
    res.on('close', abort);
    try {
      const answer = await handler.fetch(webRequest(req, gone.signal), {
        parsedBody: req.body,
        authInfo: {
          // Never the token itself: the SDK and the tools need only who is calling.
          token: caller.tokenId ? (caller.via ?? 'pat') + ':' + caller.tokenId : '',
          clientId:
            caller.via === 'oauth' ? (caller.clientId ?? 'oauth') : caller.userId ? 'personal-access-token' : 'anyone',
          scopes: caller.scopes ?? [],
          extra: { ...caller }
        }
      });
      await send(answer, res, gone.signal);
    } finally {
      res.off('close', abort);
      if (listen) {
        const left = (openStreams.get(streamKey) ?? 1) - 1;
        if (left > 0) openStreams.set(streamKey, left);
        else openStreams.delete(streamKey);
      }
    }
  }
);

// Anything under /mcp/ but /mcp itself is no endpoint.
mcpRouter.use((req, res) => {
  res.status(404).json(rpcError(-32000, 'Not found.'));
});

/** The Protected Resource Metadata (RFC 9728), at both places clients look for it. */
export const metadataRouter = express.Router();
metadataRouter.get(['/oauth-protected-resource', '/oauth-protected-resource/mcp'], (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600').json(resourceMetadata());
});
