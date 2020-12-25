const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const CommandUsage = new Schema({
  name: String,
  args: [String],
  discordId: String,
  date: Date,
});

module.exports = model('command_usage', CommandUsage);
