process.env.MONGOLAB_URI = 'mongodb://localhost/n_test';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = 'localhost:' + PORT + '/notes';
const User = require(__dirname + '/../models/user');
var userToken;
var testUser;
var gotNote;

var testNote = {};
testNote.content = 'This is a note for testing.';
testNote.relatedCollection = 'This will tell the note what field or section to attach to.';
testNote.relatedId = '7';

describe('Notes API', () => {

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

    it('should be able to add one note', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( testNote )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.relatedId).to.eql('7');
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
          expect(res.body.relatedId).to.eql('7');
          gotNote = res.body;
          done();
        });
    });
  });

  describe('The getAll for notes', () => {

    before((done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( testNote )
        .end((err) => {
          if (err) throw err;
          request(baseUri)
            .post('/create')
            .set('token', userToken)
            .send( testNote )
            .end((err) => {
              if (err) throw err;
              request(baseUri)
                .post('/create')
                .set('token', userToken)
                .send( testNote )
                .end((err) => {
                  if (err) throw err;
                  done();
                });
            });
        });
    });
    it('should get multiple notes', (done) => {
      request(baseUri)
        .get('/getAll/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body[3].relatedId).to.eql('7');
          done();
        });
    });
  });

  describe('ability to UPDATE and DELETE', () => {
    it('should be able to UPDATE a note', (done) => {
      request(baseUri)
        .put('/change/' + gotNote._id)
        .set('token', userToken)
        .send( gotNote )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully updated note');
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should be able to DELETE a note', (done) => {
      request(baseUri)
        .delete('/delete/' + gotNote._id)
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully deleted note');
          expect(res).to.have.status(200);
          done();
        });
    });
  });
});
