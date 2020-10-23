const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const ITEMS = 'items';
const ITEMLESS = 'itemless';
const DUOS = 'duos';
const BATTLE = 'battle';
const _4V4 = '4v4';

module.exports.ITEMS = ITEMS;
module.exports.ITEMLESS = ITEMLESS;
module.exports.DUOS = DUOS;
module.exports.BATTLE = BATTLE;
module.exports._4V4 = _4V4;

const RankedLobby = new Schema({
  date: { type: Date, default: Date.now },
  guild: String,
  channel: String,
  message: String,
  creator: String,
  pools: { type: Boolean, default: true },
  started: { type: Boolean, default: false },
  startedAt: { type: Date, default: null },
  closed: { type: Boolean, default: false },
  players: [String],
  locked: { rank: Number, shift: Number },
  region: String,
  teamList: Array,
  type: { type: String, enum: [ITEMS, ITEMLESS, DUOS, BATTLE, _4V4] },
});

RankedLobby.methods = {
  isItems() { return this.type === ITEMS; },
  isItemless() { return this.type === ITEMLESS; },
  isDuos() { return this.type === DUOS; },
  isBattle() { return this.type === BATTLE; },
  is4v4() { return this.type === _4V4; },
  isTeams() { return [DUOS, _4V4].includes(this.type); },
};

module.exports.default = model('ranked_lobbies', RankedLobby);
