process.env.MONGOLAB_URI = 'mongodb://localhost/r_test';
require(__dirname + '/../../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = chai.request;
const mongoose = require('mongoose');
var PORT = process.env.PORT || 4000;
var baseUri = 'localhost:' + PORT + '/recipe';
const User = require(__dirname + '/../models/user');
var userToken;
var testUser;
var gotRecipe;

describe('recipe API', () => {

  before((done) => {
    testUser = new User();
    testUser.email = 'test5@tester.com';
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
    var testRecipe = {};
    testRecipe.materials = { 'silica': 40, 'custer': 30, 'whiting': 20, 'epk': 10, 'RIO': 4.5 };
    testRecipe.title = 'Leach Celadon 4.5';
    it('should be able to add one recipe', (done) => {
      request(baseUri)
        .post('/newRecipe')
        .set('token', userToken)
        .send( { user: testUser, recipe: testRecipe } )
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body.title).to.eql('Leach Celadon 4.5');
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
          expect(res.body.title).to.eql('Leach Celadon 4.5');
          gotRecipe = res.body;
          done();
        });
    });
  });

  describe('The getAll for recipes', () => {
    var testRecipe = {};
    testRecipe.materials = { 'silica': 40, 'custer': 30, 'whiting': 20, 'epk': 10, 'RIO': 4.5 };
    testRecipe.title = 'Leach Celadon 4.5';

    before((done) => {
      request(baseUri)
        .post('/newRecipe')
        .set('token', userToken)
        .send( { user: testUser, recipe: testRecipe } )
        .end((err) => {
          if (err) throw err;
          request(baseUri)
            .post('/newRecipe')
            .set('token', userToken)
            .send( { user: testUser, recipe: testRecipe } )
            .end((err) => {
              if (err) throw err;
              request(baseUri)
                .post('/newRecipe')
                .set('token', userToken)
                .send( { user: testUser, recipe: testRecipe } )
                .end((err) => {
                  if (err) throw err;
                  done();
                });
            });
        });
    });
    it('should get multiple recipes', (done) => {
      request(baseUri)
        .get('/getAll/')
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body).to.not.eql(null);
          expect(res.body[3].title).to.eql('Leach Celadon 4.5');
          done();
        });
    });
  });

  describe('ability to UPDATE and DELETE', () => {
    it('should be able to UPDATE a recipe', (done) => {
      request(baseUri)
        .put('/change/' + gotRecipe._id)
        .set('token', userToken)
        .send({ recipe: gotRecipe })
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully updated recipe');
          expect(res).to.have.status(200);
          done();
        });
    });

    it('should be able to DELETE a recipe', (done) => {
      request(baseUri)
        .delete('/delete/' + gotRecipe._id)
        .set('token', userToken)
        .end((err, res) => {
          expect(err).to.eql(null);
          expect(res.body.msg).to.eql('Successfully deleted recipe');
          expect(res).to.have.status(200);
          done();
        });
    });
  });
});
