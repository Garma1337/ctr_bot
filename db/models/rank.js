const mongoose = require('mongoose');
const {
  RACE_FFA,
  RACE_SURVIVAL,
  RACE_ITEMLESS_FFA,
  BATTLE_FFA,
} = require('./lobby');

const { Schema, model } = mongoose;

const Rank = new Schema({
  name: String,
  [RACE_FFA]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_SURVIVAL]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_ITEMLESS_FFA]: { rank: Number, position: Number, lastActivity: Number },
  [BATTLE_FFA]: { rank: Number, position: Number, lastActivity: Number },
});

module.exports.Rank = model('rank', Rank);
