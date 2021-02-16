const mongoose = require('mongoose');
const { consoles } = require('../consoles');

const { Schema, model } = mongoose;
const consoleTags = consoles.map((c) => c.tag);

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
  consoles: { type: [String], enum: consoleTags },
  translation: String,
});

module.exports = model('players', Player);
