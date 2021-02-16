const mongoose = require('mongoose');
const config = require('../../config');

const { Schema, model } = mongoose;
const { engineStyles } = require('../engineStyles');

const engineUids = engineStyles.map((e) => e.uid);

const RACE_FFA = 'race_ffa';
const RACE_ITEMLESS = 'race_itemless';
const RACE_DUOS = 'race_duos';
const RACE_3V3 = 'race_3v3';
const RACE_4V4 = 'race_4v4';
const RACE_SURVIVAL = 'race_survival';
const RACE_ITEMLESS_DUOS = 'race_itemless_duos';
const BATTLE_FFA = 'battle_ffa';
const BATTLE_4V4 = 'battle_4v4';
const SURVIVAL_STYLES = [
  'Items only',
  'Mixed',
  'Itemless',
];
const LEADERBOARDS = {
  [RACE_FFA]: 'tJLAVi',
  [RACE_ITEMLESS]: 'xgEBFt',
  [RACE_DUOS]: 'lxd_JN',
  [RACE_3V3]: 'V8s-GJ',
  [RACE_4V4]: 'oNvm3e',
  [RACE_SURVIVAL]: 'GlpVTZ',
  [RACE_ITEMLESS_DUOS]: 'CS5KrM',
  [BATTLE_FFA]: 'ylWyts',
  [BATTLE_4V4]: '3H76QB',
};
const TRACK_OPTION_RNG = 'Full RNG';
const TRACK_OPTION_POOLS = 'Pools';
const TRACK_OPTION_SPICY = 'Spicy';
const TRACK_OPTION_DRAFT = 'Draft';
const TRACK_OPTION_IRON_MAN = 'Iron Man';

module.exports.RACE_FFA = RACE_FFA;
module.exports.RACE_ITEMLESS = RACE_ITEMLESS;
module.exports.RACE_DUOS = RACE_DUOS;
module.exports.RACE_3V3 = RACE_3V3;
module.exports.RACE_4V4 = RACE_4V4;
module.exports.RACE_SURVIVAL = RACE_SURVIVAL;
module.exports.RACE_ITEMLESS_DUOS = RACE_ITEMLESS_DUOS;
module.exports.BATTLE_FFA = BATTLE_FFA;
module.exports.BATTLE_4V4 = BATTLE_4V4;
module.exports.SURVIVAL_STYLES = SURVIVAL_STYLES;
module.exports.LEADERBOARDS = LEADERBOARDS;
module.exports.TRACK_OPTION_RNG = TRACK_OPTION_RNG;
module.exports.TRACK_OPTION_POOLS = TRACK_OPTION_POOLS;
module.exports.TRACK_OPTION_SPICY = TRACK_OPTION_SPICY;
module.exports.TRACK_OPTION_DRAFT = TRACK_OPTION_DRAFT;
module.exports.TRACK_OPTION_IRON_MAN = TRACK_OPTION_IRON_MAN;

const Lobby = new Schema({
  date: { type: Date, default: Date.now },
  guild: String,
  channel: String,
  message: String,
  creator: String,
  started: { type: Boolean, default: false },
  startedAt: { type: Date, default: null },
  players: [String],
  teamList: Array,
  closed: { type: Boolean, default: false },
  type: { type: String, enum: [RACE_FFA, RACE_ITEMLESS, RACE_DUOS, RACE_3V3, RACE_4V4, RACE_SURVIVAL, RACE_ITEMLESS_DUOS, BATTLE_FFA, BATTLE_4V4] },
  pools: { type: Boolean, default: true },
  spicyTracks: { type: Boolean, default: false },
  draftTracks: { type: Boolean, default: false },
  trackCount: { type: Number, enum: [4, 5, 8, 10, 12, 15, 16, 20, 37] },
  ruleset: { type: Number, enum: [0, 1, 2], default: 1 },
  region: String,
  engineRestriction: { type: String, enum: engineUids },
  lapCount: { type: Number, enum: [1, 3, 5, 7], default: 5 },
  survivalStyle: { type: Number, enum: [0, 1, 2], default: 1 },
  allowPremadeTeams: { type: Boolean, default: true },
  reservedTeam: String,
  ranked: { type: Boolean, default: false },
  locked: { rank: Number, shift: Number },
});

Lobby.methods = {
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
      [RACE_FFA]: 2,
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
  getDefaultTrackCount() {
    const trackCounts = {
      [RACE_FFA]: 8,
      [RACE_ITEMLESS]: 5,
      [RACE_DUOS]: 8,
      [RACE_3V3]: 8,
      [RACE_4V4]: 10,
      [RACE_SURVIVAL]: 7,
      [RACE_ITEMLESS_DUOS]: 8,
      [BATTLE_FFA]: 5,
      [BATTLE_4V4]: 8,
    };

    return trackCounts[this.type];
  },
  getTitle() {
    let title;
    if (this.ranked) {
      title = 'Ranked ';
    } else {
      title = 'Unranked ';
    }

    if (this.region) {
      title += 'Region Locked ';
    }

    if (!this.locked.$isEmpty()) {
      title += 'Rank Locked ';
    }

    if (this.isFFA() && !this.isBattle()) {
      title += 'FFA';
    } else if (this.isItemless() && !this.isDuos()) {
      title += 'Itemless FFA';
    } else if (this.isDuos() && !this.isItemless()) {
      title += 'Duos';
    } else if (this.is3v3()) {
      title += '3 vs. 3';
    } else if (this.is4v4() && !this.isBattle()) {
      title += '4 vs. 4';
    } else if (this.isSurvival()) {
      title += 'Survival';
    } else if (this.isDuos() && this.isItemless()) {
      title += 'Itemless Duos';
    } else if (this.isFFA() && this.isBattle()) {
      title += 'Battle FFA';
    } else if (this.is4v4() && this.isBattle()) {
      title += 'Battle 4 vs. 4';
    } else {
      title += 'Unknown';
    }

    title += ' Lobby';

    if (this.isRacing()) {
      if (this.draftTracks) {
        title += ' (Track Drafting)';
      } else if (this.spicyTracks) {
        title += ' (Spicy Tracks)';
      } else if (this.pools) {
        title += ' (Track Pools)';
      } else if (this.isIronMan()) {
        title += ' (Iron Man)';
      } else {
        title += ' (Full RNG Tracks)';
      }
    } else if (this.isBattle()) {
      if (this.draftTracks) {
        title += ' (Map Drafting)';
      } else if (this.spicyTracks) {
        title += ' (Spicy Maps)';
      } else if (this.pools) {
        title += ' (Map Pools)';
      } else if (this.isIronMan()) {
        title += ' (Iron Man)';
      } else {
        title += ' (Full RNG Maps)';
      }
    }

    return title;
  },
  getIcon() {
    const icons = {
      [RACE_FFA]: 'https://vignette.wikia.nocookie.net/crashban/images/3/32/CTRNF-BowlingBomb.png',
      [RACE_ITEMLESS]: 'https://static.wikia.nocookie.net/crashban/images/b/b5/CTRNF-SuperEngine.png',
      [RACE_DUOS]: 'https://vignette.wikia.nocookie.net/crashban/images/8/83/CTRNF-AkuUka.png',
      [RACE_3V3]: 'https://static.wikia.nocookie.net/crashban/images/f/fd/CTRNF-TripleMissile.png',
      [RACE_4V4]: 'https://i.imgur.com/3dvcaur.png',
      [RACE_SURVIVAL]: 'https://static.wikia.nocookie.net/crashban/images/f/fb/CTRNF-WarpOrb.png',
      [RACE_ITEMLESS_DUOS]: 'https://i.imgur.com/kTxPvij.png',
      [BATTLE_FFA]: 'https://vignette.wikia.nocookie.net/crashban/images/9/97/CTRNF-Invisibility.png',
      [BATTLE_4V4]: 'https://i.imgur.com/aLFsltt.png',
    };

    return icons[this.type];
  },
  getRoleName() {
    const roleNames = {
      [RACE_FFA]: config.roles.ranked_ffa_role,
      [RACE_ITEMLESS]: config.roles.ranked_itemless_role,
      [RACE_DUOS]: config.roles.ranked_duos_role,
      [RACE_3V3]: config.roles.ranked_3v3_role,
      [RACE_4V4]: config.roles.ranked_4v4_role,
      [RACE_SURVIVAL]: config.roles.ranked_survival_role,
      [RACE_ITEMLESS_DUOS]: config.roles.ranked_itemless_duos_role,
      [BATTLE_FFA]: config.roles.ranked_battle_role,
      [BATTLE_4V4]: config.roles.ranked_battle_4v4_role,
    };

    return roleNames[this.type];
  },
  getColor() {
    const colors = {
      [RACE_FFA]: 3707391,
      [RACE_ITEMLESS]: 16747320,
      [RACE_DUOS]: 16732141,
      [RACE_3V3]: 16724019,
      [RACE_4V4]: 9568066,
      [RACE_SURVIVAL]: 7204341,
      [RACE_ITEMLESS_DUOS]: 0,
      [BATTLE_FFA]: 15856113,
      [BATTLE_4V4]: 11299064,
    };

    return colors[this.type];
  },
  getLobbyEndCooldown() {
    const lobbyEndCooldowns = {
      [RACE_FFA]: 50,
      [RACE_ITEMLESS]: 30,
      [RACE_DUOS]: 50,
      [RACE_3V3]: 50,
      [RACE_4V4]: 60,
      [RACE_SURVIVAL]: 50,
      [RACE_ITEMLESS_DUOS]: 50,
      [BATTLE_FFA]: 30,
      [BATTLE_4V4]: 60,
    };

    return lobbyEndCooldowns[this.type];
  },
  getLeaderboard() {
    return LEADERBOARDS[this.type];
  },
  getRemindMinutes() {
    const remindMinutes = {
      [RACE_FFA]: [45, 60],
      [RACE_ITEMLESS]: [30, 45],
      [RACE_DUOS]: [45, 60],
      [RACE_3V3]: [45, 60],
      [RACE_4V4]: [60, 75],
      [RACE_SURVIVAL]: [45, 60],
      [RACE_ITEMLESS_DUOS]: [45, 60],
      [BATTLE_FFA]: [30, 45],
      [BATTLE_4V4]: [40, 55],
    };

    return remindMinutes[this.type];
  },
  getPingMinutes() {
    const pingMinutes = {
      [RACE_FFA]: [75, 90, 105, 120],
      [RACE_ITEMLESS]: [60, 75, 90, 105, 120],
      [RACE_DUOS]: [75, 90, 105, 120],
      [RACE_3V3]: [75, 90, 105, 120],
      [RACE_4V4]: [90, 105, 120, 135],
      [RACE_SURVIVAL]: [75, 90, 105, 120],
      [RACE_ITEMLESS_DUOS]: [75, 90, 105, 120],
      [BATTLE_FFA]: [60, 75, 90, 105, 120],
      [BATTLE_4V4]: [70, 85, 100, 115, 130],
    };

    return pingMinutes[this.type];
  },
  getMaxTrackCount() {
    const maxTrackCount = {
      [RACE_FFA]: 37,
      [RACE_ITEMLESS]: 37,
      [RACE_DUOS]: 37,
      [RACE_3V3]: 37,
      [RACE_4V4]: 37,
      [RACE_SURVIVAL]: 8,
      [RACE_ITEMLESS_DUOS]: 37,
      [BATTLE_FFA]: 12,
      [BATTLE_4V4]: 12,
    };

    return maxTrackCount[this.type];
  },
  getTrackCountOptions() {
    const trackCountOptions = {
      [RACE_FFA]: [5, 8, 10, 12, 15, 16, 20, 37],
      [RACE_ITEMLESS]: [5, 8, 10, 12, 15, 16, 20, 37],
      [RACE_DUOS]: [5, 8, 10, 12, 15, 16, 20, 37],
      [RACE_3V3]: [5, 8, 10, 12, 15, 16, 20, 37],
      [RACE_4V4]: [5, 8, 10, 12, 15, 16, 20, 37],
      [RACE_SURVIVAL]: [8],
      [RACE_ITEMLESS_DUOS]: [5, 8, 10, 12, 15, 16, 20, 37],
      [BATTLE_FFA]: [5, 8, 10, 12],
      [BATTLE_4V4]: [5, 8, 10, 12],
    };

    return trackCountOptions[this.type];
  },
  isIronMan() {
    return this.trackCount === this.getMaxTrackCount();
  },
  getTrackOptions() {
    const trackOptions = {
      [RACE_FFA]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_POOLS,
        TRACK_OPTION_SPICY,
        TRACK_OPTION_IRON_MAN,
      ],
      [RACE_ITEMLESS]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_POOLS,
        TRACK_OPTION_SPICY,
        TRACK_OPTION_IRON_MAN,
      ],
      [RACE_DUOS]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_POOLS,
        TRACK_OPTION_SPICY,
        TRACK_OPTION_IRON_MAN,
      ],
      [RACE_3V3]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_POOLS,
        TRACK_OPTION_SPICY,
        TRACK_OPTION_DRAFT,
        TRACK_OPTION_IRON_MAN,
      ],
      [RACE_4V4]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_POOLS,
        TRACK_OPTION_SPICY,
        TRACK_OPTION_DRAFT,
        TRACK_OPTION_IRON_MAN,
      ],
      [RACE_SURVIVAL]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_POOLS,
        TRACK_OPTION_SPICY,
      ],
      [RACE_ITEMLESS_DUOS]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_POOLS,
        TRACK_OPTION_SPICY,
        TRACK_OPTION_IRON_MAN,
      ],
      [BATTLE_FFA]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_IRON_MAN,
      ],
      [BATTLE_4V4]: [
        TRACK_OPTION_RNG,
        TRACK_OPTION_POOLS,
        TRACK_OPTION_DRAFT,
        TRACK_OPTION_IRON_MAN,
      ],
    };

    return trackOptions[this.type];
  },
  canBeRanked() {
    return !(this.lapCount !== 5 || this.engineRestriction || this.trackCount > this.getDefaultTrackCount() || this.ruleset !== 1);
  },
  getStartedIcon() {
    return 'https://i.imgur.com/cD0sLmQ.png';
  },
};

module.exports.RankedLobby = model('lobby', Lobby);
