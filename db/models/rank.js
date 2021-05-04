const mongoose = require('mongoose');
const {
  RACE_FFA,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_ITEMLESS_FFA,
  RACE_ITEMLESS_DUOS,
  RACE_ITEMLESS_3V3,
  RACE_ITEMLESS_4V4,
  BATTLE_1V1,
  BATTLE_FFA,
  BATTLE_DUOS,
  BATTLE_3V3,
  BATTLE_4V4,
  BATTLE_SURVIVAL,
} = require('./lobby');

const { Schema, model } = mongoose;

const Rank = new Schema({
  name: String,
  [RACE_FFA]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_DUOS]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_3V3]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_4V4]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_SURVIVAL]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_ITEMLESS_FFA]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_ITEMLESS_DUOS]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_ITEMLESS_3V3]: { rank: Number, position: Number, lastActivity: Number },
  [RACE_ITEMLESS_4V4]: { rank: Number, position: Number, lastActivity: Number },
  [BATTLE_1V1]: { rank: Number, position: Number, lastActivity: Number },
  [BATTLE_FFA]: { rank: Number, position: Number, lastActivity: Number },
  [BATTLE_DUOS]: { rank: Number, position: Number, lastActivity: Number },
  [BATTLE_3V3]: { rank: Number, position: Number, lastActivity: Number },
  [BATTLE_4V4]: { rank: Number, position: Number, lastActivity: Number },
  [BATTLE_SURVIVAL]: { rank: Number, position: Number, lastActivity: Number },
});

module.exports.Rank = model('rank', Rank);
