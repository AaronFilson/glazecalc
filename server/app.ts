// The Express app: the JSON API under /api, and the built Angular client
// (npm run build) for everything else, on one origin, so no CORS. main.ts
// connects to MongoDB and serves it; the tests use it directly.
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import * as log from './lib/log.ts';
import * as limits from './lib/rate_limit.ts';
import sameOrigin from './lib/same_origin.ts';
import { refuseAccessTokens } from './lib/token_auth.ts';
import authRoutes from './routes/auth_routes.ts';
import exportRoutes from './routes/export_routes.ts';
import guestRoutes from './routes/guest_routes.ts';
import mfaRoutes from './routes/mfa_routes.ts';
import oauthRoutes, { microsoftAssociation } from './routes/oauth_routes.ts';
import emailRoutes from './routes/email_routes.ts';
import passwordRoutes from './routes/password_routes.ts';
import connectionRoutes from './routes/connection_routes.ts';
import tokenRoutes from './routes/token_routes.ts';
import records from './routes/records.ts';
import { privateHeaders, sharedRouter, shareRouter } from './routes/share_routes.ts';
import shelfRoutes from './routes/shelf_routes.ts';
import userRoutes from './routes/user_routes.ts';
import mcpRouter, { metadataRouter } from './mcp/index.ts';
import { say } from './lib/messages.ts';
import * as site from './lib/site.ts';
import {
  isAppOnlyPage,
  isPage,
  isPrivatePage,
  looksLikeFile,
  pageHtml,
  prerenderedKey,
  sitemap,
  withNonce,
  withoutSlash,
  type PageText
} from './lib/pages.ts';
import { readPrerendered } from './lib/prerendered.ts';
import languages from '../lib/regions/languages.js';

const app = express();
export default app;

app.disable('x-powered-by');
// In production nginx is the only way in (port 3000 listens on 127.0.0.1) and
// appends the client's address to X-Forwarded-For; trusting exactly that one hop
// gives the rate limits the real address without letting clients choose it.
app.set('trust proxy', 1);

// What a page may load or send. Scripts are left to the build's own <meta>
// policy (angular.json, autoCsp); a page must pass both, and in production
// nginx's full policy too (deploy/nginx/glazecalc-proxy.conf, default-src
// 'self'). There is no default-src here, which would also limit scripts to
// files and block the inline script the meta policy allows by its hash.
// data: images are the check marks and arrows Bootstrap's stylesheet inlines
// as SVG. Angular adds each component's styles as <style> elements, which a
// page's own nonce allows.
export const contentSecurityPolicy = (nonce?: string): string =>
  [
    "connect-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    nonce ? `style-src 'self' 'nonce-${nonce}'` : "style-src 'self'",
    "frame-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
app.use((req, res, next) => {
  res.set('Content-Security-Policy', contentSecurityPolicy());
  next();
});
// X-Robots-Tag on every response of a copy that is not to be indexed (NOINDEX).
app.use(site.noindexHeaders);

const api = express.Router();
// Replies hold one person's records, so no browser or proxy keeps them. A
// route that sets its own Cache-Control replaces this.
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
// Changes must come from the app's own pages (cross-site request forgery).
api.use(sameOrigin);
// Access tokens that do not work, per address, before any is checked.
api.use(limits.accessTokens);

// For Docker health checks and uptime monitors: 200 only when MongoDB answers.
api.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const unavailable = (reason: string) => res.status(503).json({ status: 'unavailable', database: reason });
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !db) return unavailable('not connected');
  const timeout = new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), 2000).unref());
  return Promise.race([db.admin().ping(), timeout])
    .then(() => res.json({ status: 'ok' }))
    .catch(() => unavailable('not responding'));
});

// /additives, /advice, /firing, /materials, /notes, /recipe and /trash: the
// only routes an access token can reach (with /shelf, below), each route asking for its permission
// (server/lib/require_scope.ts).
for (const [name, router] of Object.entries(records)) api.use('/' + name, router);
// And /shelf: reading it and changing one material at a time (routes/shelf_routes.ts); its PUT is the session's.
api.use('/shelf', shelfRoutes);
// Nothing below takes an access token: the account, the password, signing in
// and out, two-step sign-in, the export (default deny, docs/integrations-plan.md
// item 5). A route that should take one goes above, behind requireScope.
api.use(refuseAccessTokens);
api.use('/export', exportRoutes);
// Share links: the owner's (signed in), and the recipe a link opens (anyone).
api.use('/share', shareRouter);
api.use('/shared', sharedRouter);
api.use('/guest', guestRoutes);
api.use('/password', passwordRoutes);
api.use('/email', emailRoutes);
// The account's own access tokens: made, listed and revoked with the web session only.
api.use('/tokens', tokenRoutes);
// Connected apps: the personal tokens and OAuth connections, what each did, and the Trash it filled; session only.
api.use('/connections', connectionRoutes);
// Two-step sign-in: the account's factors (docs/mfa-plan.md).
api.use('/mfa', mfaRoutes);
// Signing in with Google, GitHub or Microsoft (docs/adr/0015-provider-sign-in.md, 0023).
api.use('/auth', oauthRoutes);
// /signup, /signin, /signout, /verify, /usersettings/:id and /deleteuser/:id
api.use('/', authRoutes);
api.use('/', userRoutes);
api.use((req, res) => res.status(404).json(say('not-found')));
app.use('/api', api);

// The tools for AI assistants (MCP; docs/adr/0017-mcp-server.md): POST /mcp, with
// its own checks and limits, and its metadata for clients (RFC 9728).
app.use('/mcp', mcpRouter);
app.use('/.well-known', metadataRouter);
// Microsoft's publisher domain file, written from MICROSOFT_CLIENT_ID (docs/adr/0023-microsoft-sign-in.md).
app.get('/.well-known/microsoft-identity-association.json', microsoftAssociation);

// The client. Built file names carry a content hash, so browsers may keep
// them for a year; index.html must be checked each time to pick up new builds.
// Angular's hashed output: main-ABC12345.js, chunk-B5MvkF-K.js, styles-74GVMONM.css,
// and the fonts it copies to media/ (lora-latin-wght-normal-6YFDQXH3.woff2).
const HASHED = /^((main|polyfills|styles|chunk)-[A-Za-z0-9_-]{8,}\.(js|css)|[\w.-]+-[A-Z0-9]{8}\.woff2)$/;
// The translations (client/public/i18n: JSON, and the guides' Markdown) keep
// their names from build to build, so a browser may use its copy for five
// minutes before asking again, rather than asking on every load. A reader who
// loaded a page in the five minutes before a release may, for up to that
// long, see a new message in English or as its key.
const TRANSLATIONS_CACHE = 'public, max-age=300';
const I18N = path.join('i18n', path.sep);
const CLIENT = path.join(import.meta.dirname, '..', 'dist', 'glazecalc', 'browser');
// The public pages as the build rendered them (npm run build), read for each reply.
const PRERENDERED = path.join(import.meta.dirname, '..', 'dist', 'glazecalc', 'prerendered');
const missing = new Set<string>();

/** The request's query string, with its ?, or ''. */
const queryOf = (req: Request): string => (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');

// English pages are at the plain paths (/guides), so /en/guides (and
// /EN/guides) goes there. Always to a path on this site: /en//other.example
// and /en/\other.example go to /other.example, never to the other site
// (//other.example). Another language's code written in other letters goes
// to the code as written: /zh-hans/recipe to /zh-Hans/recipe.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const english = /^\/en(\/.*)?$/i.exec(req.path);
  if (english) return res.redirect(301, '/' + (english[1] ?? '').replace(/^[/\\]+/, '') + queryOf(req));
  // index.html is the home page under another name, which express.static
  // would send as it is (no canonical address, no nonce): send it home.
  if (req.path === '/index.html') return res.redirect(301, '/' + queryOf(req));
  // A language's home page is /de/, its canonical address: /de goes there.
  const code = languages.languageOfPath(req.path);
  if (code !== 'en' && req.path === languages.languagePrefix(code)) {
    return res.redirect(301, req.path + '/' + queryOf(req));
  }
  const written = languages.canonicalLanguagePath(req.path);
  return written ? res.redirect(301, written + queryOf(req)) : next();
});

// A copy that is not to be indexed (NOINDEX) serves no sitemap, and its
// robots.txt turns every crawler away (server/lib/site.ts). The languages
// and pages are fixed for the life of the process, so the sitemap (about
// 1 MB) is built once for each site address.
const sitemaps = new Map<string, string>();
app.get('/sitemap.xml', site.sitemapAllowed, (req, res) => {
  const url = site.siteUrl();
  let xml = sitemaps.get(url);
  if (xml === undefined) {
    xml = sitemap(url);
    sitemaps.set(url, xml);
  }
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(xml);
});

app.get('/robots.txt', site.robotsTxt);

app.use(
  express.static(CLIENT, {
    // index.html is written for each page below, so / is too.
    index: false,
    setHeaders: (res, file) => {
      if (HASHED.test(path.basename(file))) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (file.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      else if (path.relative(CLIENT, file).startsWith(I18N)) res.setHeader('Cache-Control', TRANSLATIONS_CACHE);
    }
  })
);

// security.txt (RFC 9116). express.static skips paths with a dot-name in them
// by default, so this folder gets its own, with dotfiles allowed.
app.use('/.well-known', express.static(path.join(CLIENT, '.well-known'), { dotfiles: 'allow', index: false }));

// A language's title, description and preview image's text for search
// results and link previews, from its messages (client/public/i18n/<language>.json:
// titles.landing, meta.description and meta.imageAlt), read once. English
// too, so en.json holds the one English text; index.html has the same
// (client/app/index-html.spec.ts), shown only if en.json cannot be read.
const pageTexts = new Map<string, Promise<PageText>>();
const pageText = (code: string): Promise<PageText> => {
  if (languages.languageFor(code)?.pseudo) return Promise.resolve({});
  let text = pageTexts.get(code);
  if (!text) {
    text = readFile(path.join(CLIENT, 'i18n', code + '.json'), 'utf8').then(
      (json) => {
        const messages = JSON.parse(json) as {
          titles?: { landing?: string };
          meta?: { description?: string; imageAlt?: string };
        };
        return {
          title: messages.titles?.landing,
          description: messages.meta?.description,
          imageAlt: messages.meta?.imageAlt
        };
      },
      () => ({})
    );
    pageTexts.set(code, text);
  }
  return text;
};

// The app's own pages (/recipe, /de/recipe, /reset, ...) are routes in the
// client, so they get index.html, written for the page's language and address
// (lib/pages.ts), and the Angular router shows them. Any other address gets
// it too, as a 404, and the app shows its not-found page; /guides/ goes to
// /guides. Paths that look like files (a dot in the last part) stay plain
// 404s, as do unknown /api paths above.
app.use(async (req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || looksLikeFile(req.path)) return next();
  const bare = withoutSlash(req.path);
  if (bare) return res.redirect(301, bare + queryOf(req));
  // As the page's own <meta> (isAppOnlyPage); a copy not to be indexed has said
  // more already. Before the page is read, so it is sent even where there is
  // no client build to send (the 404 below).
  if (isAppOnlyPage(req.path) && !res.get('X-Robots-Tag')) res.set('X-Robots-Tag', 'noindex');
  // A public page in a language offered is sent as it was rendered, if it was.
  const key = prerenderedKey(req.path);
  let html = key ? await readPrerendered(PRERENDERED, key) : undefined;
  const rendered = html !== undefined;
  if (key && !rendered && !missing.has(key)) {
    // Once for each page: the page still works from index.html, only slower to show.
    missing.add(key);
    log.warn('Prerendered page missing, sending index.html', { page: key });
  }
  if (html === undefined) {
    try {
      html = await readFile(path.join(CLIENT, 'index.html'), 'utf8');
    } catch {
      return next();
    }
  }
  const code = languages.languageOfPath(req.path);
  const text = await pageText(code);
  // A new nonce for each reply, given to Angular (ngCspNonce) for its styles.
  const nonce = crypto.randomBytes(16).toString('base64');
  // Content-Language is for search engines that read no hreflang (Baidu) and for Bing.
  res
    .set('Cache-Control', 'no-cache')
    .set('Content-Security-Policy', contentSecurityPolicy(nonce))
    .set('Content-Language', code);
  if (isPrivatePage(req.path)) privateHeaders(res);
  return res
    .status(isPage(req.path) ? 200 : 404)
    .type('html')
    .send(
      withNonce(pageHtml(html, req.path, site.siteUrl(), text, undefined, rendered), nonce).replace(
        '<gc-root>',
        `<gc-root ngCspNonce="${nonce}">`
      )
    );
});

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

// Errors from any route (Express 5 passes on those thrown in async handlers)
// get a short JSON reply instead of the default HTML page with a stack trace.
app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  // Values of the wrong type or shape, which Mongoose could not cast or
  // validate, are the request's fault, not the server's.
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json(say('invalid-input'));
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) log.error('Server error', { err, method: req.method, path: log.pathForLog(req.originalUrl) });
  return res.status(status).json(say(status === 413 ? 'too-large' : status < 500 ? 'bad-request' : 'server-error'));
});
