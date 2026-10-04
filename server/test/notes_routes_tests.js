process.env.MONGOLAB_URI = 'mongodb://127.0.0.1/n_test';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = '127.0.0.1:' + PORT + '/notes';
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
    testUser.save().then( (data) => {
      if (!data) throw "err";
      testUser.token = userToken = data.generateToken();
      done();
    });
  });

  after((done) => {
    mongoose.connection.dropDatabase().then(() => {
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

  describe('Send a bad post request intentionally', () => {
    var noteTestBad = null;
    it('and it should handle create error without crashing', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( noteTestBad )
        .end((err, msg) => {
          expect(msg.status).to.eql(400);
          expect(msg.body.msg).to.eql('Missing required information');
          done();
        });
    });

    it('and it should handle error without crashing a second time', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( { trashdata: 'not anything good' } )
        .end((err, msg) => {
          expect(msg.body.msg).to.eql('Missing required information');
          done();
        });
    });
  });
});
