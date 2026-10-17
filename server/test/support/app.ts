// The app under test, for every server test file (loaded by .mocharc.cjs).
// Root hooks connect to the test database, empty it with its indexes in place,
// and serve the app on a free port in this process, so nothing else needs to
// run. Test files use the helpers below. The files run in parallel, and there
// the root hooks run before and after each file, each worker with a database
// of its own (env.ts).
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as chai from 'chai';
import chaiHttp, { request } from 'chai-http';
import mongoose from 'mongoose';
import app from '../../app.ts';
import User from '../../models/user.ts';

chai.use(chaiHttp);

let server: http.Server;
let count = 0;

// Setting up and clearing away the database can wait on the other workers
// doing the same; the tests keep their own time limit (.mocharc.cjs).
const HOOK_TIMEOUT = 30000;

export const mochaHooks = {
  async beforeAll(this: Mocha.Context): Promise<void> {
    this.timeout(HOOK_TIMEOUT);
    await mongoose.connect(process.env.MONGODB_URI!);
    await mongoose.connection.dropDatabase();
    // Built before any test, so the unique email index is there from the start.
    await mongoose.syncIndexes();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  },
  async afterAll(this: Mocha.Context): Promise<void> {
    this.timeout(HOOK_TIMEOUT);
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
};

/** Where the app under test listens: http://127.0.0.1:<port>. */
export const base = (): string => 'http://127.0.0.1:' + (server.address() as AddressInfo).port;

export const expect = chai.expect;

/** Requests to the API: api().get('/verify'). */
export const api = () => request.execute(base() + '/api');

/** Requests to the whole site, such as the client's pages. */
export const site = () => request.execute(base());

/** An address no other test uses. */
export const uniqueEmail = (label = 'user'): string => label + '-' + Date.now() + '-' + count++ + '@tester.com';

/** The sign-in token a response set in its session cookie, or null. */
export const sessionToken = (res: { headers: Record<string, unknown> }): string | null => {
  for (const cookie of ([] as unknown[]).concat(res.headers['set-cookie'] ?? [])) {
    const match = /^glazecalc_session=([^;]*)/.exec(String(cookie));
    if (match) return match[1] || null;
  }
  return null;
};

/** A saved account with the password, and a sign-in token for it. */
export const makeUser = async ({
  email = uniqueEmail(),
  password = 'password123',
  role
}: { email?: string; password?: string; role?: string } = {}) => {
  const user = new User({ email, role });
  user.hashPassword(password);
  await user.save();
  return { user, token: user.generateToken(), email, password };
};
