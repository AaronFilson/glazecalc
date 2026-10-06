import mongoose from 'mongoose';
import { api, expect } from './support/app.ts';

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
