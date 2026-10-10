const fs = require('fs');
const mongoose = require('mongoose');
const standardData = require('../data');

// Resets the end-to-end database and loads the standard materials, additives
// and advice from the same data files the production seed uses.
module.exports = async () => {
  const uri = process.env.E2E_MONGO_URI;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (e) {
    throw new Error('Could not reach MongoDB at ' + uri + '. Start mongod before running the e2e tests.', { cause: e });
  }
  // Empties each collection rather than dropping the database: Playwright starts
  // the server before this runs, and the indexes it built (the unique email
  // among them) must stay for the whole run.
  for (const collection of await mongoose.connection.db.collections()) {
    if (!collection.collectionName.startsWith('system.')) await collection.deleteMany({});
  }
  fs.rmSync(process.env.E2E_MAIL_DIR, { recursive: true, force: true });
  for (const name of standardData.COLLECTIONS) {
    await mongoose.connection.collection(name).insertMany(standardData.load(name));
  }
  await mongoose.disconnect();
};
