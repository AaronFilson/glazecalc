process.env.MONGOLAB_URI = 'mongodb://localhost/u_r_test';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = 'localhost:' + PORT;
const User = require(__dirname + '/../models/user');
var userToken;
var testUser;

describe('user API', () => {

  before((done) => {
    testUser = new User();
    testUser.email = 'test3@tester.com';
    testUser.hashPassword('password');
    testUser.save( (err, data) => {
      if (err) throw err;
      testUser.token = userToken = data.generateToken();
      done();
    });
  });

  after((done) => {
    mongoose.connection.db.dropDatabase(() => {
      done();
    });
  });

  describe('check if user exists', () => {
    it('should be able to verify that a user exists', (done) => {
      request(baseUri)
        .get('/verify/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.msg).to.eql('User verified');
          done();
        });
    });
  });

  describe('ability to UPDATE and DELETE', () => {
    it('should be able to UPDATE a user', (done) => {
      request(baseUri)
        .put('/usersettings/' + testUser._id)
        .set('token', userToken)
        .send({ email: 'new email' })
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('User updated');
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should be able to DELETE a user', (done) => {
      request(baseUri)
        .delete('/deleteuser/' + testUser._id)
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('User deleted');
          expect(res).to.have.status(200);
          done();
        });
    });
  });

  describe('Send a bad verify request intentially', () => {
    var badtoken = null;
    it('and it should handle filter without crashing', (done) => {
      request(baseUri)
        .get('/verify')
        .set('token', badtoken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.status).to.eql(200);
          expect(res.body.msg).to.eql('No token yet, so there is no email to find. Goodbye.');
          done();
        });
    });

    it('and it should handle no token without crashing a second time', (done) => {
      request(baseUri)
        .get('/verify')
        .set( { trashdata: 'not anything good' } )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('No token yet, so there is no email to find. Goodbye.');
          done();
        });
    });
  });
});
