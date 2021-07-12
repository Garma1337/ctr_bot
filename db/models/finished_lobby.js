const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const FinishedLobby = new Schema({
  type: String,
  trackOption: String,
  ruleset: Number,
  regions: { type: [String], default: null },
  engineRestriction: { type: String, default: null },
  survivalStyle: { type: Number, default: null },
  tournament: Boolean,
  ranked: Boolean,
});

module.exports.FinishedLobby = model('finishedLobby', FinishedLobby);
