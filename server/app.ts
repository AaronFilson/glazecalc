// The Express app: the JSON API under /api, and the built Angular client
// (npm run build) for everything else, on one origin, so no CORS. main.ts
// connects to MongoDB and serves it; the tests use it directly.
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import * as log from './lib/log.ts';
import sameOrigin from './lib/same_origin.ts';
import authRoutes from './routes/auth_routes.ts';
import exportRoutes from './routes/export_routes.ts';
import guestRoutes from './routes/guest_routes.ts';
import mfaRoutes from './routes/mfa_routes.ts';
import emailRoutes from './routes/email_routes.ts';
import passwordRoutes from './routes/password_routes.ts';
import records from './routes/records.ts';
import userRoutes from './routes/user_routes.ts';
import { say } from './lib/messages.ts';
import * as site from './lib/site.ts';
import {
  isPage,
  looksLikeFile,
  pageHtml,
  prerenderedKey,
  sitemap,
  withNonce,
  withoutSlash,
  type PageText
} from './lib/pages.ts';
import { loadPrerendered } from './lib/prerendered.ts';
import languages from '../lib/regions/languages.js';

const app = express();
export default app;

app.disable('x-powered-by');
// In production nginx is the only way in (port 3000 listens on 127.0.0.1) and
// appends the client's address to X-Forwarded-For; trusting exactly that one hop
// gives the rate limits the real address without letting clients choose it.
app.set('trust proxy', 1);

// What a page may load or send. Scripts are left to the build's own <meta>
// policy (angular.json, autoCsp); a page must pass both. There is no
// default-src, which would also limit scripts to files and block the inline
// script the meta policy allows by its hash. data: images are the check marks
// and arrows Bootstrap's stylesheet inlines as SVG. Angular adds each
// component's styles as <style> elements, which a page's own nonce allows.
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

// /additives, /advice, /firing, /materials, /notes, /recipe and /trash
for (const [name, router] of Object.entries(records)) api.use('/' + name, router);
api.use('/export', exportRoutes);
api.use('/guest', guestRoutes);
api.use('/password', passwordRoutes);
api.use('/email', emailRoutes);
// Two-step sign-in: the account's factors (docs/mfa-plan.md).
api.use('/mfa', mfaRoutes);
// /signup, /signin, /signout, /verify, /usersettings/:id and /deleteuser/:id
api.use('/', authRoutes);
api.use('/', userRoutes);
api.use((req, res) => res.status(404).json(say('not-found')));
app.use('/api', api);

// The client. Built file names carry a content hash, so browsers may keep
// them for a year; index.html must be checked each time to pick up new builds.
// Angular's hashed output: main-ABC12345.js, chunk-B5MvkF-K.js, styles-74GVMONM.css.
const HASHED = /^(main|polyfills|styles|chunk)-[A-Za-z0-9_-]{8,}\.(js|css)$/;
const CLIENT = path.join(import.meta.dirname, '..', 'dist', 'glazecalc', 'browser');
// The public pages as the build rendered them (npm run build), read when first asked for.
const PRERENDERED = path.join(import.meta.dirname, '..', 'dist', 'glazecalc', 'prerendered');
let prerendered: Promise<Map<string, string>> | undefined;
const missing = new Set<string>();

/** The request's query string, with its ?, or ''. */
const queryOf = (req: Request): string => (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');

// English pages are at the plain paths (/guides), so /en/guides goes there.
// Always to a path on this site: /en//other.example and /en/\other.example
// go to /other.example, never to the other site (//other.example).
app.use((req, res, next) => {
  const english = /^\/en(\/.*)?$/.exec(req.path);
  if (!english || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
  return res.redirect(301, '/' + (english[1] ?? '').replace(/^[/\\]+/, '') + queryOf(req));
});

// A copy that is not to be indexed (NOINDEX) serves no sitemap, and its
// robots.txt turns every crawler away (server/lib/site.ts).
app.get('/sitemap.xml', site.sitemapAllowed, (req, res) => {
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(sitemap(site.siteUrl()));
});

app.get('/robots.txt', site.robotsTxt);

app.use(
  express.static(CLIENT, {
    // index.html is written for each page below, so / is too.
    index: false,
    setHeaders: (res, file) => {
      if (HASHED.test(path.basename(file))) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (file.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

// security.txt (RFC 9116). express.static skips paths with a dot-name in them
// by default, so this folder gets its own, with dotfiles allowed.
app.use('/.well-known', express.static(path.join(CLIENT, '.well-known'), { dotfiles: 'allow', index: false }));

// A language's title, description and preview image's text for search
// results and link previews, from its messages (client/public/i18n/<language>.json:
// titles.landing, meta.description and meta.imageAlt), read once.
const pageTexts = new Map<string, Promise<PageText>>();
const pageText = (code: string): Promise<PageText> => {
  if (code === 'en' || languages.languageFor(code)?.pseudo) return Promise.resolve({});
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
  // A public page in a language offered is sent as it was rendered, if it was.
  const key = prerenderedKey(req.path);
  let html: string | undefined;
  if (key) {
    const pages = await (prerendered ??= loadPrerendered(PRERENDERED));
    // Nothing yet (no build): look again next time rather than keep nothing.
    if (!pages.size) prerendered = undefined;
    html = pages.get(key);
  }
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
  const text = await pageText(languages.languageOfPath(req.path));
  // A new nonce for each reply, given to Angular (ngCspNonce) for its styles.
  const nonce = crypto.randomBytes(16).toString('base64');
  res
    .set('Cache-Control', 'no-cache')
    .set('Content-Security-Policy', contentSecurityPolicy(nonce))
    .set('Content-Language', languages.languageOfPath(req.path));
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
  if (status >= 500) log.error('Server error', { err, method: req.method, path: req.originalUrl });
  return res.status(status).json(say(status === 413 ? 'too-large' : status < 500 ? 'bad-request' : 'server-error'));
});
