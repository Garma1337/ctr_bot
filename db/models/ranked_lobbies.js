const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const RACE_FFA = 'race_ffa';
const RACE_ITEMLESS = 'race_itemless';
const RACE_DUOS = 'race_duos';
const RACE_3V3 = 'race_3v3';
const RACE_4V4 = 'race_4v4';
const RACE_SURVIVAL = 'race_survival';
const RACE_ITEMLESS_DUOS = 'race_itemless_duos';
const BATTLE_FFA = 'battle_ffa';
const BATTLE_4V4 = 'battle_4v4';

module.exports.RACE_FFA = RACE_FFA;
module.exports.RACE_ITEMLESS = RACE_ITEMLESS;
module.exports.RACE_DUOS = RACE_DUOS;
module.exports.RACE_3V3 = RACE_3V3;
module.exports.RACE_4V4 = RACE_4V4;
module.exports.RACE_SURVIVAL = RACE_SURVIVAL;
module.exports.RACE_ITEMLESS_DUOS = RACE_ITEMLESS_DUOS;
module.exports.BATTLE_FFA = BATTLE_FFA;
module.exports.BATTLE_4V4 = BATTLE_4V4;

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
  type: { type: String, enum: [RACE_FFA, RACE_ITEMLESS, RACE_DUOS, RACE_3V3, RACE_4V4, RACE_SURVIVAL, RACE_ITEMLESS_DUOS, BATTLE_FFA, BATTLE_4V4] },
  allowPremadeTeams: { type: Boolean, default: true },
  draftTracks: { type: Boolean, default: false },
  spicyTracks: { type: Boolean, default: false },
  reservedTeam: String,
});

RankedLobby.methods = {
  isRacing() {
    return ![BATTLE_FFA, BATTLE_4V4].includes(this.type);
  },
  isBattle() {
    return !this.isRacing();
  },
  isFFA() {
    return [RACE_FFA, BATTLE_FFA].includes(this.type);
  },
  isItemless() {
    return [RACE_ITEMLESS, RACE_ITEMLESS_DUOS].includes(this.type);
  },
  isDuos() {
    return [RACE_DUOS, RACE_ITEMLESS_DUOS].includes(this.type);
  },
  is3v3() {
    return this.type === RACE_3V3;
  },
  is4v4() {
    return [RACE_4V4, BATTLE_4V4].includes(this.type);
  },
  isSurvival() {
    return this.type === RACE_SURVIVAL;
  },
  isTeams() {
    return [RACE_DUOS, RACE_3V3, RACE_4V4, RACE_ITEMLESS_DUOS, BATTLE_4V4].includes(this.type);
  },
  isWar() {
    return [RACE_3V3, RACE_4V4, BATTLE_4V4].includes(this.type);
  },
  getMinimumRequiredPlayers() {
    const requirements = {
      [RACE_FFA]: 6,
      [RACE_ITEMLESS]: 4,
      [RACE_DUOS]: 6,
      [RACE_3V3]: 6,
      [RACE_4V4]: 8,
      [RACE_SURVIVAL]: 8,
      [RACE_ITEMLESS_DUOS]: 6,
      [BATTLE_FFA]: 4,
      [BATTLE_4V4]: 8,
    };

    return requirements[this.type];
  },
  hasMinimumRequiredPlayers() {
    return this.players.length >= this.getMinimumRequiredPlayers();
  },
  getMaximumAllowedPlayers() {
    const limits = {
      [RACE_FFA]: 8,
      [RACE_ITEMLESS]: 4,
      [RACE_DUOS]: 8,
      [RACE_3V3]: 6,
      [RACE_4V4]: 8,
      [RACE_SURVIVAL]: 8,
      [RACE_ITEMLESS_DUOS]: 8,
      [BATTLE_FFA]: 4,
      [BATTLE_4V4]: 8,
    };

    return limits[this.type];
  },
  hasMaximumAllowedPlayers() {
    return this.players.length === this.getMaximumAllowedPlayers();
  },
};

module.exports.default = model('ranked_lobbies', RankedLobby);
