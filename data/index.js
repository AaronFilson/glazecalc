// The standard materials, additives and advice every installation starts with.
// The materials and additives are the catalog's (lib/catalog/standard.ts, its
// data/ folder); the advice is Glazecalc's, here. Each file holds one document
// per line (NDJSON), its ids as MongoDB Extended JSON writes them, which come
// back as real ObjectIds. The file names match the collections Mongoose uses
// for the models.
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongoose').mongo.BSON;
const { STANDARD_COLLECTIONS, standardFile, readRecords } = require('../lib/catalog/standard.ts');

exports.COLLECTIONS = [...STANDARD_COLLECTIONS, 'advice'];

/** Where one collection's standard records are. */
exports.fileOf = (collection) =>
  STANDARD_COLLECTIONS.includes(collection)
    ? path.join(__dirname, '..', 'lib', 'catalog', standardFile(collection))
    : path.join(__dirname, collection + '.ndjson');

/** The standard documents for one collection. */
exports.load = (collection) =>
  readRecords(fs.readFileSync(exports.fileOf(collection), 'utf8'), (hex) => new ObjectId(hex));
