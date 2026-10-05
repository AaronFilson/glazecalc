process.env.MONGOLAB_URI = 'mongodb://localhost/r_test';
require(__dirname + '/../../server');
const chai = require('chai');
const { default: chaiHttp, request: chaiRequest } = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = (url) => chaiRequest.execute(url);
const mongoose = require('mongoose');
var PORT = process.env.PORT || 3000;
var baseUri = 'localhost:' + PORT + '/api';

describe('health check', () => {
  before(() => mongoose.connection.asPromise());

  it('should report ok when the database answers', () => {
    return request(baseUri)
      .get('/health')
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.eql({ status: 'ok' });
        expect(res.headers['cache-control']).to.eql('no-store');
      });
  });

  it('should report unavailable when the database is not connected', () => {
    // Pretend the connection dropped; restore it right after the request.
    const state = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
    Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 0 });
    return request(baseUri)
      .get('/health')
      .then((res) => {
        expect(res).to.have.status(503);
        expect(res.body).to.eql({ status: 'unavailable', database: 'not connected' });
      })
      .finally(() => {
        if (state) Object.defineProperty(mongoose.connection, 'readyState', state);
        else delete mongoose.connection.readyState;
      });
  });
});
