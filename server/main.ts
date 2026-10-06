// Starts Glazecalc: connects to MongoDB, serves the app (app.ts) on PORT,
// removes expired trials, and shuts down cleanly when asked. Node runs this
// TypeScript as it is: node server/main.ts.
import mongoose from 'mongoose';
import app from './app.ts';
import * as guestSweeper from './lib/guest_sweeper.ts';
import * as log from './lib/log.ts';

const PORT = process.env.PORT || 3000;

// Without the database there is nothing to serve: fail, and let Docker restart it.
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_app_dev').catch((err: unknown) => {
  log.error('Could not connect to MongoDB', { err });
  process.exit(1);
});

// Express 5 passes startup errors (such as a port in use) to this callback.
const server = app.listen(PORT, (err?: Error) => {
  if (err) {
    log.error('Could not start the server', { port: PORT, err });
    process.exit(1);
  }
  log.info('Glazecalc server up', { port: Number(PORT) });
  guestSweeper.start();
});

// docker stop and systemd send SIGTERM (Ctrl+C sends SIGINT): finish requests
// in progress and close the database connection, but give up after 10 seconds.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    log.info('Shutting down', { signal });
    setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => void mongoose.disconnect().finally(() => process.exit(0)));
  });
}
