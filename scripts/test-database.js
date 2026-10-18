// The tests empty or drop their database (server/test/support/app.ts,
// e2e/global-setup.js), so they refuse one whose name does not say it is for
// tests: test or e2e as a word of its own between underscores, as in
// glazecalc_test, glazecalc_test_w0 and glazecalc_e2e. A mistyped or copied
// address (glazecalc, glazecalc_staging) then fails at once and loses nothing.

const TEST_NAME = /(^|_)(test|e2e)(_|$)/;

/** The database named in a MongoDB address ('' when it names none). */
const databaseName = (uri) => {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]*\/?([^?]*)/.exec(uri || '');
  return match ? decodeURIComponent(match[1]) : '';
};

/** Throws unless the address names a database for tests. */
const assertTestDatabase = (uri, setting) => {
  const name = databaseName(uri);
  if (TEST_NAME.test(name)) return;
  throw new Error(
    `Refusing to run the tests on ${name ? `the database "${name}"` : 'an address that names no database'}` +
      ` (${setting}): they empty it. Use one whose name has test or e2e in it as a word of its own,` +
      ' such as glazecalc_test or glazecalc_e2e.'
  );
};

module.exports = { TEST_NAME, databaseName, assertTestDatabase };
