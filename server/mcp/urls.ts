// The MCP endpoint's addresses and its RFC 6750 challenges, for the endpoint
// (auth.ts, the tools) and the authorization server (server/oauth/), which
// gives out tokens for it alone.
import * as site from '../lib/site.ts';

/** The endpoint's address, as its metadata names it (RFC 9728 resource): every OAuth token's audience. */
export const resourceUrl = (): string => site.siteUrl() + '/mcp';
/** Where its Protected Resource Metadata is (RFC 9728, section 3). */
export const metadataUrl = (): string => site.siteUrl() + '/.well-known/oauth-protected-resource/mcp';
/** The authorization server's issuer (RFC 8414): the site itself. */
export const issuerUrl = (): string => site.siteUrl();

/** A WWW-Authenticate challenge (RFC 6750), with this resource's metadata (RFC 9728). error_description is plain ASCII. */
export const challenge = (error: string, description: string): string =>
  `Bearer realm="glazecalc", error="${error}", error_description="${description}", resource_metadata="${metadataUrl()}"`;

/**
 * The challenge for a call, with no token, to a tool that needs the person's
 * records: sign in (lazy authentication). It asks to read them, and for a tool
 * that changes records also to change them; the consent page still leaves
 * "Also let it change my records" unticked.
 */
export const signInChallenge = (write: boolean): string =>
  challenge('invalid_token', 'Sign in to Glazecalc to use this tool') +
  `, scope="${write ? 'data:read data:write' : 'data:read'}"`;

/** The challenge that asks an app to come back for the right to change records (MCP's step-up). */
export const writeChallenge = (): string =>
  challenge('insufficient_scope', 'This app may only read your records') + ', scope="data:read data:write"';
