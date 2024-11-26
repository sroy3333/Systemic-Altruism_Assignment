const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', required: true },
  text: { type: String, required: true },
  question: { type: String, required: true },
  studentAnswer: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Response', ResponseSchema);