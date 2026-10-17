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
import { createMcpHandler } from '@modelcontextprotocol/server';
import * as log from '../lib/log.ts';
import * as limits from '../lib/rate_limit.ts';
import * as site from '../lib/site.ts';
import { mcpAuth, resourceMetadata, rpcError } from './auth.ts';
import { makeServer } from './server.ts';

/** The largest request body taken: far more than 40 recipe lines need. */
export const MOST_BODY = '256kb';

const handler = createMcpHandler(makeServer, {
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
  // call from a page. Assistants and scripts send no Origin.
  const origin = req.headers.origin;
  if (origin && origin !== site.origin()) {
    res.status(403).json(rpcError(-32000, 'Requests from other sites are not accepted.'));
    return;
  }
  next();
};

/** The request as a web-standard Request for the SDK: without cookies or the Authorization header. */
const webRequest = (req: Request): globalThis.Request => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined || name === 'cookie' || name === 'authorization' || name === 'content-length') continue;
    for (const one of ([] as string[]).concat(value)) headers.append(name, one);
  }
  return new Request(site.siteUrl() + '/mcp', { method: 'POST', headers, body: JSON.stringify(req.body) });
};

/** Writes the SDK's answer: a JSON body, or for a 2025 client perhaps a short event stream. */
const send = async (answer: globalThis.Response, res: Response): Promise<void> => {
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
  for await (const chunk of answer.body) res.write(chunk);
  res.end();
};

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
  limits.accessTokens,
  mcpAuth,
  limits.mcpMinute,
  limits.mcpDay,
  express.json({ limit: MOST_BODY }),
  refuseBatches,
  async (req, res) => {
    const caller = req.mcpCaller!;
    const answer = await handler.fetch(webRequest(req), {
      parsedBody: req.body,
      authInfo: {
        // Never the token itself: the SDK and the tools need only who is calling.
        token: caller.tokenId ? 'pat:' + caller.tokenId : '',
        clientId: caller.userId ? 'personal-access-token' : 'anyone',
        scopes: caller.scopes ?? [],
        extra: { ...caller }
      }
    });
    await send(answer, res);
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
