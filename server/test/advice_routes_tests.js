process.env.MONGOLAB_URI = 'mongodb://127.0.0.1/test_advice';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = '127.0.0.1:' + PORT + '/advice';
const User = require(__dirname + '/../models/user');
var userToken;
var testUser;
var gotAdvice;

describe('advice API', () => {

  before((done) => {
    testUser = new User();
    testUser.email = 'test6@advice.com';
    testUser.hashPassword('password');
    testUser.role = 'admin';
    testUser.save().then((data) => {
      if (!data) throw "err";
      testUser.token = userToken = data.generateToken();
      done();
    });
  });

  after((done) => {
//    mongoose.connection.dropDatabase().then(() => {
      done();
//    });
  });

  describe('Simple post and get API calls', () => {
    var testAdvice = {};
    testAdvice.content = 'Use care in storing notes, and make backups of formulas.';
    testAdvice.tags = ['test', 'test tag', 'test tags here', 'test one', 'advice tag'];
    testAdvice.title = 'Test Advice';
    it('should be able to add one piece of advice', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send(testAdvice)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.title).to.eql('Test Advice');
          done();
        });
    });

    it('should be able to get', (done) => {
      request(baseUri)
        .get('/getLatest/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.title).to.eql('Test Advice');
          gotAdvice = res.body;
          done();
        });
    });
  });

  describe('The getAll for advices', () => {
    var testAdvice2 = {};
    testAdvice2.content = 'Wear protective glasses when checking kilns.';
    testAdvice2.tags = ['test', 'test tag', 'test tags here', 'test two', 'advice tag'];
    testAdvice2.title = 'Test Advice 2';

    before((done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send(testAdvice2)
        .end((err) => {
          if (err) throw err;
          request(baseUri)
            .post('/create')
            .set('token', userToken)
            .send(testAdvice2)
            .end((err) => {
              if (err) throw err;
              request(baseUri)
                .post('/create')
                .set('token', userToken)
                .send(testAdvice2)
                .end((err) => {
                  if (err) throw err;
                  done();
                });
            });
        });
    });
    it('should get multiple advice elements', (done) => {
      request(baseUri)
        .get('/getAll/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body[3].title).to.eql('Test Advice 2');
          done();
        });
    });
  });

  describe('ability to UPDATE and DELETE', () => {
    it('should be able to UPDATE an advice', (done) => {
      request(baseUri)
        .put('/change/' + gotAdvice._id)
        .set('token', userToken)
        .send( gotAdvice )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully updated advice');
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should be able to DELETE an advice', (done) => {
      request(baseUri)
        .delete('/delete/' + gotAdvice._id)
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully deleted advice');
          expect(res).to.have.status(200);
          done();
        });
    });
  });

  describe('Send a bad post request intentionally', () => {
    var testAd = null;
    it('and it should handle create error without crashing', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( testAd )
        .end((err, msg) => {
          expect(msg.body.msg).to.eql('Missing required information');
          done();
        });
    });

    it('and it should handle error without crashing a second time', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( testAd )
        .end((err, msg) => {
          expect(msg.body.msg).to.eql('Missing required information');
          done();
        });
    });
  });
});
