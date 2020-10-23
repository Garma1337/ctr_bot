const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Player = new Schema({
  discordId: String,
  psn: String,
  flag: String,
  region: String,
  languages: [String],
  birthday: String,
  discordVc: Boolean,
  ps4Vc: Boolean,
  nat: String,
  timeZone: String,
  favCharacter: String,
  favTrack: String,
});

module.exports = model('players', Player);
