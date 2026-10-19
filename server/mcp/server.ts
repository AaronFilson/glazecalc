// The Glazecalc MCP server (docs/adr/0017-mcp-server.md): a fresh McpServer for
// each request, as the SDK's stateless serving makes one, with the public tools,
// the guides (a tool and resources), the cone charts and materials as resources,
// and the prompts always, and a person's own tools, to read and to change their
// records, only when the request carried a working token (server/mcp/auth.ts
// puts who it is in authInfo.extra; each tool that changes anything checks
// that the token allows it, tools/account_write.ts).
import { McpServer, type McpRequestContext } from '@modelcontextprotocol/server';
import type { Caller } from './common.ts';
import { registerPrompts } from './prompts.ts';
import { registerAccountTools } from './tools/account.ts';
import { registerWriteTools } from './tools/account_write.ts';
import { registerGuides } from './tools/guides.ts';
import { registerPublicTools } from './tools/public.ts';

export const SERVER_INFO = {
  name: 'glazecalc',
  title: 'Glazecalc',
  version: '1.1.0',
  websiteUrl: 'https://glazecalcapp.com'
} as const;

const INSTRUCTIONS =
  'Glazecalc works out ceramic glaze chemistry. Use search_materials to find material names, then analyze_recipe, ' +
  'check_limits, suggest_substitutes or match_from_materials with recipe lines. Amounts can be in any unit the lines ' +
  'share. The limit checks are cautions from published limits, not proof that a glaze is food safe: say so, and ' +
  'advise a test firing and, for food surfaces, a leach test. search_guides finds what the guides say about glaze ' +
  'defects, safety and firing, in the person’s language, with addresses to cite; resources/read gives a guide or ' +
  'section in full (glazecalc://guides/<language>/<guide>[/<section>]), a material (glazecalc://materials/<name>) ' +
  'and the cone charts (glazecalc://cones). With a personal access token, the tools whose names ' +
  'say "my" or list_recipes read the person\'s own saved records. create_recipe, update_recipe, ' +
  'add_notebook_entry, add_my_material, update_my_material, add_to_shelf, remove_from_shelf, undo_shelf_change and move_to_trash ' +
  'change them, and only with a token the person made to read and change; with a read-only token they are ' +
  'refused and change nothing. Change only what the person asked for, and tell them what you changed: each ' +
  'change keeps the record as it was, so they can undo it on the website, and move_to_trash puts a record in ' +
  'the Trash for 30 days, never deleting it. The shelf keeps the list it had before its last change: ' +
  'undo_shelf_change puts it back, one step only.';

/** The caller authInfo carries, as server/mcp/index.ts sets it. */
export const callerOf = (ctx: McpRequestContext): Caller => {
  const extra = (ctx.authInfo?.extra ?? {}) as Partial<Caller>;
  return {
    key: typeof extra.key === 'string' ? extra.key : 'unknown',
    ...(typeof extra.userId === 'string' && { userId: extra.userId }),
    ...(typeof extra.tokenId === 'string' && { tokenId: extra.tokenId }),
    ...(typeof extra.name === 'string' && { name: extra.name }),
    ...(Array.isArray(extra.scopes) && { scopes: extra.scopes.filter((s): s is string => typeof s === 'string') })
  };
};

export const makeServer = (ctx: McpRequestContext): McpServer => {
  const caller = callerOf(ctx);
  const server = new McpServer(SERVER_INFO, {
    instructions: INSTRUCTIONS,
    capabilities: { tools: {}, resources: {}, prompts: {}, completions: {} }
  });
  registerPublicTools(server, caller);
  registerGuides(server);
  registerPrompts(server);
  registerAccountTools(server, caller);
  registerWriteTools(server, caller);
  return server;
};
