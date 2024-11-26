const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  responseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Response', required: true },
  score: { type: Number, required: true },
  comments: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
