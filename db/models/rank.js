const mongoose = require('mongoose');
const {
  RACE_FFA,
  RACE_ITEMLESS,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_ITEMLESS_DUOS,
  BATTLE_FFA,
  BATTLE_4V4,
} = require('./ranked_lobby');

const { Schema, model } = mongoose;

const Rank = new Schema({
  name: String,
  [RACE_FFA]: { rank: Number, position: Number },
  [RACE_ITEMLESS]: { rank: Number, position: Number },
  [RACE_DUOS]: { rank: Number, position: Number },
  [RACE_3V3]: { rank: Number, position: Number },
  [RACE_4V4]: { rank: Number, position: Number },
  [RACE_SURVIVAL]: { rank: Number, position: Number },
  [RACE_ITEMLESS_DUOS]: { rank: Number, position: Number },
  [BATTLE_FFA]: { rank: Number, position: Number },
  [BATTLE_4V4]: { rank: Number, position: Number },
});

module.exports.Rank = model('rank', Rank);
