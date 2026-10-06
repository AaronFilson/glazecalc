import mongoose from 'mongoose';

const adviceSchema = new mongoose.Schema({
  content: { type: String, required: true },
  ownedBy: { type: String, required: true },
  tags: { type: [String], required: true },
  title: { type: String, required: true }
});

export default mongoose.model('Advice', adviceSchema);
