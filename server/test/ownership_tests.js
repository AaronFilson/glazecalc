process.env.MONGOLAB_URI = 'mongodb://localhost/r_test';
require(__dirname + '/../../server');
const chai = require('chai');
const { default: chaiHttp, request: chaiRequest } = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const request = (url) => chaiRequest.execute(url);
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const appSecret = require(__dirname + '/../lib/app_secret');
const User = require(__dirname + '/../models/user');
const Note = require(__dirname + '/../models/note');
const Firing = require(__dirname + '/../models/firing');
var PORT = process.env.PORT || 3000;
var baseUri = 'localhost:' + PORT + '/api';

const makeUser = (address, role) => {
  var user = new User({ email: address, role: role });
  user.hashPassword('password123');
  return user.save();
};
const basic = (address, password) => 'Basic ' + Buffer.from(address + ':' + password).toString('base64');

describe('record ownership and input checks', () => {
  var alice, bob, aliceToken, bobToken, adminToken, aliceNote;

  before(() => Promise.all([
    makeUser('alice@owner.com'), makeUser('bob@owner.com'), makeUser('admin@owner.com', 'admin')
  ]).then((users) => {
    [alice, bob] = users;
    [aliceToken, bobToken, adminToken] = users.map((u) => u.generateToken());
    return request(baseUri).post('/notes/create').set('token', aliceToken)
      .send({ title: 'Mine', content: 'alice only', relatedCollection: 'Notes', relatedId: 'general notes' });
  }).then((res) => aliceNote = res.body));

  after(() => mongoose.connection.dropDatabase());

  describe('change routes', () => {
    it('cannot rewrite ownedBy to publish into the standard library', () => {
      return request(baseUri).put('/notes/change/' + aliceNote._id).set('token', aliceToken)
        .send({ content: 'edited', ownedBy: 'Standard' })
        .then((res) => {
          expect(res).to.have.status(200);
          return Note.findById(aliceNote._id);
        })
        .then((note) => {
          expect(note.ownedBy).to.eql(String(alice._id));
          expect(note.content).to.eql('edited');
        });
    });

    it('does not let another user change or delete a record', () => {
      return request(baseUri).put('/notes/change/' + aliceNote._id).set('token', bobToken)
        .send({ content: 'bob was here' })
        .then((res) => {
          expect(res).to.have.status(404);
          return request(baseUri).delete('/notes/delete/' + aliceNote._id).set('token', bobToken);
        })
        .then((res) => {
          expect(res).to.have.status(404);
          return Note.findById(aliceNote._id);
        })
        .then((note) => expect(note.content).to.eql('edited'));
    });

    it('refuses an empty body instead of erasing the record', () => {
      return request(baseUri).put('/notes/change/' + aliceNote._id).set('token', aliceToken).send({})
        .then((res) => {
          expect(res).to.have.status(400);
          return Note.findById(aliceNote._id);
        })
        .then((note) => expect(note.content).to.eql('edited'));
    });

    it('refuses to blank out a required field', () => {
      return request(baseUri).put('/notes/change/' + aliceNote._id).set('token', aliceToken).send({ content: '' })
        .then((res) => expect(res).to.have.status(400));
    });

    it('answers not found for an id that does not exist', () => {
      return request(baseUri).put('/notes/change/000000000000000000000000').set('token', aliceToken)
        .send({ content: 'x' })
        .then((res) => expect(res).to.have.status(404));
    });

    it('refuses a wrapped route without its wrapper object', () => {
      return request(baseUri).put('/recipe/change/000000000000000000000000').set('token', aliceToken)
        .send({ title: 'not wrapped' })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.msg).to.eql('Missing required information');
        });
    });
  });

  describe('getLatest and getStandard', () => {
    it('returns the newest record', () => {
      return Firing.create([
        { title: 'first', fieldsIncluded: ['Time'], rows: [], ownedBy: String(bob._id) },
        { title: 'second', fieldsIncluded: ['Time'], rows: [], ownedBy: String(bob._id) }
      ]).then(() => request(baseUri).get('/firing/getLatest').set('token', bobToken))
        .then((res) => expect(res.body.title).to.eql('second'));
    });

    it('lists standard additives and advice', () => {
      return Promise.all(['/additives/getStandard', '/advice/getStandard'].map((path) =>
        request(baseUri).get(path).set('token', aliceToken).then((res) => {
          expect(res, path).to.have.status(200);
          expect(res.body, path).to.be.an('array');
        })));
    });
  });

  describe('sign up and sign in', () => {
    it('rejects an email that is not text', () => {
      return request(baseUri).post('/signup').send({ email: { $ne: null }, password: 'password123' })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.msg).to.eql('Please enter an email');
        });
    });

    it('treats emails without regard to case or spaces', () => {
      return request(baseUri).post('/signup').send({ email: ' ALICE@Owner.com ', password: 'password123' })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body.msg).to.contain('already exists');
          return request(baseUri).get('/signin').set('Authorization', basic('Alice@OWNER.com', 'password123'));
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res.body.email).to.eql('alice@owner.com');
        });
    });

    it('signs in with a password containing colons', () => {
      return request(baseUri).post('/signup').send({ email: 'colon@owner.com', password: 'pass:word:123' })
        .then(() => request(baseUri).get('/signin').set('Authorization', basic('colon@owner.com', 'pass:word:123')))
        .then((res) => expect(res).to.have.status(200));
    });

    it('refuses an unknown email and a malformed header', () => {
      return request(baseUri).get('/signin').set('Authorization', basic('nobody@owner.com', 'password123'))
        .then((res) => {
          expect(res).to.have.status(401);
          return request(baseUri).get('/signin').set('Authorization', 'Basic !!!notbase64');
        })
        .then((res) => expect(res).to.have.status(401));
    });

    it('refuses expired tokens and tokens signed with another secret', () => {
      var expired = jwt.sign({ id: alice._id, exp: Math.floor(Date.now() / 1000) - 60 }, appSecret);
      var forged = jwt.sign({ id: alice._id }, 'not-the-secret');
      return Promise.all([expired, forged].map((token) =>
        request(baseUri).get('/notes/getAll').set('token', token)
          .then((res) => expect(res).to.have.status(401))));
    });
  });

  describe('accounts', () => {
    it('lets an admin change another account', () => {
      return request(baseUri).put('/usersettings/' + bob._id).set('token', adminToken).send({ displayname: 'Bobby' })
        .then((res) => {
          expect(res).to.have.status(200);
          return User.findById(bob._id);
        })
        .then((user) => expect(user.displayname).to.eql('Bobby'));
    });

    it('rejects a non-text email in settings', () => {
      return request(baseUri).put('/usersettings/' + bob._id).set('token', bobToken).send({ email: { $gt: '' } })
        .then((res) => expect(res).to.have.status(400));
    });

    it('removes an account together with its records', () => {
      return request(baseUri).delete('/deleteuser/' + bob._id).set('token', adminToken)
        .then((res) => {
          expect(res).to.have.status(200);
          return Firing.countDocuments({ ownedBy: String(bob._id) });
        })
        .then((count) => expect(count).to.eql(0));
    });
  });

  describe('malformed requests', () => {
    it('answers bad JSON with a short JSON error, not a stack trace', () => {
      return request(baseUri).post('/signup').set('Content-Type', 'application/json').send('{bad')
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.eql({ msg: 'Bad request' });
        });
    });
  });
});
