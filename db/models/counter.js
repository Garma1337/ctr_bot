const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Counter = new Schema({
  guildId: String,
  discordId: String,
  tickCount: Number,
  tickUpdatedAt: Date,
  pingCount: Number,
  pingUpdatedAt: Date,
});

module.exports.Counter = model('counter', Counter);
