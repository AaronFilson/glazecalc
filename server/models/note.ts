import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  ownedBy: { type: String, required: true },
  relatedCollection: { type: String, required: true },
  relatedId: { type: String, required: true },
  title: String
});

export default mongoose.model('Note', noteSchema);
