process.env.MONGOLAB_URI = 'mongodb://127.0.0.1/u_r_test';
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
    testUser.displayname = 'test 3';
    testUser.save().then(function (data) {
      testUser.token = userToken = data.generateToken();
      done();
    });
  });

//  after((done) => {
//    mongoose.connection.dropDatabase().then(() => {
//      done();
//    });
//  });

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

  describe('changes to other accounts', () => {
    var victim;
    var attackerToken;

    before(() => {
      victim = new User({ email: 'victim@tester.com' });
      victim.hashPassword('password');
      var attacker = new User({ email: 'attacker@tester.com' });
      attacker.hashPassword('password');
      return Promise.all([victim.save(), attacker.save()]).then((saved) => {
        attackerToken = saved[1].generateToken();
      });
    });

    it('should not let a user update another account', () => {
      return request(baseUri)
        .put('/usersettings/' + victim._id)
        .set('token', attackerToken)
        .send({ email: 'stolen@tester.com' })
        .then((res) => {
          expect(res).to.have.status(403);
          return User.findById(victim._id);
        })
        .then((user) => expect(user.email).to.eql('victim@tester.com'));
    });

    it('should not let a user delete another account', () => {
      return request(baseUri)
        .delete('/deleteuser/' + victim._id)
        .set('token', attackerToken)
        .then((res) => {
          expect(res).to.have.status(403);
          return User.findById(victim._id);
        })
        .then((user) => expect(user).to.not.eql(null));
    });

    it('should ignore role and password in settings changes', () => {
      var victimToken = victim.generateToken();
      return request(baseUri)
        .put('/usersettings/' + victim._id)
        .set('token', victimToken)
        .send({ role: 'admin', password: 'plaintext', displayname: 'Victim' })
        .then((res) => {
          expect(res).to.have.status(200);
          return User.findById(victim._id);
        })
        .then((user) => {
          expect(user.role).to.eql(undefined);
          expect(user.displayname).to.eql('Victim');
          expect(user.comparePassword('password')).to.eql(true);
        });
    });

    it('should not let a user take an email already in use', () => {
      return request(baseUri)
        .put('/usersettings/' + victim._id)
        .set('token', victim.generateToken())
        .send({ email: 'attacker@tester.com' })
        .then((res) => expect(res).to.have.status(400));
    });

    it('should not sign up a second account with the same email', () => {
      return request(baseUri)
        .post('/signup')
        .send({ email: 'victim@tester.com', password: 'password123' })
        .then((res) => expect(res).to.have.status(400));
    });
  });

  describe('Send a bad verify request intentionally', () => {
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
