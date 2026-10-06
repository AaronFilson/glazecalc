process.env.MONGOLAB_URI = 'mongodb://127.0.0.1:27017/input_test';
require(__dirname + '/../../server.js');
const mongoose = require('mongoose');
const chai = require('chai');
const { default: chaiHttp, request: chaiRequest } = require('chai-http');
chai.use(chaiHttp);
const expect = chai.expect;
const User = require(__dirname + '/../models/user');
const chemistry = require(__dirname + '/../../lib/chemistry');

const PORT = process.env.PORT || 3000;
const api = () => chaiRequest.execute('localhost:' + PORT + '/api');
const NOT_VALID = 'Some of the information sent is not valid.';

// Mistakes in what a client sends are 400s with a message, not server errors.
describe('requests with values of the wrong type', () => {
  let user;
  let token;

  before(async () => {
    await mongoose.connection.asPromise();
    user = new User({ email: 'input' + Date.now() + '@tester.com' });
    user.hashPassword('password123');
    await user.save();
    token = user.generateToken();
  });
  after(() => mongoose.connection.dropDatabase());

  it('answers 400 for an additive whose name is an object', async () => {
    const res = await api().post('/additives/create').set('token', token).send({ name: { a: 1 }, fields: [1] });
    expect(res).to.have.status(400);
    expect(res.body.msg).to.eql(NOT_VALID);
  });

  it('answers 400 for a material whose numbers are words', async () => {
    const res = await api().post('/materials/create').set('token', token).send({
      name: 'Odd', fields: [{ SiO2: 1 }], formulaweight: 'abc', loi: 0, molecularweight: 60,
      percentmole: 'mole', equivalent: 60
    });
    expect(res).to.have.status(400);
    expect(res.body.msg).to.eql(NOT_VALID);
  });

  it('answers 400 for account settings of the wrong type', async () => {
    for (const body of [{ displayname: { a: 1 } }, { settings: { $gt: 1 } }]) {
      const res = await api().put('/usersettings/' + user._id).set('token', token).send(body);
      expect(res).to.have.status(400);
      expect(res.body.msg).to.eql(NOT_VALID);
    }
  });

  it('answers 400 when there is nothing to update', async () => {
    const res = await api().put('/usersettings/' + user._id).set('token', token).send({});
    expect(res).to.have.status(400);
    expect(res.body.msg).to.eql('Nothing to update');
  });
});

describe('material names that match built-in object properties', () => {
  it('reports them as unknown materials', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(() => chemistry.calculateUMF([{ material: name, amount: 10 }, { material: 'Whiting', amount: 5 }]))
        .to.throw('Unknown material ' + name);
    }
  });
});
