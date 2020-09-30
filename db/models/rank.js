const mongoose = require('mongoose');
const {
  _4V4, BATTLE, DUOS, ITEMLESS, ITEMS,
} = require('./ranked_lobbies');

const { Schema, model } = mongoose;

const Rank = new Schema({
  name: String,
  [ITEMS]: { rank: Number, position: Number },
  [ITEMLESS]: { rank: Number, position: Number },
  [DUOS]: { rank: Number, position: Number },
  [BATTLE]: { rank: Number, position: Number },
  [_4V4]: { rank: Number, position: Number },
});

module.exports = model('ranks', Rank);
