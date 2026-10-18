/** Names of databases the tests may empty: glazecalc_test, glazecalc_e2e and the like. */
export const TEST_NAME: RegExp;
/** The database named in a MongoDB address ('' when it names none). */
export function databaseName(uri: string | undefined): string;
/** Throws unless the address names a database for tests; `setting` says where it came from. */
export function assertTestDatabase(uri: string | undefined, setting: string): void;
