// Loads the standard materials, additives and advice (data/*.ndjson) into
// MongoDB. Records with the same _id are replaced, so it is safe to run again
// after the data files change; users' own records are not touched.
//
//   npm run seed                                      uses MONGODB_URI or the local dev database
//   docker compose run --rm app node scripts/seed-standard.js
const mongoose = require('mongoose');
const standardData = require('../data');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1/glazecalc_app_dev';

(async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  for (const name of standardData.COLLECTIONS) {
    const docs = standardData.load(name);
    const result = await mongoose.connection
      .collection(name)
      .bulkWrite(docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })));
    console.log(
      `${name}: ${docs.length} standard records (${result.upsertedCount} added, ${result.modifiedCount} updated)`
    );
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Seeding failed: ' + err.message);
  process.exit(1);
});
