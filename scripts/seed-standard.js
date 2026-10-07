// Loads the standard materials, additives and advice (data/*.ndjson) into
// MongoDB. Records with the same _id are replaced, and standard records no
// longer in the files (merged or retired) are removed, so it is safe to run
// again after the data files change. Users' own records are not touched, and
// saved recipes keep their own copies of the materials they use.
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
    const collection = mongoose.connection.collection(name);
    const result = await collection.bulkWrite(
      docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }))
    );
    const retired = await collection.deleteMany({ ownedBy: 'Standard', _id: { $nin: docs.map((doc) => doc._id) } });
    console.log(
      `${name}: ${docs.length} standard records (${result.upsertedCount} added, ${result.modifiedCount} updated, ` +
        `${retired.deletedCount} removed)`
    );
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Seeding failed: ' + err.message);
  process.exit(1);
});
