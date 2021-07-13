const mongoose = require('mongoose');

const { Schema, model } = mongoose;
const { engineStyles } = require('../engine_styles');
const { regions } = require('../regions');
const { trackOptions } = require('../track_options');

const poolItems3 = require('../pools/items_3');
const poolItems4 = require('../pools/items_4');
const poolItems5 = require('../pools/items_5');
const poolItemless3 = require('../pools/itemless_3');
const poolBattle3 = require('../pools/battle_3');
const poolBattle4 = require('../pools/battle_4');
const poolBattle5 = require('../pools/battle_5');
const poolBlueFire = require('../pools/blue_fire');
const poolBonus = require('../pools/bonus');
const poolCnk = require('../pools/cnk');
const poolCtr = require('../pools/ctr');
const poolDayTime = require('../pools/day_time');
const poolLong = require('../pools/long');
const poolNature = require('../pools/nature');
const poolNightTime = require('../pools/night_time');
const poolPolswid = require('../pools/polswid');
const poolSacredFire = require('../pools/sacred_fire');
const poolSmall = require('../pools/small');
const poolTechnology = require('../pools/technology');

const engineUids = engineStyles.map((e) => e.uid);
const regionUids = regions.map((r) => r.uid);
const trackOptionUids = trackOptions.map((t) => t.uid);

const LOBBY_MODE_STANDARD = 'standard';
const LOBBY_MODE_TOURNAMENT = 'tournament';
const UNKNOWN = 'unknown';
const RACE_ITEMS_FFA = 'race_ffa';
const RACE_ITEMS_DUOS = 'race_duos';
const RACE_ITEMS_3V3 = 'race_3v3';
const RACE_ITEMS_4V4 = 'race_4v4';
const RACE_SURVIVAL = 'race_survival';
const RACE_ITEMLESS_1V1 = 'race_itemless_1v1';
const RACE_ITEMLESS_FFA = 'race_itemless_ffa';
const RACE_ITEMLESS_DUOS = 'race_itemless_duos';
const RACE_ITEMLESS_3V3 = 'race_itemless_3v3';
const RACE_ITEMLESS_4V4 = 'race_itemless_4v4';
const BATTLE_1V1 = 'battle_1v1';
const BATTLE_FFA = 'battle_ffa';
const BATTLE_DUOS = 'battle_duos';
const BATTLE_3V3 = 'battle_3v3';
const BATTLE_4V4 = 'battle_4v4';
const SURVIVAL_STYLES = [
  'Items only',
  'Mixed',
  'Itemless',
];
const LEADERBOARDS = {
  [RACE_ITEMS_FFA]: 'udG9Tk',
  [RACE_ITEMS_DUOS]: 'udG9Tk',
  [RACE_ITEMS_3V3]: 'udG9Tk',
  [RACE_ITEMS_4V4]: 'udG9Tk',
  [RACE_SURVIVAL]: null,
  [RACE_ITEMLESS_1V1]: 'CEOxYQ',
  [RACE_ITEMLESS_FFA]: 'CEOxYQ',
  [RACE_ITEMLESS_DUOS]: 'CEOxYQ',
  [RACE_ITEMLESS_3V3]: 'CEOxYQ',
  [RACE_ITEMLESS_4V4]: 'CEOxYQ',
  [BATTLE_1V1]: 'KDVWLV',
  [BATTLE_FFA]: 'KDVWLV',
  [BATTLE_DUOS]: 'KDVWLV',
  [BATTLE_3V3]: 'KDVWLV',
  [BATTLE_4V4]: 'KDVWLV',
};
const TRACK_OPTION_RNG = 'random';
const TRACK_OPTION_POOLS = 'pool';
const TRACK_OPTION_DRAFT = 'draft';
const TRACK_OPTION_BONUS = 'bonus';
const TRACK_OPTION_BLUE_FIRE = 'blue_fire';
const TRACK_OPTION_CNK = 'cnk';
const TRACK_OPTION_CTR = 'ctr';
const TRACK_OPTION_DAY_TIME = 'day_time';
const TRACK_OPTION_LONG = 'long';
const TRACK_OPTION_NIGHT_TIME = 'night_time';
const TRACK_OPTION_NATURE = 'nature';
const TRACK_OPTION_POLSWID = 'polswid';
const TRACK_OPTION_SACRED_FIRE = 'sacred_fire';
const TRACK_OPTION_SMALL = 'small';
const TRACK_OPTION_TECHNOLOGY = 'technology';
const TRACK_DRAGON_MINES = 'Dragon Mines';
const TRACK_HYPER_SPACEWAY = 'Hyper Spaceway';
const TRACK_SPYRO_CIRCUIT = 'Spyro Circuit';
const ARENA_FROZEN_FRENZY = 'Frozen Frenzy';
const ARENA_MAGNETIC_MAYHEM = 'Magnetic Mayhem';
const CUSTOM_OPTION_MODE = 'mode';
const CUSTOM_OPTION_TRACK_POOL = 'track_pool';
const CUSTOM_OPTION_PLAYERS = 'players';
const CUSTOM_OPTION_RULESET = 'ruleset';
const CUSTOM_OPTION_REGION = 'region';
const CUSTOM_OPTION_BATTLE_MODES = 'battle_modes';
const CUSTOM_OPTION_PREMADE_TEAMS = 'premade_teams';
const CUSTOM_OPTION_RESERVE = 'reserve';
const CUSTOM_OPTION_ANONYMOUS = 'anonymous';
const CUSTOM_OPTION_TYPE = 'type';
const CUSTOM_OPTION_MMR_LOCK = 'mmr_lock';

module.exports.RACE_FFA = RACE_ITEMS_FFA;
module.exports.RACE_DUOS = RACE_ITEMS_DUOS;
module.exports.RACE_3V3 = RACE_ITEMS_3V3;
module.exports.RACE_4V4 = RACE_ITEMS_4V4;
module.exports.RACE_SURVIVAL = RACE_SURVIVAL;
module.exports.RACE_ITEMLESS_1V1 = RACE_ITEMLESS_1V1;
module.exports.RACE_ITEMLESS_FFA = RACE_ITEMLESS_FFA;
module.exports.RACE_ITEMLESS_DUOS = RACE_ITEMLESS_DUOS;
module.exports.RACE_ITEMLESS_3V3 = RACE_ITEMLESS_3V3;
module.exports.RACE_ITEMLESS_4V4 = RACE_ITEMLESS_4V4;
module.exports.BATTLE_1V1 = BATTLE_1V1;
module.exports.BATTLE_FFA = BATTLE_FFA;
module.exports.BATTLE_DUOS = BATTLE_DUOS;
module.exports.BATTLE_3V3 = BATTLE_3V3;
module.exports.BATTLE_4V4 = BATTLE_4V4;
module.exports.SURVIVAL_STYLES = SURVIVAL_STYLES;
module.exports.LEADERBOARDS = LEADERBOARDS;
module.exports.TRACK_OPTION_RNG = TRACK_OPTION_RNG;
module.exports.TRACK_OPTION_POOLS = TRACK_OPTION_POOLS;
module.exports.TRACK_OPTION_DRAFT = TRACK_OPTION_DRAFT;
module.exports.TRACK_OPTION_BONUS = TRACK_OPTION_BONUS;
module.exports.TRACK_OPTION_BLUE_FIRE = TRACK_OPTION_BLUE_FIRE;
module.exports.TRACK_OPTION_CNK = TRACK_OPTION_CNK;
module.exports.TRACK_OPTION_CTR = TRACK_OPTION_CTR;
module.exports.TRACK_OPTION_DAY_TIME = TRACK_OPTION_DAY_TIME;
module.exports.TRACK_OPTION_LONG = TRACK_OPTION_LONG;
module.exports.TRACK_OPTION_NIGHT_TIME = TRACK_OPTION_NIGHT_TIME;
module.exports.TRACK_OPTION_NATURE = TRACK_OPTION_NATURE;
module.exports.TRACK_OPTION_POLSWID = TRACK_OPTION_POLSWID;
module.exports.TRACK_OPTION_SACRED_FIRE = TRACK_OPTION_SACRED_FIRE;
module.exports.TRACK_OPTION_SMALL = TRACK_OPTION_SMALL;
module.exports.TRACK_OPTION_TECHNOLOGY = TRACK_OPTION_TECHNOLOGY;
module.exports.LOBBY_MODE_STANDARD = LOBBY_MODE_STANDARD;
module.exports.LOBBY_MODE_TOURNAMENT = LOBBY_MODE_TOURNAMENT;
module.exports.CUSTOM_OPTION_MODE = CUSTOM_OPTION_MODE;
module.exports.CUSTOM_OPTION_TRACK_POOL = CUSTOM_OPTION_TRACK_POOL;
module.exports.CUSTOM_OPTION_PLAYERS = CUSTOM_OPTION_PLAYERS;
module.exports.CUSTOM_OPTION_RULESET = CUSTOM_OPTION_RULESET;
module.exports.CUSTOM_OPTION_REGION = CUSTOM_OPTION_REGION;
module.exports.CUSTOM_OPTION_BATTLE_MODES = CUSTOM_OPTION_BATTLE_MODES;
module.exports.CUSTOM_OPTION_PREMADE_TEAMS = CUSTOM_OPTION_PREMADE_TEAMS;
module.exports.CUSTOM_OPTION_RESERVE = CUSTOM_OPTION_RESERVE;
module.exports.CUSTOM_OPTION_ANONYMOUS = CUSTOM_OPTION_ANONYMOUS;
module.exports.CUSTOM_OPTION_TYPE = CUSTOM_OPTION_TYPE;
module.exports.CUSTOM_OPTION_MMR_LOCK = CUSTOM_OPTION_MMR_LOCK;

const Lobby = new Schema({
  date: {
    type: Date,
    default: Date.now,
  },
  guild: String,
  channel: String,
  message: String,
  creator: String,
  started: {
    type: Boolean,
    default: false,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  players: [String],
  teamList: Array,
  closed: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    enum: [
      RACE_ITEMS_FFA,
      RACE_ITEMS_DUOS,
      RACE_ITEMS_3V3,
      RACE_ITEMS_4V4,
      RACE_SURVIVAL,
      RACE_ITEMLESS_1V1,
      RACE_ITEMLESS_FFA,
      RACE_ITEMLESS_DUOS,
      RACE_ITEMLESS_3V3,
      RACE_ITEMLESS_4V4,
      BATTLE_1V1,
      BATTLE_FFA,
      BATTLE_DUOS,
      BATTLE_3V3,
      BATTLE_4V4,
    ],
  },
  trackOption: {
    type: String,
    enum: trackOptionUids,
    default: TRACK_OPTION_RNG,
  },
  maxPlayerCount: Number,
  trackCount: Number,
  lapCount: {
    type: Number,
    enum: [1, 3, 5, 7],
    default: 5,
  },
  ruleset: {
    type: Number,
    enum: [0, 1, 2],
    default: 1,
  },
  regions: {
    type: [String],
    enum: regionUids,
    default: null,
  },
  engineRestriction: {
    type: String,
    enum: engineUids.concat(null),
    default: null,
  },
  survivalStyle: {
    type: Number,
    enum: [null, 0, 1, 2],
    default: null,
  },
  allowPremadeTeams: {
    type: Boolean,
    default: true,
  },
  reservedTeam: String,
  ranked: {
    type: Boolean,
    default: false,
  },
  locked: {
    rank: Number,
    shift: Number,
  },
  mode: {
    type: String,
    enum: [
      LOBBY_MODE_STANDARD,
      LOBBY_MODE_TOURNAMENT,
    ],
  },
  limitAndLKDOnly: {
    type: Boolean,
    default: false,
  },
  anonymous: {
    type: Boolean,
    default: false,
  },
});

Lobby.methods = {
  isPools() {
    return this.trackOption === TRACK_OPTION_POOLS;
  },
  isDrafting() {
    return this.trackOption === TRACK_OPTION_DRAFT;
  },
  getSoloPlayers() {
    let soloPlayers = [...this.players];

    this.teamList.forEach((team) => {
      team.forEach((player) => {
        soloPlayers = soloPlayers.filter((p) => p !== player);
      });
    });

    return soloPlayers;
  },
  isRacing() {
    return !this.isBattle();
  },
  isItemless() {
    // eslint-disable-next-line max-len
    return [RACE_ITEMLESS_1V1, RACE_ITEMLESS_FFA, RACE_ITEMLESS_DUOS, RACE_ITEMLESS_3V3, RACE_ITEMLESS_4V4].includes(this.type);
  },
  isBattle() {
    // eslint-disable-next-line max-len
    return [BATTLE_1V1, BATTLE_FFA, BATTLE_DUOS, BATTLE_3V3, BATTLE_4V4].includes(this.type);
  },
  isFFA() {
    return [RACE_ITEMS_FFA, RACE_ITEMLESS_FFA, BATTLE_FFA].includes(this.type);
  },
  is1v1() {
    return [RACE_ITEMLESS_1V1, BATTLE_1V1].includes(this.type);
  },
  isDuos() {
    return [RACE_ITEMS_DUOS, RACE_ITEMLESS_DUOS, BATTLE_DUOS].includes(this.type);
  },
  is3v3() {
    return [RACE_ITEMS_3V3, RACE_ITEMLESS_3V3, BATTLE_3V3].includes(this.type);
  },
  is4v4() {
    return [RACE_ITEMS_4V4, RACE_ITEMLESS_4V4, BATTLE_4V4].includes(this.type);
  },
  isSurvival() {
    return [RACE_SURVIVAL].includes(this.type);
  },
  isTeams() {
    return (this.isDuos() || this.is3v3() || this.is4v4());
  },
  isWar() {
    return (this.is1v1() || this.type === BATTLE_DUOS || this.is3v3() || this.is4v4());
  },
  isSolos() {
    return !this.isTeams();
  },
  getTeamSize() {
    if (this.isDuos()) {
      return 2;
    }

    if (this.is3v3()) {
      return 3;
    }

    if (this.is4v4()) {
      return 4;
    }

    return 1;
  },
  getMinimumPlayerCount() {
    let minimumPlayers;

    if (this.isTournament()) {
      minimumPlayers = {
        [RACE_ITEMS_FFA]: 16,
        [RACE_ITEMS_DUOS]: 16,
        [RACE_ITEMS_3V3]: 12,
        [RACE_ITEMS_4V4]: 16,
        [RACE_SURVIVAL]: 16,
        [RACE_ITEMLESS_1V1]: 4,
        [RACE_ITEMLESS_FFA]: 8,
        [RACE_ITEMLESS_DUOS]: 16,
        [RACE_ITEMLESS_3V3]: 12,
        [RACE_ITEMLESS_4V4]: 16,
        [BATTLE_1V1]: 4,
        [BATTLE_FFA]: 8,
        [BATTLE_DUOS]: 8,
        [BATTLE_3V3]: 12,
        [BATTLE_4V4]: 8,
      };
    } else {
      minimumPlayers = {
        [RACE_ITEMS_FFA]: 6,
        [RACE_ITEMS_DUOS]: 6,
        [RACE_ITEMS_3V3]: 6,
        [RACE_ITEMS_4V4]: 8,
        [RACE_SURVIVAL]: 8,
        [RACE_ITEMLESS_1V1]: 2,
        [RACE_ITEMLESS_FFA]: 4,
        [RACE_ITEMLESS_DUOS]: 6,
        [RACE_ITEMLESS_3V3]: 6,
        [RACE_ITEMLESS_4V4]: 8,
        [BATTLE_1V1]: 2,
        [BATTLE_FFA]: 4,
        [BATTLE_DUOS]: 4,
        [BATTLE_3V3]: 6,
        [BATTLE_4V4]: 8,
      };
    }

    return minimumPlayers[this.type];
  },
  getDefaultTrackOption() {
    const defaultTrackOption = {
      [RACE_ITEMS_FFA]: TRACK_OPTION_RNG,
      [RACE_ITEMS_DUOS]: TRACK_OPTION_POOLS,
      [RACE_ITEMS_3V3]: TRACK_OPTION_POOLS,
      [RACE_ITEMS_4V4]: TRACK_OPTION_POOLS,
      [RACE_SURVIVAL]: TRACK_OPTION_POOLS,
      [RACE_ITEMLESS_1V1]: TRACK_OPTION_POOLS,
      [RACE_ITEMLESS_FFA]: TRACK_OPTION_POOLS,
      [RACE_ITEMLESS_DUOS]: TRACK_OPTION_POOLS,
      [RACE_ITEMLESS_3V3]: TRACK_OPTION_POOLS,
      [RACE_ITEMLESS_4V4]: TRACK_OPTION_POOLS,
      [BATTLE_1V1]: TRACK_OPTION_POOLS,
      [BATTLE_FFA]: TRACK_OPTION_RNG,
      [BATTLE_DUOS]: TRACK_OPTION_POOLS,
      [BATTLE_3V3]: TRACK_OPTION_POOLS,
      [BATTLE_4V4]: TRACK_OPTION_POOLS,
    };

    return defaultTrackOption[this.type];
  },
  getDefaultPlayerCount() {
    if (this.isTournament()) {
      return this.getMinimumPlayerCount();
    }

    const defaultPlayers = {
      [RACE_ITEMS_FFA]: 8,
      [RACE_ITEMS_DUOS]: 8,
      [RACE_ITEMS_3V3]: 6,
      [RACE_ITEMS_4V4]: 8,
      [RACE_SURVIVAL]: 8,
      [RACE_ITEMLESS_1V1]: 2,
      [RACE_ITEMLESS_FFA]: 4,
      [RACE_ITEMLESS_DUOS]: 8,
      [RACE_ITEMLESS_3V3]: 6,
      [RACE_ITEMLESS_4V4]: 8,
      [BATTLE_1V1]: 2,
      [BATTLE_FFA]: 4,
      [BATTLE_DUOS]: 4,
      [BATTLE_3V3]: 6,
      [BATTLE_4V4]: 8,
    };

    return defaultPlayers[this.type];
  },
  getMaxPlayerCount() {
    let maxPlayers;

    if (this.isTournament()) {
      maxPlayers = {
        [RACE_ITEMS_FFA]: 64,
        [RACE_ITEMS_DUOS]: 64,
        [RACE_ITEMS_3V3]: 48,
        [RACE_ITEMS_4V4]: 64,
        [RACE_SURVIVAL]: 64,
        [RACE_ITEMLESS_1V1]: 8,
        [RACE_ITEMLESS_FFA]: 32,
        [RACE_ITEMLESS_DUOS]: 64,
        [RACE_ITEMLESS_3V3]: 48,
        [RACE_ITEMLESS_4V4]: 64,
        [BATTLE_1V1]: 8,
        [BATTLE_FFA]: 32,
        [BATTLE_DUOS]: 32,
        [BATTLE_3V3]: 48,
        [BATTLE_4V4]: 64,
      };
    } else {
      maxPlayers = {
        [RACE_ITEMS_FFA]: 8,
        [RACE_ITEMS_DUOS]: 8,
        [RACE_ITEMS_3V3]: 6,
        [RACE_ITEMS_4V4]: 8,
        [RACE_SURVIVAL]: 8,
        [RACE_ITEMLESS_1V1]: 2,
        [RACE_ITEMLESS_FFA]: 8,
        [RACE_ITEMLESS_DUOS]: 8,
        [RACE_ITEMLESS_3V3]: 6,
        [RACE_ITEMLESS_4V4]: 8,
        [BATTLE_1V1]: 2,
        [BATTLE_FFA]: 8,
        [BATTLE_DUOS]: 4,
        [BATTLE_3V3]: 6,
        [BATTLE_4V4]: 8,
      };
    }

    return maxPlayers[this.type];
  },
  hasMinimumPlayerCount() {
    return this.players.length >= this.getMinimumPlayerCount();
  },
  hasMaxPlayerCount() {
    return this.players.length === this.getMaxPlayerCount();
  },
  getDefaultTrackCount() {
    const trackCounts = {
      [RACE_ITEMS_FFA]: 8,
      [RACE_ITEMS_DUOS]: 8,
      [RACE_ITEMS_3V3]: 8,
      [RACE_ITEMS_4V4]: 10,
      [RACE_SURVIVAL]: 7,
      [RACE_ITEMLESS_1V1]: 5,
      [RACE_ITEMLESS_FFA]: 6,
      [RACE_ITEMLESS_DUOS]: 8,
      [RACE_ITEMLESS_3V3]: 6,
      [RACE_ITEMLESS_4V4]: 8,
      [BATTLE_1V1]: 5,
      [BATTLE_FFA]: 5,
      [BATTLE_DUOS]: 6,
      [BATTLE_3V3]: 6,
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

    if (this.regions.length > 0) {
      title += 'Region Locked ';
    }

    if (!this.locked.$isEmpty()) {
      title += 'Rank Locked ';
    }

    if (this.isRacing()) {
      if (!this.isItemless()) {
        if (this.isFFA()) {
          title += 'FFA';
        } else if (this.isDuos()) {
          title += 'Duos';
        } else if (this.is3v3()) {
          title += '3 vs. 3';
        } else if (this.is4v4()) {
          title += '4 vs. 4';
        } else if (this.isSurvival()) {
          title += 'Survival';
        } else {
          title += UNKNOWN;
        }
      }

      if (this.isItemless()) {
        if (this.is1v1()) {
          title += 'Itemless 1 vs. 1';
        } else if (this.isFFA()) {
          title += 'Itemless FFA';
        } else if (this.isDuos()) {
          title += 'Itemless Duos';
        } else if (this.is3v3()) {
          title += 'Itemless 3 vs. 3';
        } else if (this.is4v4()) {
          title += 'Itemless 4 vs. 4';
        } else {
          title += UNKNOWN;
        }
      }
    }

    if (this.isBattle()) {
      if (this.is1v1()) {
        title += 'Battle 1 vs. 1';
      } else if (this.isFFA()) {
        title += 'Battle FFA';
      } else if (this.isDuos()) {
        title += 'Battle Duos';
      } else if (this.is3v3()) {
        title += 'Battle 3 vs. 3';
      } else if (this.is4v4()) {
        title += 'Battle 4 vs. 4';
      } else {
        title += UNKNOWN;
      }
    }

    if (!this.isBattle() && !this.isRacing()) {
      title += UNKNOWN;
    }

    if (this.isTournament()) {
      title += ' Tournament';
    } else {
      title += ' Lobby';
    }

    if (this.isRacing()) {
      const trackOption = trackOptions.find((t) => t.uid === this.trackOption);
      title += ` (${trackOption.name})`;
    } else if (this.isBattle()) {
      if (this.isDrafting()) {
        title += ' (Arena Drafting)';
      } else if (this.isPools()) {
        title += ' (Arena Pools)';
      } else if (this.isIronMan()) {
        title += ' (Iron Man)';
      } else {
        title += ' (Full RNG Arenas)';
      }
    }

    return title;
  },
  getIcon() {
    if (this.isTournament()) {
      return 'https://static.wikia.nocookie.net/crashban/images/8/81/NitroFueledTrophyRender.png';
    }

    const icons = {
      [RACE_ITEMS_FFA]: 'https://i.imgur.com/wD4xrSw.png', // Single Bomb
      [RACE_ITEMS_DUOS]: 'https://i.imgur.com/lo5dwcJ.png', // Uka + Aku Mask
      [RACE_ITEMS_3V3]: 'https://i.imgur.com/0A2LVaY.png', // Triple Missile
      [RACE_ITEMS_4V4]: 'https://i.imgur.com/3dvcaur.png', // Firehawk
      [RACE_SURVIVAL]: 'https://i.imgur.com/QqA2CK5.png', // Poison Symbol
      [RACE_ITEMLESS_1V1]: 'https://i.imgur.com/45dXDSf.png', // Champion Kart
      [RACE_ITEMLESS_FFA]: 'https://i.imgur.com/ZmrfJJN.png', // Daredevil
      [RACE_ITEMLESS_DUOS]: 'https://i.imgur.com/7gFxsmu.png', // Xfinity Kart
      [RACE_ITEMLESS_3V3]: 'https://i.imgur.com/ZCv0Uwl.png', // Mammoth
      [RACE_ITEMLESS_4V4]: 'https://i.imgur.com/fdmJjfi.png', // Nitro GT
      [BATTLE_1V1]: 'https://i.imgur.com/0BPdwId.png', // Aku Aku
      [BATTLE_FFA]: 'https://i.imgur.com/dCs3j9Y.png', // Invisibility
      [BATTLE_DUOS]: 'https://i.imgur.com/4fFQLMU.png', // Master Wheels
      [BATTLE_3V3]: 'https://i.imgur.com/4USZueO.png', // Sparx
      [BATTLE_4V4]: 'https://i.imgur.com/UMYa2RH.png', // Neon Hawk
    };

    return icons[this.type];
  },
  getRoleName() {
    let roleName;
    if (this.ranked) {
      roleName = 'Ranked ';
    } else {
      roleName = 'Unranked ';
    }

    const modeNames = {
      [RACE_ITEMS_FFA]: 'FFA',
      [RACE_ITEMS_DUOS]: 'Duos',
      [RACE_ITEMS_3V3]: '3v3',
      [RACE_ITEMS_4V4]: '4v4',
      [RACE_SURVIVAL]: 'Survival',
      [RACE_ITEMLESS_1V1]: 'Itemless 1v1',
      [RACE_ITEMLESS_FFA]: 'Itemless FFA',
      [RACE_ITEMLESS_DUOS]: 'Itemless Duos',
      [RACE_ITEMLESS_3V3]: 'Itemless 3v3',
      [RACE_ITEMLESS_4V4]: 'Itemless 4v4',
      [BATTLE_1V1]: 'Battle 1v1',
      [BATTLE_FFA]: 'Battle FFA',
      [BATTLE_DUOS]: 'Battle Duos',
      [BATTLE_3V3]: 'Battle 3v3',
      [BATTLE_4V4]: 'Battle 4v4',
    };

    roleName += modeNames[this.type];

    return roleName;
  },
  getColor() {
    if (this.isTournament()) {
      return 16318337; // Light Yellow
    }

    const colors = {
      [RACE_ITEMS_FFA]: 3707391, // Blue
      [RACE_ITEMS_DUOS]: 16732141, // Pink
      [RACE_ITEMS_3V3]: 16724019, // Red
      [RACE_ITEMS_4V4]: 9568066, // Green
      [RACE_SURVIVAL]: 0, // Black
      [RACE_ITEMLESS_1V1]: 6360569, // Purple
      [RACE_ITEMLESS_FFA]: 7917555, // Sky Blue
      [RACE_ITEMLESS_DUOS]: 16777215, // White
      [RACE_ITEMLESS_3V3]: 14138792, // Beige
      [RACE_ITEMLESS_4V4]: 6856623, // Teal
      [BATTLE_1V1]: 7292965, // Brown
      [BATTLE_FFA]: 9605778, // Grey
      [BATTLE_DUOS]: 7944547, // Magenta
      [BATTLE_3V3]: 15714364, // Honey
      [BATTLE_4V4]: 11299064, // Medium Pink
    };

    return colors[this.type];
  },
  getLobbyEndCooldown() {
    const remindMinutes = this.getRemindMinutes();
    return remindMinutes[0];
  },
  hasLeaderboard() {
    // eslint-disable-next-line no-prototype-builtins
    if (!LEADERBOARDS.hasOwnProperty(this.type)) {
      return false;
    }

    return LEADERBOARDS[this.type] !== null;
  },
  getLeaderboard() {
    if (!this.hasLeaderboard()) {
      return null;
    }

    return LEADERBOARDS[this.type];
  },
  getRemindMinutes() {
    if (this.isTournament()) {
      return null;
    }

    // 1. Adding allowed 2 Minute breaks between races, at most 3 times per lobby
    // 2. Assuming every player takes 1.5 Minutes to join
    // 3. Adding 1.5 Minutes per Race/Battle due to load screen
    let remindMinutesMax = 6 + (this.players.length * 1.5) + (this.trackCount * 1.5);

    // Drafting takes 5 more minutes
    if (this.trackOption === TRACK_OPTION_DRAFT) {
      remindMinutesMax += 5;
    }

    if (this.isRacing()) {
      // 3 Laps = 2 Minutes per Race, 5 Laps = 4 Minutes and 7 Laps = 6 Minutes
      remindMinutesMax += ((this.lapCount - 1) * this.trackCount);
    } else if (this.isBattle()) {
      // Battle is always using 6 minutes
      remindMinutesMax += (6 * this.trackCount);
    }

    const remindMinutesMin = Math.round(remindMinutesMax * 0.8);

    return [remindMinutesMin, remindMinutesMax];
  },
  getPingMinutes() {
    if (this.isTournament()) {
      return null;
    }

    const remindMinutes = this.getRemindMinutes();
    const remindMinutesMax = remindMinutes[1];

    return [
      Math.round(remindMinutesMax * 1.2),
      Math.round(remindMinutesMax * 1.4),
      Math.round(remindMinutesMax * 1.6),
      Math.round(remindMinutesMax * 1.8),
    ];
  },
  getMaxTrackCount() {
    if (this.isTournament()) {
      return this.getDefaultTrackCount();
    }

    const maxTrackCount = {
      [RACE_ITEMS_FFA]: 37,
      [RACE_ITEMS_DUOS]: 37,
      [RACE_ITEMS_3V3]: 37,
      [RACE_ITEMS_4V4]: 37,
      [RACE_SURVIVAL]: 7,
      [RACE_ITEMLESS_1V1]: 37,
      [RACE_ITEMLESS_FFA]: 37,
      [RACE_ITEMLESS_DUOS]: 37,
      [RACE_ITEMLESS_3V3]: 37,
      [RACE_ITEMLESS_4V4]: 37,
      [BATTLE_1V1]: 12,
      [BATTLE_FFA]: 12,
      [BATTLE_DUOS]: 12,
      [BATTLE_3V3]: 12,
      [BATTLE_4V4]: 12,
    };

    return maxTrackCount[this.type];
  },
  getDefaultLapCount() {
    const defaultLapCount = {
      [RACE_ITEMS_FFA]: 5,
      [RACE_ITEMS_DUOS]: 5,
      [RACE_ITEMS_3V3]: 5,
      [RACE_ITEMS_4V4]: 5,
      [RACE_SURVIVAL]: 5,
      [RACE_ITEMLESS_1V1]: 3,
      [RACE_ITEMLESS_FFA]: 3,
      [RACE_ITEMLESS_DUOS]: 3,
      [RACE_ITEMLESS_3V3]: 3,
      [RACE_ITEMLESS_4V4]: 3,
      [BATTLE_1V1]: 1,
      [BATTLE_FFA]: 1,
      [BATTLE_DUOS]: 1,
      [BATTLE_3V3]: 1,
      [BATTLE_4V4]: 1,
    };

    return defaultLapCount[this.type];
  },
  isIronMan() {
    // eslint-disable-next-line max-len
    return (this.trackCount === this.getMaxTrackCount() && !this.isTournament() && !this.isSurvival());
  },
  getTrackOptions() {
    // all lobby types at least have full rng and pools
    const availableTrackOptions = [
      TRACK_OPTION_RNG,
      TRACK_OPTION_POOLS,
    ];

    // Themed tracks are available for race modes
    if (this.isRacing()) {
      // Bonus only has 8 tracks
      if (this.getDefaultTrackCount() <= 8) {
        availableTrackOptions.push(TRACK_OPTION_BONUS);
      }

      availableTrackOptions.push(...[
        TRACK_OPTION_BLUE_FIRE,
        TRACK_OPTION_CNK,
        TRACK_OPTION_CTR,
        TRACK_OPTION_DAY_TIME,
        TRACK_OPTION_LONG,
        TRACK_OPTION_NATURE,
        TRACK_OPTION_NIGHT_TIME,
        TRACK_OPTION_POLSWID,
        TRACK_OPTION_SACRED_FIRE,
        TRACK_OPTION_SMALL,
        TRACK_OPTION_TECHNOLOGY,
      ]);
    }

    if (this.isWar() && !this.is1v1()) {
      // drafting for all 3 vs. 3 / 4 vs. 4 modes and battle duos
      availableTrackOptions.push(TRACK_OPTION_DRAFT);
    }

    return availableTrackOptions;
  },
  getBannedTracks() {
    let bannedTracks;
    if (this.regions.length <= 0) {
      bannedTracks = {
        [RACE_ITEMS_FFA]: [TRACK_HYPER_SPACEWAY, TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_DUOS]: [TRACK_HYPER_SPACEWAY, TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_3V3]: [TRACK_HYPER_SPACEWAY, TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_4V4]: [TRACK_HYPER_SPACEWAY, TRACK_SPYRO_CIRCUIT],
        [RACE_SURVIVAL]: [TRACK_HYPER_SPACEWAY],
        [RACE_ITEMLESS_1V1]: [TRACK_DRAGON_MINES, TRACK_HYPER_SPACEWAY],
        [RACE_ITEMLESS_FFA]: [TRACK_DRAGON_MINES, TRACK_HYPER_SPACEWAY],
        [RACE_ITEMLESS_DUOS]: [TRACK_DRAGON_MINES, TRACK_HYPER_SPACEWAY],
        [RACE_ITEMLESS_3V3]: [TRACK_DRAGON_MINES, TRACK_HYPER_SPACEWAY],
        [RACE_ITEMLESS_4V4]: [TRACK_DRAGON_MINES, TRACK_HYPER_SPACEWAY],
        [BATTLE_1V1]: [ARENA_FROZEN_FRENZY, ARENA_MAGNETIC_MAYHEM],
        [BATTLE_FFA]: [],
        [BATTLE_DUOS]: [],
        [BATTLE_3V3]: [],
        [BATTLE_4V4]: [],
      };
    } else {
      bannedTracks = {
        [RACE_ITEMS_FFA]: [TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_DUOS]: [TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_3V3]: [TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_4V4]: [TRACK_SPYRO_CIRCUIT],
        [RACE_SURVIVAL]: [],
        [RACE_ITEMLESS_1V1]: [TRACK_DRAGON_MINES],
        [RACE_ITEMLESS_FFA]: [TRACK_DRAGON_MINES],
        [RACE_ITEMLESS_DUOS]: [TRACK_DRAGON_MINES],
        [RACE_ITEMLESS_3V3]: [TRACK_DRAGON_MINES],
        [RACE_ITEMLESS_4V4]: [TRACK_DRAGON_MINES],
        [BATTLE_1V1]: [ARENA_FROZEN_FRENZY, ARENA_MAGNETIC_MAYHEM],
        [BATTLE_FFA]: [],
        [BATTLE_DUOS]: [],
        [BATTLE_3V3]: [],
        [BATTLE_4V4]: [],
      };
    }

    return bannedTracks[this.type];
  },
  getDefaultRank() {
    const defaultRanks = {
      [RACE_ITEMS_FFA]: 1200,
      [RACE_ITEMS_DUOS]: 1200,
      [RACE_ITEMS_3V3]: 1200,
      [RACE_ITEMS_4V4]: 1200,
      [RACE_SURVIVAL]: 1200,
      [RACE_ITEMLESS_1V1]: 1200,
      [RACE_ITEMLESS_FFA]: 1200,
      [RACE_ITEMLESS_DUOS]: 1200,
      [RACE_ITEMLESS_3V3]: 1200,
      [RACE_ITEMLESS_4V4]: 1200,
      [BATTLE_1V1]: 1200,
      [BATTLE_FFA]: 1200,
      [BATTLE_DUOS]: 1200,
      [BATTLE_3V3]: 1200,
      [BATTLE_4V4]: 1200,
    };

    return defaultRanks[this.type];
  },
  canBeRanked() {
    // eslint-disable-next-line max-len
    return (
      (this.lapCount === this.getDefaultLapCount() || this.isBattle())
      && this.engineRestriction === null
      && this.trackCount === this.getDefaultTrackCount()
      && this.hasLeaderboard()
    );
  },
  getStartedIcon() {
    return 'https://i.imgur.com/cD0sLmQ.png';
  },
  isStandard() {
    return this.mode === LOBBY_MODE_STANDARD;
  },
  isTournament() {
    return this.mode === LOBBY_MODE_TOURNAMENT;
  },
  hasTournamentsEnabled() {
    const enabled = {
      [RACE_ITEMS_FFA]: true,
      [RACE_ITEMS_DUOS]: false,
      [RACE_ITEMS_3V3]: false,
      [RACE_ITEMS_4V4]: false,
      [RACE_SURVIVAL]: false,
      [RACE_ITEMLESS_1V1]: false,
      [RACE_ITEMLESS_FFA]: true,
      [RACE_ITEMLESS_DUOS]: false,
      [RACE_ITEMLESS_3V3]: false,
      [RACE_ITEMLESS_4V4]: false,
      [BATTLE_1V1]: false,
      [BATTLE_FFA]: false,
      [BATTLE_DUOS]: false,
      [BATTLE_3V3]: false,
      [BATTLE_4V4]: false,
    };

    return enabled[this.type];
  },
  getTrackPools() {
    if (this.trackCount <= 0 || this.isTournament()) {
      return [];
    }

    let pools;

    if (this.isRacing()) {
      // eslint-disable-next-line max-len
      if ([TRACK_OPTION_RNG, TRACK_OPTION_POOLS, TRACK_OPTION_DRAFT].includes(this.trackOption)) {
        if (this.isItemless()) {
          pools = poolItemless3;
        } else if (this.trackCount % 3 === 0) {
          pools = poolItems3;
        } else if (this.trackCount % 4 === 0) {
          pools = poolItems4;
        } else if (this.trackCount % 5 === 0) {
          pools = poolItems5;
        } else {
          pools = poolItems4;
        }

        if (this.trackOption === TRACK_OPTION_RNG) {
          pools = [pools.flat()];
        }
      } else {
        switch (this.trackOption) {
          case TRACK_OPTION_BLUE_FIRE:
            pools = poolBlueFire;
            break;
          case TRACK_OPTION_BONUS:
            pools = poolBonus;
            break;
          case TRACK_OPTION_CNK:
            pools = poolCnk;
            break;
          case TRACK_OPTION_CTR:
            pools = poolCtr;
            break;
          case TRACK_OPTION_DAY_TIME:
            pools = poolDayTime;
            break;
          case TRACK_OPTION_LONG:
            pools = poolLong;
            break;
          case TRACK_OPTION_NATURE:
            pools = poolNature;
            break;
          case TRACK_OPTION_NIGHT_TIME:
            pools = poolNightTime;
            break;
          case TRACK_OPTION_POLSWID:
            pools = poolPolswid;
            break;
          case TRACK_OPTION_SACRED_FIRE:
            pools = poolSacredFire;
            break;
          case TRACK_OPTION_SMALL:
            pools = poolSmall;
            break;
          case TRACK_OPTION_TECHNOLOGY:
            pools = poolTechnology;
            break;
          default:
            pools = poolItems4;
            break;
        }
      }
    } else if (this.isBattle()) {
      if (this.is1v1()) {
        pools = poolBattle3;
      } else if (this.trackCount % 3 === 0) {
        pools = poolBattle3;
      } else if (this.trackCount % 4 === 0) {
        pools = poolBattle4;
      } else if (this.trackCount % 5 === 0) {
        pools = poolBattle5;
      } else {
        pools = poolBattle4;
      }
    } else {
      pools = [];
    }

    return pools;
  },
};

module.exports.Lobby = model('lobby', Lobby);
