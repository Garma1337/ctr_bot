const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const SignupsChannel = new Schema({
  guild: String,
  channel: String,
  parser: String,
  message: String,
  open: Date,
  close: Date,
});

module.exports.SignupsChannel = model('signups_channel', SignupsChannel);
