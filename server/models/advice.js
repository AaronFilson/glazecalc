const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var adviceSchema = new mongoose.Schema({
  content: { type: String, required: true },
  ownedBy: { type: String, required: true },
  tags: { type: [String], required: true },
  title: { type: String, required: true }
});

module.exports = mongoose.model('Advice', adviceSchema);
