process.env.MONGOLAB_URI = 'mongodb://localhost/t_test';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = 'localhost:' + PORT + '/trash';
const User = require(__dirname + '/../models/user');
var userToken;
var testUser;
var gotTrash;

var testTrash = {};
testTrash.content = ['Trash info here.'];
testTrash.date = '1/1/2017';
testTrash.fromCollection = 'test collection: i.e. advice';

describe('Trash API', () => {

  before((done) => {
    testUser = new User();
    testUser.email = 'test10@tester.com';
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

    it('should be able to add one trash', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( { user: testUser, trash: testTrash } )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.content).to.eql(['Trash info here.']);
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
          expect(res.body.content).to.eql(['Trash info here.']);
          gotTrash = res.body;
          done();
        });
    });
  });

  describe('The getAll for trashes', () => {

    before((done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( { user: testUser, trash: testTrash } )
        .end((err) => {
          if (err) throw err;
          request(baseUri)
            .post('/create')
            .set('token', userToken)
            .send( { user: testUser, trash: testTrash } )
            .end((err) => {
              if (err) throw err;
              request(baseUri)
                .post('/create')
                .set('token', userToken)
                .send( { user: testUser, trash: testTrash } )
                .end((err) => {
                  if (err) throw err;
                  done();
                });
            });
        });
    });
    it('should get multiple trashes', (done) => {
      request(baseUri)
        .get('/getAll/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body[3].content).to.eql(['Trash info here.']);
          done();
        });
    });
  });

  describe('ability to UPDATE and DELETE', () => {
    it('should be able to UPDATE a trash', (done) => {
      request(baseUri)
        .put('/change/' + gotTrash._id)
        .set('token', userToken)
        .send({ trash: gotTrash })
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully updated trash');
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should be able to DELETE a trash', (done) => {
      request(baseUri)
        .delete('/delete/' + gotTrash._id)
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully deleted trash');
          expect(res).to.have.status(200);
          done();
        });
    });
  });
});
