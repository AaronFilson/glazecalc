process.env.MONGOLAB_URI = 'mongodb://localhost/firing_test';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = 'localhost:' + PORT + '/firing';
const User = require(__dirname + '/../models/user');
var userToken;
var testUser;
var gotFiring;
var testFiring = {};
testFiring.date = 'A date string';
testFiring.fieldsIncluded = ['gas', 'air', 'damper', 'temp', 'cone', 'weather'];
testFiring.kiln = 'Test kiln #1';
testFiring.notes = ['fake note id 1', 'fake note id 2'];
testFiring.rows = [['row1', 'a second part of row1'], ['row2', 'row2', 'row2 part 3']];
testFiring.title = 'test firing chart 1';

describe('firing API', () => {

  before((done) => {
    testUser = new User();
    testUser.email = 'test7@tester.com';
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

    it('should be able to add one firing', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( testFiring )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.title).to.eql('test firing chart 1');
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
          expect(res.body.title).to.eql('test firing chart 1');
          gotFiring = res.body;
          done();
        });
    });
  });

  describe('The getAll for firings', () => {

    before((done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( testFiring )
        .end((err) => {
          if (err) throw err;
          request(baseUri)
            .post('/create')
            .set('token', userToken)
            .send( testFiring )
            .end((err) => {
              if (err) throw err;
              request(baseUri)
                .post('/create')
                .set('token', userToken)
                .send( testFiring )
                .end((err) => {
                  if (err) throw err;
                  done();
                });
            });
        });
    });
    it('should get multiple firings', (done) => {
      request(baseUri)
        .get('/getAll/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body[3].title).to.eql('test firing chart 1');
          done();
        });
    });
  });

  describe('ability to UPDATE and DELETE', () => {
    it('should be able to UPDATE a firing', (done) => {

      gotFiring.title = 'newly updated title';

      request(baseUri)
        .put('/change/' + gotFiring._id)
        .set('token', userToken)
        .send( gotFiring )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully updated firing');
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should be able to DELETE a firing', (done) => {
      request(baseUri)
        .delete('/delete/' + gotFiring._id)
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully deleted firing');
          expect(res).to.have.status(200);
          done();
        });
    });
  });
});
