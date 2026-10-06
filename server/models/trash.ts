import mongoose from 'mongoose';

const trashSchema = new mongoose.Schema({
  content: { type: [mongoose.Schema.Types.Mixed], required: true },
  date: { type: String, required: true },
  fromCollection: { type: String, required: true },
  ownedBy: { type: String, required: true }
});

export default mongoose.model('Trash', trashSchema);
