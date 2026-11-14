import mongoose from 'mongoose';
import { API_LIMITS, apiRequests } from '../lib/rate_limit.ts';
import { api, expect, makeUser } from './support/app.ts';

describe('API caching', () => {
  it('keeps every reply, signed in or not, out of browser and proxy caches', async () => {
    const { token } = await makeUser();
    for (const address of ['/verify', '/recipe', '/no-such-thing']) {
      const res = await api()
        .get(address)
        .set('Cookie', 'glazecalc_session=' + token);
      expect(res.headers['cache-control'], address).to.eql('no-store');
    }
  });
});

describe('health check', () => {
  it('reports ok when the database answers', async () => {
    const res = await api().get('/health');
    expect(res).to.have.status(200);
    expect(res.body).to.eql({ status: 'ok' });
    expect(res.headers['cache-control']).to.eql('no-store');
  });

  it('reports unavailable when the database is not connected', async () => {
    // Pretend the connection dropped; restore it right after the request.
    const state = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
    Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 0 });
    try {
      const res = await api().get('/health');
      expect(res).to.have.status(503);
      expect(res.body).to.eql({ status: 'unavailable', database: 'not connected' });
    } finally {
      if (state) Object.defineProperty(mongoose.connection, 'readyState', state);
      else delete (mongoose.connection as { readyState?: number }).readyState;
    }
  });
});

// The ceiling on every request to /api from one address (limits.apiRequests), under each route's own limits.
describe('every request to /api, per address', () => {
  const limits = API_LIMITS as { minute: number };
  const was = { ...limits };
  const forget = () => {
    for (const key of ['127.0.0.1', '::ffff:127.0.0.1', '::1']) void apiRequests.resetKey(key);
  };
  beforeEach(() => {
    forget();
    process.env.RATE_LIMITS = 'on';
  });
  afterEach(() => {
    process.env.RATE_LIMITS = 'off';
    Object.assign(limits, was);
    forget();
  });

  it('leaves room for a class behind one address', () => {
    expect(API_LIMITS.minute).to.be.at.least(1000);
  });

  it('answers 429 once one address has made more than the ceiling a minute, signed in or not, but not the health check', async () => {
    limits.minute = 4;
    const { token } = await makeUser();
    const session = (address: string) =>
      api()
        .get(address)
        .set('Cookie', 'glazecalc_session=' + token);
    expect(await session('/recipe/getAll')).to.have.status(200);
    expect(await session('/materials/getAll')).to.have.status(200);
    expect(await session('/trash/getAll')).to.have.status(200);
    expect(await api().get('/verify')).to.have.status(200);
    for (const over of [await session('/notes/getAll'), await api().get('/verify'), await session('/firing/getAll')]) {
      expect(over).to.have.status(429);
      expect(over.body.code).to.equal('too-many-requests');
    }
    expect(await api().get('/health')).to.have.status(200);
  });
});
