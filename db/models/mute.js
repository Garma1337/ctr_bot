const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Mute = new Schema({
  guildId: String,
  discordId: String,
  mutedAt: Date,
  mutedTill: Date,
});

module.exports.Mute = model('mute', Mute);
