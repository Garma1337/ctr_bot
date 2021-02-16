const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const ScheduledMessage = new Schema({
  date: Date,
  guild: String,
  channel: String,
  message: String,
  sent: { type: Boolean, default: false },
});

module.exports.ScheduledMessage = model('scheduled_message', ScheduledMessage);
