// One server for the app: the JSON API under /api, and the built Angular
// client (npm run build) for everything else. Same origin, so no CORS.
var PORT = process.env.PORT || 3000;
const path = require('path');
const express = require('express');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://127.0.0.1/glazecalc_app_dev', {})
  .catch(error => {
    console.log('error ' + error);
     throw error;
  });

const app = module.exports = exports = express();
app.disable('x-powered-by');

const api = express.Router();
api.use('/additives', require(__dirname + '/server/routes/additives_routes'));
api.use('/advice', require(__dirname + '/server/routes/advice_routes'));
api.use('/firing', require(__dirname + '/server/routes/firing_routes'));
api.use('/materials', require(__dirname + '/server/routes/materials_routes'));
api.use('/notes', require(__dirname + '/server/routes/notes_routes'));
api.use('/recipe', require(__dirname + '/server/routes/recipe_routes'));
api.use('/trash', require(__dirname + '/server/routes/trash_routes'));
// /signup, /signin, /verify, /usersettings/:id and /deleteuser/:id
api.use('/', require(__dirname + '/server/routes/auth_routes'));
api.use('/', require(__dirname + '/server/routes/user_routes'));
api.use((req, res) => res.status(404).json({ msg: 'Not found' }));
app.use('/api', api);

// The client. Built file names carry a content hash, so browsers may keep
// them for a year; index.html must be checked each time to pick up new builds.
// Angular's hashed output: main-ABC12345.js, chunk-B5MvkF-K.js, styles-74GVMONM.css.
const HASHED = /^(main|polyfills|styles|chunk)-[A-Za-z0-9_-]{8,}\.(js|css)$/;
app.use(express.static(path.join(__dirname, 'dist', 'glazecalc', 'browser'), {
  setHeaders: (res, file) => {
    if (HASHED.test(path.basename(file))) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else if (file.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Errors that reach Express (such as malformed JSON) get a short JSON reply
// instead of the default HTML page with a stack trace.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.log('Server error : ' + err);
  if (res.headersSent) return next(err);
  res.status(status).json({ msg: status < 500 ? 'Bad request' : 'Server Error' });
});

// Express 5 passes startup errors (such as a port in use) to this callback.
const server = app.listen(PORT, (err) => {
  if (err) {
    console.error('Could not start the server on port ' + PORT + ': ' + err.message);
    process.exit(1);
  }
  console.log('Glazecalc server up on port: ' + PORT);
});

// docker stop and systemd send SIGTERM (Ctrl+C sends SIGINT): finish requests
// in progress and close the database connection, but give up after 10 seconds.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    console.log(signal + ' received, shutting down');
    setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
  });
}
