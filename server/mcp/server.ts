// The Glazecalc MCP server (docs/adr/0017-mcp-server.md): a fresh McpServer for
// each request, as the SDK's stateless serving makes one, with the public tools
// always and a person's own read tools only when the request carried a working
// token (server/mcp/auth.ts puts who it is in authInfo.extra).
import { McpServer, type McpRequestContext } from '@modelcontextprotocol/server';
import type { Caller } from './common.ts';
import { registerAccountTools } from './tools/account.ts';
import { registerPublicTools } from './tools/public.ts';

export const SERVER_INFO = {
  name: 'glazecalc',
  title: 'Glazecalc',
  version: '1.0.0',
  websiteUrl: 'https://glazecalcapp.com'
} as const;

const INSTRUCTIONS =
  'Glazecalc works out ceramic glaze chemistry. Use search_materials to find material names, then analyze_recipe, ' +
  'check_limits, suggest_substitutes or match_from_materials with recipe lines. Amounts can be in any unit the lines ' +
  'share. The limit checks are cautions from published limits, not proof that a glaze is food safe: say so, and ' +
  'advise a test firing and, for food surfaces, a leach test. With a personal access token, the tools whose names ' +
  'say "my" or list_recipes read the person\'s own saved records; they never change anything.';

/** The caller authInfo carries, as server/mcp/index.ts sets it. */
export const callerOf = (ctx: McpRequestContext): Caller => {
  const extra = (ctx.authInfo?.extra ?? {}) as Partial<Caller>;
  return {
    key: typeof extra.key === 'string' ? extra.key : 'unknown',
    ...(typeof extra.userId === 'string' && { userId: extra.userId }),
    ...(typeof extra.tokenId === 'string' && { tokenId: extra.tokenId }),
    ...(Array.isArray(extra.scopes) && { scopes: extra.scopes.filter((s): s is string => typeof s === 'string') })
  };
};

export const makeServer = (ctx: McpRequestContext): McpServer => {
  const caller = callerOf(ctx);
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS, capabilities: { tools: {} } });
  registerPublicTools(server, caller);
  registerAccountTools(server, caller);
  return server;
};
