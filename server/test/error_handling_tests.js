process.env.MONGOLAB_URI = 'mongodb://localhost/r_test';
require(__dirname + '/../../server');
const chai = require('chai');
const { default: chaiHttp, request: chaiRequest } = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = (url) => chaiRequest.execute(url);
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const appSecret = require(__dirname + '/../lib/app_secret');
var PORT = process.env.PORT || 3000;
var baseUri = 'localhost:' + PORT + '/api';
const User = require(__dirname + '/../models/user');
var userToken;

// Each of these used to reject a promise with no handler, which exits the
// whole server process on current versions of Node.
describe('error handling', () => {

  before(() => {
    var testUser = new User();
    testUser.email = 'errors@tester.com';
    testUser.hashPassword('password');
    return testUser.save().then((data) => {
      userToken = data.generateToken();
    });
  });

  after(() => mongoose.connection.dropDatabase());

  it('should reject an update with a malformed id', () => {
    return request(baseUri)
      .put('/recipe/change/not-an-id')
      .set('token', userToken)
      .send({ recipe: { title: 'x', materials: [1] } })
      .then((res) => {
        expect(res).to.have.status(400);
      });
  });

  it('should reject a delete with a malformed id', () => {
    return request(baseUri)
      .delete('/materials/delete/not-an-id')
      .set('token', userToken)
      .then((res) => {
        expect(res).to.have.status(400);
      });
  });

  it('should answer getLatest with not found for a user with no recipes', () => {
    return request(baseUri)
      .get('/recipe/getLatest')
      .set('token', userToken)
      .then((res) => {
        expect(res).to.have.status(404);
      });
  });

  it('should list standard recipes and materials', () => {
    return Promise.all(['/recipe/getStandard', '/materials/getStandard'].map((path) => {
      return request(baseUri)
        .get(path)
        .set('token', userToken)
        .then((res) => {
          expect(res, path).to.have.status(200);
          expect(res.body, path).to.be.an('array');
        });
    }));
  });

  it('should reject a token whose user id is not an ObjectId', () => {
    var badToken = jwt.sign({ id: 'not-an-id' }, appSecret);
    return request(baseUri)
      .get('/recipe/getAll')
      .set('token', badToken)
      .then((res) => {
        expect(res).to.have.status(401);
      });
  });

  it('should still be serving requests', () => {
    return request(baseUri)
      .get('/recipe/getAll')
      .set('token', userToken)
      .then((res) => {
        expect(res).to.have.status(200);
      });
  });
});
