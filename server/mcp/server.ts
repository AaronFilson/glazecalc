// The Glazecalc MCP server (docs/adr/0017-mcp-server.md): a fresh McpServer for
// each request, as the SDK's stateless serving makes one, with the public tools,
// the guides (a tool and resources), the cone charts and materials as resources,
// and the prompts always, and a person's own tools, to read and to change their
// records, only when the request carried a working token (server/mcp/auth.ts
// puts who it is in authInfo.extra; each tool that changes anything checks
// that the token allows it, and waits for the person's approval when the
// account asks for it, tools/account_write.ts).
import { McpServer, type McpRequestContext, type RegisteredTool } from '@modelcontextprotocol/server';
import type { Caller } from './common.ts';
import { registerPrompts } from './prompts.ts';
import { requestStateCodec } from './request_state.ts';
import { registerAccountTools } from './tools/account.ts';
import { registerWriteTools, WRITE_TOOLS } from './tools/account_write.ts';
import { registerBlendTools } from './tools/blends.ts';
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
  'check_limits, suggest_substitutes or match_from_materials with recipe lines; blend_recipes works out the test ' +
  'tiles of a line or triaxial blend between recipes, or compares two. Amounts can be in any unit the lines ' +
  'share. The limit checks are cautions from published limits, not proof that a glaze is food safe: say so, and ' +
  'advise a test firing and, for food surfaces, a leach test. search_guides finds what the guides say about glaze ' +
  'defects, safety and firing, in the person’s language, with addresses to cite; resources/read gives a guide or ' +
  'section in full (glazecalc://guides/<language>/<guide>[/<section>]), a material (glazecalc://materials/<name>) ' +
  'and the cone charts (glazecalc://cones). With a personal access token, or once the person has connected ' +
  'this app to their account, the tools whose names say "my" or list_recipes read the person\'s own saved ' +
  'records. create_recipe, update_recipe, add_notebook_entry, add_my_material, update_my_material, add_to_shelf, ' +
  'remove_from_shelf, undo_shelf_change and move_to_trash change them, and only when the person allowed changes; otherwise they ' +
  'are refused and change nothing. Change only what the person asked for, and tell them what you changed: each ' +
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
    ...(Array.isArray(extra.scopes) && { scopes: extra.scopes.filter((s): s is string => typeof s === 'string') }),
    ...((extra.via === 'pat' || extra.via === 'oauth') && { via: extra.via }),
    ...(typeof extra.clientId === 'string' && { clientId: extra.clientId })
  };
};

/** The tools that read the person's own records (tools/account.ts). */
const ACCOUNT_TOOLS = new Set([
  'list_recipes',
  'get_recipe',
  'list_my_materials',
  'get_shelf',
  'match_with_what_i_have',
  'list_firings',
  'get_firing',
  'list_notes',
  'get_my_settings'
]);

/**
 * How each tool may be called, as OpenAI's Apps SDK reads it from the tool's
 * _meta.securitySchemes (ChatGPT; docs/adr/0024): the public tools with no
 * sign-in or with one, the person's own with OAuth and data:read, the tools
 * that change records with data:write too.
 */
export const securitySchemes = (name: string) =>
  WRITE_TOOLS.has(name)
    ? [{ type: 'oauth2', scopes: ['data:read', 'data:write'] }]
    : ACCOUNT_TOOLS.has(name)
      ? [{ type: 'oauth2', scopes: ['data:read'] }]
      : [{ type: 'noauth' }, { type: 'oauth2', scopes: ['data:read'] }];

/** Gives every tool registered on this server its securitySchemes. */
const withSecuritySchemes = (server: McpServer): void => {
  const register = server.registerTool.bind(server) as (...args: unknown[]) => RegisteredTool;
  (server as unknown as { registerTool: (...args: unknown[]) => RegisteredTool }).registerTool = (...args) => {
    const tool = register(...args);
    tool._meta = { ...tool._meta, securitySchemes: securitySchemes(String(args[0])) };
    return tool;
  };
};

export const makeServer = (ctx: McpRequestContext): McpServer => {
  const caller = callerOf(ctx);
  const server = new McpServer(SERVER_INFO, {
    instructions: INSTRUCTIONS,
    capabilities: { tools: {}, resources: {}, prompts: {}, completions: {} },
    // A write tool may ask the person to confirm a change (tools/account_write.ts) with the
    // 2026-07-28 multi-round-trip requests only. The endpoint is stateless, so the SDK's shim,
    // which would ask a 2025 client from the server in the same request, is off: a 2025 client
    // is given the website's link instead.
    inputRequired: { legacyShim: false },
    // The state handed out while asking is signed; the SDK refuses any that fails this.
    requestState: { verify: requestStateCodec.verify }
  });
  withSecuritySchemes(server);
  registerPublicTools(server, caller);
  registerBlendTools(server);
  registerGuides(server);
  registerPrompts(server);
  registerAccountTools(server, caller);
  registerWriteTools(server, caller);
  return server;
};
