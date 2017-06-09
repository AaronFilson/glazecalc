process.env.MONGOLAB_URI = 'mongodb://localhost/m_test';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = 'localhost:' + PORT + '/additives';
const User = require(__dirname + '/../models/user');
var userToken;
var testUser;
var gotAdditive;

var testAdditive = {};
testAdditive.fields = [{ name: 'Iron', amount: 1 }, { name: 'Clay', amount: 1 }];
testAdditive.name = 'Yellow Ochre';
testAdditive.notes = ['fake note id 3', 'fake note id 4'];
testAdditive.relatedTo = ['RIO', 'Rust', 'Clay'];

describe('additives API', () => {

  before((done) => {
    testUser = new User();
    testUser.email = 'test9@tester.com';
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

  describe('Simple post and get API calls', () => {

    it('should be able to add one additive', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( testAdditive )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.name).to.eql('Yellow Ochre');
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
          expect(res.body.name).to.eql('Yellow Ochre');
          gotAdditive = res.body;
          done();
        });
    });
  });

  describe('The getAll for additives', () => {

    before((done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( testAdditive )
        .end((err) => {
          if (err) throw err;
          request(baseUri)
            .post('/create')
            .set('token', userToken)
            .send( testAdditive )
            .end((err) => {
              if (err) throw err;
              request(baseUri)
                .post('/create')
                .set('token', userToken)
                .send( testAdditive )
                .end((err) => {
                  if (err) throw err;
                  done();
                });
            });
        });
    });
    it('should get multiple additives', (done) => {
      request(baseUri)
        .get('/getAll/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body[3].name).to.eql('Yellow Ochre');
          done();
        });
    });
  });

  describe('ability to UPDATE and DELETE', () => {
    it('should be able to UPDATE an additive', (done) => {
      request(baseUri)
        .put('/change/' + gotAdditive._id)
        .set('token', userToken)
        .send( gotAdditive )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully updated additive');
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should be able to DELETE an additive', (done) => {
      request(baseUri)
        .delete('/delete/' + gotAdditive._id)
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully deleted additive');
          expect(res).to.have.status(200);
          done();
        });
    });
  });
});
