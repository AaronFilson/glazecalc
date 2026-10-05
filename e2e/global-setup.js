const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Resets the end-to-end database and loads the standard materials, additives
// and advice from the same data files the production seed uses.
module.exports = async () => {
  const uri = process.env.E2E_MONGO_URI;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (e) {
    throw new Error('Could not reach MongoDB at ' + uri + '. Start mongod before running the e2e tests.', { cause: e });
  }
  const EJSON = mongoose.mongo.BSON.EJSON;
  await mongoose.connection.dropDatabase();
  fs.rmSync(process.env.E2E_MAIL_DIR, { recursive: true, force: true });
  for (const name of ['materials', 'additives', 'advice']) {
    const docs = fs.readFileSync(path.join(__dirname, '..', name + '.json'), 'utf8')
      .split(/\r?\n/).filter(Boolean).map((line) => EJSON.parse(line));
    await mongoose.connection.collection(name).insertMany(docs);
  }
  await mongoose.disconnect();
};
