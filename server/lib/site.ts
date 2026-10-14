// Where this copy of the site lives and how it behaves: everything that differs
// between production, staging and development comes from the environment,
// never from code (docs/mfa-plan.md, "Two phases").
//
//   SITE_URL        the address people open the site at: https://glazecalcapp.com,
//                   https://staging.glazecalcapp.com, http://localhost:3000. Links
//                   in emails, the sitemap, the passkeys' relying party and the
//                   authenticator app's issuer all follow it. APP_URL is the
//                   older name and still works. Required in production.
//   SITE_LABEL      '' in production, 'staging' on staging: authenticator apps,
//                   mail subjects and a banner on every page name it.
//   NOINDEX         1: no search engine may index this copy.
//   MAIL_ALLOWLIST  comma-separated addresses or @domains: mail to anyone else
//                   is dropped (staging sets the owner's addresses).
//
// Settings are read when used, so tests can change them.
import type { RequestHandler } from 'express';

const DEVELOPMENT_URL = 'http://localhost:3000';

const configured = (): string | undefined => process.env.SITE_URL || process.env.APP_URL || undefined;

// Production says where it is; guessing would put the wrong host in passkeys and links.
if (process.env.NODE_ENV === 'production' && !configured()) {
  throw new Error('SITE_URL must be set when NODE_ENV is production');
}

/** The site's address, with no trailing slash: never the request's Host header. */
export const siteUrl = (): string => {
  const url = configured();
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('SITE_URL must be set when NODE_ENV is production');
  }
  return (url || DEVELOPMENT_URL).replace(/\/+$/, '');
};

/** '' in production; 'staging' (or whatever SITE_LABEL says) elsewhere. */
export const siteLabel = (): string => (process.env.SITE_LABEL ?? '').trim();

/** Whether search engines must leave this copy alone (NOINDEX=1). */
export const noindex = (): boolean => ['1', 'true', 'on', 'yes'].includes((process.env.NOINDEX ?? '').toLowerCase());

/**
 * The addresses and @domains mail may go to, lowercased, or null when
 * MAIL_ALLOWLIST is not set (mail may go anywhere).
 */
export const mailAllowlist = (): string[] | null => {
  const list = (process.env.MAIL_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : null;
};

/** The WebAuthn relying party id: the site's host name, no port (glazecalcapp.com, localhost). */
export const rpId = (): string => new URL(siteUrl()).hostname;

/** The origin WebAuthn expects a passkey to be used from: https://glazecalcapp.com, http://localhost:3100. */
export const origin = (): string => new URL(siteUrl()).origin;

/** The site's name with its label: "Glazecalc", or "Glazecalc (staging)". */
export const siteName = (): string => (siteLabel() ? 'Glazecalc (' + siteLabel() + ')' : 'Glazecalc');

/** The relying party's name shown by passkey prompts. */
export const rpName = siteName;

/** The issuer in an otpauth:// URI, so authenticator apps keep staging and production apart. */
export const totpIssuer = siteName;

// Hooks for stream D (docs/mfa-plan.md, "Build order"). Wired in already
// (server/app.ts, server/lib/mailer.ts); they do nothing until D fills them in.

/**
 * Whether mail may go to this address. Stream D: false when mailAllowlist() is
 * set and neither the address nor its @domain is on it; mailer.send then drops
 * the message and logs only an error code.
 */
export const mailAllowed = (to: string): boolean => {
  void to;
  return true;
};

/** Stream D: when noindex(), adds X-Robots-Tag: noindex, nofollow to every response. */
export const noindexHeaders: RequestHandler = (req, res, next) => next();

/** Stream D: when noindex(), answers /robots.txt with "User-agent: *" and "Disallow: /"; otherwise next(). */
export const robotsTxt: RequestHandler = (req, res, next) => next();

/** Stream D: when noindex(), /sitemap.xml is 404; otherwise next(). */
export const sitemapAllowed: RequestHandler = (req, res, next) => next();
