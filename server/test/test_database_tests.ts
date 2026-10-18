import { assertTestDatabase, databaseName } from '../../scripts/test-database.js';
import { expect } from './support/app.ts';

// The tests empty their database, so they refuse one not named for tests
// (scripts/test-database.js): a production or staging address given by mistake.
describe('the tests’ database guard', () => {
  it('reads the database from an address', () => {
    expect(databaseName('mongodb://127.0.0.1/glazecalc_test')).to.equal('glazecalc_test');
    expect(databaseName('mongodb://u:p@a:1,b:2/glazecalc_e2e?authSource=admin')).to.equal('glazecalc_e2e');
    expect(databaseName('mongodb+srv://cluster.example/glazecalc')).to.equal('glazecalc');
    expect(databaseName('mongodb://127.0.0.1')).to.equal('');
    expect(databaseName('mongodb://127.0.0.1/?replicaSet=rs')).to.equal('');
  });

  it('allows the names the tests, scripts and CI use', () => {
    for (const name of [
      'glazecalc_test',
      'glazecalc_test_w0',
      'glazecalc_test_r3_w11',
      'glazecalc_test_w3tx_w2',
      'glazecalc_test_w3ts_e2e',
      'glazecalc_e2e',
      'glazecalc_e2e_w3cv',
      'glazecalc_e2e_us'
    ]) {
      expect(() => assertTestDatabase('mongodb://127.0.0.1/' + name, 'TEST_MONGODB_URI'), name).not.to.throw();
    }
  });

  it('refuses any other database, and an address with none', () => {
    for (const uri of [
      'mongodb://127.0.0.1/glazecalc',
      'mongodb://127.0.0.1/glazecalc_staging',
      'mongodb://127.0.0.1/glazecalc_app_dev',
      'mongodb://127.0.0.1/glazecalc_tests',
      'mongodb://127.0.0.1/latest',
      'mongodb://glazecalc:secret@mongo:27017/glazecalc?authSource=glazecalc',
      'mongodb://127.0.0.1',
      ''
    ]) {
      expect(() => assertTestDatabase(uri, 'E2E_MONGO_URI'), uri).to.throw(
        /Refusing to run the tests.*\(E2E_MONGO_URI\)/
      );
    }
  });

  it('does not repeat the address, which can hold a password', () => {
    const refuse = () => assertTestDatabase('mongodb://glazecalc:secret@mongo/glazecalc', 'TEST_MONGODB_URI');
    expect(refuse).to.throw(/"glazecalc"/);
    expect(refuse).to.throw().with.property('message').that.does.not.include('secret');
  });
});
