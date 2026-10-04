process.env.MONGOLAB_URI = 'mongodb://127.0.0.1:27017/a_r_tests';
require(__dirname + '/../../server.js');
const User = require(__dirname + '/../models/user');
var PORT = process.env.PORT || 4000;
var baseUri = 'localhost:' + PORT;
const chai = require('chai');
var chaiHTTP = require('chai-http');
chai.use(chaiHTTP);
const request = chai.request;
var mongoose = require('mongoose');
var expect = chai.expect;

var userId;
var userToken;

describe('authorization route', () => {
  after((done) => {
    mongoose.connection.dropDatabase().then(() => {
      done();
    });
  });
  it('should create a new user with a POST request', (done) => {
    request(baseUri)
      .post('/signup')
      .send( { 'email': 'test@tester.com', 'password': 'password' } )
      .end((err, res) => {
        expect(err).to.eql(null);
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('token');
        expect(res.body).to.have.property('email');
        done();
      });
  });
  describe('rest requests that require an existing user in the DB', () => {
    beforeEach((done) => {
      var newUser = new User();
      newUser.email = 'test@tester.com';
      newUser.hashPassword('password');
      newUser.save().then((data) => {
        if (!data) throw 'no data';
        userToken = data.generateToken();
        userId = data._id;
        expect(userToken).to.not.eql(null);
        expect(userId).to.not.eql(null);
        done();
      });
    });
    it('should check if the user has valid credentials', (done) => {
      request(baseUri)
        .get('/signin')
        .auth('test@tester.com', 'password')
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('token');
          expect(res.body).to.have.property('email');
          done();
        });
    });
    it('should not allow user to enter a bad password', (done) => {
      request(baseUri)
        .get('/signin')
        .auth('test@tester.com', 'NOTpassword')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.not.have.property('token');
          expect(res.body).to.not.have.property('email');
          done();
        });
    });
  });

  describe('Send a bad post request intentionally', () => {
    var notuser = null;
    it('and it should handle create error without crashing', (done) => {
      request(baseUri)
        .post('/signup')
        .send( notuser )
        .end((err, msg) => {
          expect(msg.status).to.eql(400);
          expect(msg.body.msg).to.eql('Please enter an email');
          done();
        });
    });

    it('and it should handle error without crashing a second time', (done) => {
      request(baseUri)
        .post('/signup')
        .send( { trashdata: 'not anything good' } )
        .end((err, msg) => {
          expect(msg.body.msg).to.eql('Please enter an email');
          done();
        });
    });
  });

  describe('Send a bad get request intentionally', () => {
    it('and it should handle create error without crashing', (done) => {
      request(baseUri)
        .get('/signin')
        .end((err, msg) => {
          expect(msg.status).to.eql(401);
          expect(msg.body.msg).to.eql('could not authenticate user');
          done();
        });
    });

    it('and it should handle error without crashing a second time', (done) => {
      request(baseUri)
        .get('/signin')
        .end((err, msg) => {
          expect(msg.body.msg).to.eql('could not authenticate user');
          done();
        });
    });
  });
});
