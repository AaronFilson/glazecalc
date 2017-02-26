process.env.MONGOLAB_URI = 'mongodb://localhost/m_test';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = 'localhost:' + PORT + '/materials';
const User = require(__dirname + '/../models/user');
var userToken;
var testUser;
var gotMaterial;

var testMaterial = {};
testMaterial.fields = ['not really sure how this one is going yet', 4];
testMaterial.notes = ['fake note id 1', 'fake note id 2'];
testMaterial.relatedTo = ['china clay', 'kaolin'];
testMaterial.title = 'porcelain';

describe('materials API', () => {

  before((done) => {
    testUser = new User();
    testUser.email = 'test8@tester.com';
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

    it('should be able to add one material', (done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( { user: testUser, material: testMaterial } )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.title).to.eql('porcelain');
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
          expect(res.body.title).to.eql('porcelain');
          gotMaterial = res.body;
          done();
        });
    });
  });

  describe('The getAll for materials', () => {

    before((done) => {
      request(baseUri)
        .post('/create')
        .set('token', userToken)
        .send( { user: testUser, material: testMaterial } )
        .end((err) => {
          if (err) throw err;
          request(baseUri)
            .post('/create')
            .set('token', userToken)
            .send( { user: testUser, material: testMaterial } )
            .end((err) => {
              if (err) throw err;
              request(baseUri)
                .post('/create')
                .set('token', userToken)
                .send( { user: testUser, material: testMaterial } )
                .end((err) => {
                  if (err) throw err;
                  done();
                });
            });
        });
    });
    it('should get multiple materials', (done) => {
      request(baseUri)
        .get('/getAll/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body[3].title).to.eql('porcelain');
          done();
        });
    });
  });

  describe('ability to UPDATE and DELETE', () => {
    it('should be able to UPDATE a material', (done) => {
      request(baseUri)
        .put('/change/' + gotMaterial._id)
        .set('token', userToken)
        .send({ material: gotMaterial })
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully updated material');
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should be able to DELETE a material', (done) => {
      request(baseUri)
        .delete('/delete/' + gotMaterial._id)
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully deleted material');
          expect(res).to.have.status(200);
          done();
        });
    });
  });
});
