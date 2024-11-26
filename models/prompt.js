const mongoose = require('mongoose');

const PromptSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Prompt', PromptSchema);