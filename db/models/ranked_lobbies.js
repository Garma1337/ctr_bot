const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const ITEMS = 'items';
const ITEMLESS = 'itemless';
const DUOS = 'duos';
const _3V3 = '3v3';
const _4V4 = '4v4';
const BATTLE = 'battle';

module.exports.ITEMS = ITEMS;
module.exports.ITEMLESS = ITEMLESS;
module.exports.DUOS = DUOS;
module.exports._3V3 = _3V3;
module.exports._4V4 = _4V4;
module.exports.BATTLE = BATTLE;

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
  type: { type: String, enum: [ITEMS, ITEMLESS, DUOS, _3V3, _4V4, BATTLE] },
  allowPremadeTeams: { type: Boolean, default: true },
  draftTracks: { type: Boolean, default: false },
  spicyTracks: { type: Boolean, default: false },
});

RankedLobby.methods = {
  isItems() { return this.type === ITEMS; },
  isItemless() { return this.type === ITEMLESS; },
  isDuos() { return this.type === DUOS; },
  is3v3() { return this.type === _3V3; },
  is4v4() { return this.type === _4V4; },
  isBattle() { return this.type === BATTLE; },
  isTeams() { return [DUOS, _3V3, _4V4].includes(this.type); },
  isWar() { return [_3V3, _4V4].includes(this.type); },
  getMinimumRequiredPlayers() {
    const requirements = {
      [ITEMS]: 6,
      [ITEMLESS]: 4,
      [DUOS]: 6,
      [_3V3]: 6,
      [_4V4]: 8,
      [BATTLE]: 4,
    };

    return requirements[this.type];
  },
  hasMinimumRequiredPlayers() { return this.players.length >= this.getMinimumRequiredPlayers(); },
};

module.exports.default = model('ranked_lobbies', RankedLobby);
