const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const Team = new Schema({
  guild: String,
  players: [String],
  date: Date,
});

module.exports.Team = model('team', Team);
