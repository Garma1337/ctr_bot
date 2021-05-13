const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const FinishedLobby = new Schema({
  type: String,
  trackOption: String,
  ruleset: Number,
  region: { type: String, default: null },
  engineRestriction: { type: String, default: null },
  survivalStyle: { type: Number, default: null },
  tournament: Boolean,
});

module.exports.FinishedLobby = model('finishedLobby', FinishedLobby);
