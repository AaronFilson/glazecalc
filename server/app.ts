// The Express app: the JSON API under /api, and the built Angular client
// (npm run build) for everything else, on one origin, so no CORS. main.ts
// connects to MongoDB and serves it; the tests use it directly.
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import * as log from './lib/log.ts';
import sameOrigin from './lib/same_origin.ts';
import authRoutes from './routes/auth_routes.ts';
import guestRoutes from './routes/guest_routes.ts';
import passwordRoutes from './routes/password_routes.ts';
import records from './routes/records.ts';
import userRoutes from './routes/user_routes.ts';

const app = express();
export default app;

app.disable('x-powered-by');
// In production nginx is the only way in (port 3000 listens on 127.0.0.1) and
// appends the client's address to X-Forwarded-For; trusting exactly that one hop
// gives the rate limits the real address without letting clients choose it.
app.set('trust proxy', 1);

const api = express.Router();
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
api.use('/guest', guestRoutes);
api.use('/password', passwordRoutes);
// /signup, /signin, /signout, /verify, /usersettings/:id and /deleteuser/:id
api.use('/', authRoutes);
api.use('/', userRoutes);
api.use((req, res) => res.status(404).json({ msg: 'Not found' }));
app.use('/api', api);

// The client. Built file names carry a content hash, so browsers may keep
// them for a year; index.html must be checked each time to pick up new builds.
// Angular's hashed output: main-ABC12345.js, chunk-B5MvkF-K.js, styles-74GVMONM.css.
const HASHED = /^(main|polyfills|styles|chunk)-[A-Za-z0-9_-]{8,}\.(js|css)$/;
const CLIENT = path.join(import.meta.dirname, '..', 'dist', 'glazecalc', 'browser');
app.use(
  express.static(CLIENT, {
    setHeaders: (res, file) => {
      if (HASHED.test(path.basename(file))) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (file.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

// The app's own pages (/recipe, /reset, ...) are routes in the client, so they
// get index.html and the Angular router shows them. Paths that look like files
// (a dot in the last part) stay 404s, as do unknown /api paths above.
app.use((req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || /\.[^/]*$/.test(req.path)) return next();
  res.set('Cache-Control', 'no-cache');
  return res.sendFile(path.join(CLIENT, 'index.html'), (err) => err && next());
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
    return res.status(400).json({ msg: 'Some of the information sent is not valid.' });
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) log.error('Server error', { err, method: req.method, path: req.originalUrl });
  const msg =
    status === 413 ? 'That is more than can be saved at once.' : status < 500 ? 'Bad request' : 'Server Error';
  return res.status(status).json({ msg });
});
