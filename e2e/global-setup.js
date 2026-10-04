const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Resets the end-to-end database and loads the standard materials and
// additives the way mongoimport would.
module.exports = async () => {
  const uri = process.env.E2E_MONGO_URI;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (e) {
    throw new Error('Could not reach MongoDB at ' + uri + '. Start mongod before running the e2e tests.');
  }
  const EJSON = mongoose.mongo.BSON.EJSON;
  await mongoose.connection.dropDatabase();
  for (const name of ['materials', 'additives']) {
    const docs = fs.readFileSync(path.join(__dirname, '..', name + '.json'), 'utf8')
      .split(/\r?\n/).filter(Boolean).map((line) => EJSON.parse(line));
    await mongoose.connection.collection(name).insertMany(docs);
  }
  // There is no standard advice data file yet; one record lets the advice page show its general list.
  await mongoose.connection.collection('advice').insertOne({
    title: 'Sieve your glazes', content: 'Pass mixed glaze through an 80 mesh sieve.', tags: ['mixing'], ownedBy: 'Standard'
  });
  await mongoose.disconnect();
};
