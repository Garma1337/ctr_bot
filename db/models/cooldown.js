const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Cooldown = new Schema({
  guildId: String,
  discordId: String,
  name: String,
  count: Number,
  updatedAt: Date,
});

module.exports.Cooldown = model('cooldown', Cooldown);
