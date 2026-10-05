// Loads the standard materials, additives and advice (materials.json,
// additives.json, advice.json, one JSON document per line) into MongoDB. Records with the same _id are
// replaced, so it is safe to run again after the data files change; users'
// own records are not touched.
//
//   npm run seed                                      uses MONGOLAB_URI or the local dev database
//   docker compose run --rm app node scripts/seed-standard.js
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const uri = process.env.MONGOLAB_URI || 'mongodb://127.0.0.1/glazecalc_app_dev';

(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const { EJSON } = mongoose.mongo.BSON;
  // The file names match the collection names Mongoose uses for the models.
  for (const name of ['materials', 'additives', 'advice']) {
    const docs = fs.readFileSync(path.join(__dirname, '..', name + '.json'), 'utf8')
      .split(/\r?\n/).filter(Boolean).map((line) => EJSON.parse(line));
    const result = await mongoose.connection.collection(name).bulkWrite(
      docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })));
    console.log(name + ': ' + docs.length + ' standard records (' + result.upsertedCount + ' added, ' +
      result.modifiedCount + ' updated)');
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Seeding failed: ' + err.message);
  process.exit(1);
});
