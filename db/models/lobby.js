const mongoose = require('mongoose');

const { Schema, model } = mongoose;
const { engineStyles } = require('../engineStyles');

const engineUids = engineStyles.map((e) => e.uid);

const LOBBY_MODE_STANDARD = 'standard';
const LOBBY_MODE_TOURNAMENT = 'tournament';
const UNKNOWN = 'unknown';
const RACE_ITEMS_FFA = 'race_ffa';
const RACE_ITEMS_DUOS = 'race_duos';
const RACE_ITEMS_3V3 = 'race_3v3';
const RACE_ITEMS_4V4 = 'race_4v4';
const RACE_SURVIVAL = 'race_survival';
const RACE_KRUNKING = 'race_krunking';
const RACE_ITEMLESS_FFA = 'race_itemless_ffa';
const RACE_ITEMLESS_DUOS = 'race_itemless_duos';
const RACE_ITEMLESS_4V4 = 'race_itemless_4v4';
const BATTLE_1V1 = 'battle_1v1';
const BATTLE_FFA = 'battle_ffa';
const BATTLE_DUOS = 'battle_duos';
const BATTLE_3V3 = 'battle_3v3';
const BATTLE_4V4 = 'battle_4v4';
const BATTLE_SURVIVAL = 'battle_survival';
const CUSTOM = 'custom';
const SURVIVAL_STYLES = [
  'Items only',
  'Mixed',
  'Itemless',
];
const LEADERBOARDS = {
  [RACE_ITEMS_FFA]: 'y4VYDV',
  [RACE_ITEMS_DUOS]: 'y4VYDV',
  [RACE_ITEMS_3V3]: 'y4VYDV',
  [RACE_ITEMS_4V4]: 'y4VYDV',
  [RACE_SURVIVAL]: 'bt470o',
  [RACE_KRUNKING]: null,
  [RACE_ITEMLESS_FFA]: 'gh04-5',
  [RACE_ITEMLESS_DUOS]: 'gh04-5',
  [RACE_ITEMLESS_4V4]: 'gh04-5',
  [BATTLE_1V1]: 'FxCWI1',
  [BATTLE_FFA]: 'FxCWI1',
  [BATTLE_DUOS]: 'FxCWI1',
  [BATTLE_3V3]: 'FxCWI1',
  [BATTLE_4V4]: 'FxCWI1',
  [BATTLE_SURVIVAL]: 'bt470o',
  [CUSTOM]: null,
};
const TRACK_OPTION_RNG = 'Full RNG';
const TRACK_OPTION_POOLS = 'Pools';
const TRACK_OPTION_DRAFT = 'Draft';
const TRACK_OPTION_IRON_MAN = 'Iron Man';
const TRACK_DRAGON_MINES = 'Dragon Mines';
const TRACK_HYPER_SPACEWAY = 'Hyper Spaceway';
const TRACK_SPYRO_CIRCUIT = 'Spyro Circuit';
const CUSTOM_OPTION_MODE = 'mode';
const CUSTOM_OPTION_TRACK_POOL = 'track_pool';
const CUSTOM_OPTION_PLAYERS = 'players';
const CUSTOM_OPTION_TRACKS = 'tracks';
const CUSTOM_OPTION_LAPS = 'lap';
const CUSTOM_OPTION_RULESET = 'ruleset';
const CUSTOM_OPTION_REGION = 'region';
const CUSTOM_OPTION_ENGINE = 'engine';
const CUSTOM_OPTION_SURVIVAL_STYLE = 'survival_style';
const CUSTOM_OPTION_PREMADE_TEAMS = 'premade_teams';
const CUSTOM_OPTION_RESERVE = 'reserve';
const CUSTOM_OPTION_TYPE = 'type';
const CUSTOM_OPTION_MMR_LOCK = 'mmr_lock';

module.exports.RACE_FFA = RACE_ITEMS_FFA;
module.exports.RACE_DUOS = RACE_ITEMS_DUOS;
module.exports.RACE_3V3 = RACE_ITEMS_3V3;
module.exports.RACE_4V4 = RACE_ITEMS_4V4;
module.exports.RACE_SURVIVAL = RACE_SURVIVAL;
module.exports.RACE_KRUNKING = RACE_KRUNKING;
module.exports.RACE_ITEMLESS_FFA = RACE_ITEMLESS_FFA;
module.exports.RACE_ITEMLESS_DUOS = RACE_ITEMLESS_DUOS;
module.exports.RACE_ITEMLESS_4V4 = RACE_ITEMLESS_4V4;
module.exports.BATTLE_1V1 = BATTLE_1V1;
module.exports.BATTLE_FFA = BATTLE_FFA;
module.exports.BATTLE_DUOS = BATTLE_DUOS;
module.exports.BATTLE_3V3 = BATTLE_3V3;
module.exports.BATTLE_4V4 = BATTLE_4V4;
module.exports.BATTLE_SURVIVAL = BATTLE_SURVIVAL;
module.exports.CUSTOM = CUSTOM;
module.exports.SURVIVAL_STYLES = SURVIVAL_STYLES;
module.exports.LEADERBOARDS = LEADERBOARDS;
module.exports.TRACK_OPTION_RNG = TRACK_OPTION_RNG;
module.exports.TRACK_OPTION_POOLS = TRACK_OPTION_POOLS;
module.exports.TRACK_OPTION_DRAFT = TRACK_OPTION_DRAFT;
module.exports.TRACK_OPTION_IRON_MAN = TRACK_OPTION_IRON_MAN;
module.exports.LOBBY_MODE_STANDARD = LOBBY_MODE_STANDARD;
module.exports.LOBBY_MODE_TOURNAMENT = LOBBY_MODE_TOURNAMENT;
module.exports.CUSTOM_OPTION_MODE = CUSTOM_OPTION_MODE;
module.exports.CUSTOM_OPTION_TRACK_POOL = CUSTOM_OPTION_TRACK_POOL;
module.exports.CUSTOM_OPTION_PLAYERS = CUSTOM_OPTION_PLAYERS;
module.exports.CUSTOM_OPTION_TRACKS = CUSTOM_OPTION_TRACKS;
module.exports.CUSTOM_OPTION_LAPS = CUSTOM_OPTION_LAPS;
module.exports.CUSTOM_OPTION_RULESET = CUSTOM_OPTION_RULESET;
module.exports.CUSTOM_OPTION_REGION = CUSTOM_OPTION_REGION;
module.exports.CUSTOM_OPTION_ENGINE = CUSTOM_OPTION_ENGINE;
module.exports.CUSTOM_OPTION_SURVIVAL_STYLE = CUSTOM_OPTION_SURVIVAL_STYLE;
module.exports.CUSTOM_OPTION_PREMADE_TEAMS = CUSTOM_OPTION_PREMADE_TEAMS;
module.exports.CUSTOM_OPTION_RESERVE = CUSTOM_OPTION_RESERVE;
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
      RACE_KRUNKING,
      RACE_ITEMLESS_FFA,
      RACE_ITEMLESS_DUOS,
      RACE_ITEMLESS_4V4,
      BATTLE_1V1,
      BATTLE_FFA,
      BATTLE_DUOS,
      BATTLE_3V3,
      BATTLE_4V4,
      BATTLE_SURVIVAL,
      CUSTOM,
    ],
  },
  pools: {
    type: Boolean,
    default: true,
  },
  draftTracks: {
    type: Boolean,
    default: false,
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
  region: String,
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
    enum: [LOBBY_MODE_STANDARD, LOBBY_MODE_TOURNAMENT],
  },
});

Lobby.methods = {
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
    return (!this.isBattle() && !this.isCustom());
  },
  isItemless() {
    return [RACE_ITEMLESS_FFA, RACE_ITEMLESS_DUOS, RACE_ITEMLESS_4V4].includes(this.type);
  },
  isBattle() {
    // eslint-disable-next-line max-len
    return [BATTLE_1V1, BATTLE_FFA, BATTLE_DUOS, BATTLE_3V3, BATTLE_4V4, BATTLE_SURVIVAL].includes(this.type);
  },
  isFFA() {
    return [RACE_ITEMS_FFA, RACE_ITEMLESS_FFA, BATTLE_FFA].includes(this.type);
  },
  is1v1() {
    return this.type === BATTLE_1V1;
  },
  isDuos() {
    return [RACE_ITEMS_DUOS, RACE_ITEMLESS_DUOS, BATTLE_DUOS].includes(this.type);
  },
  is3v3() {
    return [RACE_ITEMS_3V3, RACE_KRUNKING, BATTLE_3V3].includes(this.type);
  },
  is4v4() {
    return [RACE_ITEMS_4V4, RACE_ITEMLESS_4V4, BATTLE_4V4].includes(this.type);
  },
  isSurvival() {
    return [RACE_SURVIVAL, BATTLE_SURVIVAL].includes(this.type);
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
  isCustom() {
    return this.type === CUSTOM;
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
        [RACE_KRUNKING]: 12,
        [RACE_ITEMLESS_FFA]: 8,
        [RACE_ITEMLESS_DUOS]: 16,
        [RACE_ITEMLESS_4V4]: 16,
        [BATTLE_1V1]: 4,
        [BATTLE_FFA]: 8,
        [BATTLE_DUOS]: 8,
        [BATTLE_3V3]: 12,
        [BATTLE_4V4]: 8,
        [BATTLE_SURVIVAL]: 8,
        [CUSTOM]: 4,
      };
    } else {
      minimumPlayers = {
        [RACE_ITEMS_FFA]: 4,
        [RACE_ITEMS_DUOS]: 6,
        [RACE_ITEMS_3V3]: 6,
        [RACE_ITEMS_4V4]: 8,
        [RACE_SURVIVAL]: 8,
        [RACE_KRUNKING]: 6,
        [RACE_ITEMLESS_FFA]: 4,
        [RACE_ITEMLESS_DUOS]: 6,
        [RACE_ITEMLESS_4V4]: 8,
        [BATTLE_1V1]: 2,
        [BATTLE_FFA]: 4,
        [BATTLE_DUOS]: 4,
        [BATTLE_3V3]: 6,
        [BATTLE_4V4]: 8,
        [BATTLE_SURVIVAL]: 8,
        [CUSTOM]: 2,
      };
    }

    return minimumPlayers[this.type];
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
      [RACE_KRUNKING]: 6,
      [RACE_ITEMLESS_FFA]: 4,
      [RACE_ITEMLESS_DUOS]: 8,
      [RACE_ITEMLESS_4V4]: 8,
      [BATTLE_1V1]: 2,
      [BATTLE_FFA]: 4,
      [BATTLE_DUOS]: 4,
      [BATTLE_3V3]: 6,
      [BATTLE_4V4]: 8,
      [BATTLE_SURVIVAL]: 8,
      [CUSTOM]: 8,
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
        [RACE_KRUNKING]: 48,
        [RACE_ITEMLESS_FFA]: 32,
        [RACE_ITEMLESS_DUOS]: 64,
        [RACE_ITEMLESS_4V4]: 64,
        [BATTLE_1V1]: 8,
        [BATTLE_FFA]: 32,
        [BATTLE_DUOS]: 32,
        [BATTLE_3V3]: 48,
        [BATTLE_4V4]: 64,
        [BATTLE_SURVIVAL]: 64,
        [CUSTOM]: 64,
      };
    } else {
      maxPlayers = {
        [RACE_ITEMS_FFA]: 8,
        [RACE_ITEMS_DUOS]: 8,
        [RACE_ITEMS_3V3]: 6,
        [RACE_ITEMS_4V4]: 8,
        [RACE_SURVIVAL]: 8,
        [RACE_KRUNKING]: 6,
        [RACE_ITEMLESS_FFA]: 8,
        [RACE_ITEMLESS_DUOS]: 8,
        [RACE_ITEMLESS_4V4]: 8,
        [BATTLE_1V1]: 2,
        [BATTLE_FFA]: 8,
        [BATTLE_DUOS]: 4,
        [BATTLE_3V3]: 6,
        [BATTLE_4V4]: 8,
        [BATTLE_SURVIVAL]: 8,
        [CUSTOM]: 8,
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
      [RACE_KRUNKING]: 5,
      [RACE_ITEMLESS_FFA]: 6,
      [RACE_ITEMLESS_DUOS]: 8,
      [RACE_ITEMLESS_4V4]: 8,
      [BATTLE_1V1]: 6,
      [BATTLE_FFA]: 5,
      [BATTLE_DUOS]: 6,
      [BATTLE_3V3]: 6,
      [BATTLE_4V4]: 8,
      [BATTLE_SURVIVAL]: 7,
      [CUSTOM]: 0,
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

    if (this.isRacing()) {
      if (!this.isItemless()) {
        if (this.isFFA()) {
          title += 'FFA';
        } else if (this.isDuos()) {
          title += 'Duos';
        } else if (this.is3v3() && this.type !== RACE_KRUNKING) {
          title += '3 vs. 3';
        } else if (this.is4v4()) {
          title += '4 vs. 4';
        } else if (this.isSurvival()) {
          title += 'Survival';
        } else if (this.type === RACE_KRUNKING) {
          title += 'Krunking';
        } else {
          title += UNKNOWN;
        }
      }

      if (this.isItemless()) {
        if (this.isFFA()) {
          title += 'Itemless FFA';
        } else if (this.isDuos()) {
          title += 'Itemless Duos';
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
      } else if (this.isSurvival()) {
        title += 'Battle Survival';
      } else {
        title += UNKNOWN;
      }
    }

    if (this.isCustom()) {
      title += 'Custom';
    }

    if (!this.isBattle() && !this.isRacing() && !this.isCustom()) {
      title += UNKNOWN;
    }

    if (this.isTournament()) {
      title += ' Tournament';
    } else {
      title += ' Lobby';
    }

    if (this.isRacing()) {
      if (this.draftTracks) {
        title += ' (Track Drafting)';
      } else if (this.pools) {
        title += ' (Track Pools)';
      } else if (this.isIronMan()) {
        title += ' (Iron Man)';
      } else {
        title += ' (Full RNG Tracks)';
      }
    } else if (this.isBattle()) {
      if (this.draftTracks) {
        title += ' (Arena Drafting)';
      } else if (this.pools) {
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
      [RACE_ITEMS_FFA]: 'https://vignette.wikia.nocookie.net/crashban/images/3/32/CTRNF-BowlingBomb.png',
      [RACE_ITEMS_DUOS]: 'https://vignette.wikia.nocookie.net/crashban/images/8/83/CTRNF-AkuUka.png',
      [RACE_ITEMS_3V3]: 'https://static.wikia.nocookie.net/crashban/images/f/fd/CTRNF-TripleMissile.png',
      [RACE_ITEMS_4V4]: 'https://i.imgur.com/3dvcaur.png',
      [RACE_SURVIVAL]: 'https://static.wikia.nocookie.net/crashban/images/f/fb/CTRNF-WarpOrb.png',
      [RACE_KRUNKING]: 'https://static.wikia.nocookie.net/crashban/images/8/81/CTRNF-Jurassic_Krunk_Icon.png',
      [RACE_ITEMLESS_FFA]: 'https://static.wikia.nocookie.net/crashban/images/b/b5/CTRNF-SuperEngine.png',
      [RACE_ITEMLESS_DUOS]: 'https://i.imgur.com/kTxPvij.png',
      [RACE_ITEMLESS_4V4]: 'https://static.wikia.nocookie.net/crashban/images/1/12/NF_Purple_Retro_Kart.png',
      [BATTLE_1V1]: 'https://static.wikia.nocookie.net/crashban/images/b/b9/CTRNF-NitroCrate.png',
      [BATTLE_FFA]: 'https://vignette.wikia.nocookie.net/crashban/images/9/97/CTRNF-Invisibility.png',
      [BATTLE_DUOS]: 'https://static.wikia.nocookie.net/crashban/images/5/5a/CTRNF-Master_Wheels.png',
      [BATTLE_3V3]: 'https://static.wikia.nocookie.net/crashban/images/d/d1/CTRNF-TripleBowlingBomb.png',
      [BATTLE_4V4]: 'https://i.imgur.com/aLFsltt.png',
      [BATTLE_SURVIVAL]: 'https://static.wikia.nocookie.net/crashban/images/2/29/Jelly_crown_sticker.png',
      [CUSTOM]: 'https://static.wikia.nocookie.net/crashban/images/e/eb/CTRNF-%3F_Crate_Iron_Checkpoint_Crate_icon.png',
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
      [RACE_KRUNKING]: 'Krunking',
      [RACE_ITEMLESS_FFA]: 'Itemless FFA',
      [RACE_ITEMLESS_DUOS]: 'Itemless Duos',
      [RACE_ITEMLESS_4V4]: 'Itemless 4v4',
      [BATTLE_1V1]: 'Battle 1v1',
      [BATTLE_FFA]: 'Battle FFA',
      [BATTLE_DUOS]: 'Battle Duos',
      [BATTLE_3V3]: 'Battle 3v3',
      [BATTLE_4V4]: 'Battle 4v4',
      [BATTLE_SURVIVAL]: 'Battle Survival',
      [CUSTOM]: 'Custom',
    };

    roleName += modeNames[this.type];

    return roleName;
  },
  getColor() {
    if (this.isTournament()) {
      return 16318337; // Yellow
    }

    const colors = {
      [RACE_ITEMS_FFA]: 3707391, // Medium Blue
      [RACE_ITEMS_DUOS]: 16732141, // Medium Pink
      [RACE_ITEMS_3V3]: 16724019, // Medium Red
      [RACE_ITEMS_4V4]: 9568066, // Medium Green
      [RACE_SURVIVAL]: 7204341, // Light Blue
      [RACE_KRUNKING]: 3369831, // Dark Teal
      [RACE_ITEMLESS_FFA]: 16747320, // Medium Orange
      [RACE_ITEMLESS_DUOS]: 0, // Black
      [RACE_ITEMLESS_4V4]: 5650319, // Dark Purple
      [BATTLE_1V1]: 3704120, // Acid Green
      [BATTLE_FFA]: 15856113, // Silver
      [BATTLE_DUOS]: 7944547, // Dark Magenta
      [BATTLE_3V3]: 4016232, // Grey Blue
      [BATTLE_4V4]: 11299064, // Medium Purple
      [BATTLE_SURVIVAL]: 14530048, // Medium Yellow
      [CUSTOM]: 8602134, // Dark Brown
    };

    return colors[this.type];
  },
  getLobbyEndCooldown() {
    if (this.isCustom()) {
      return null;
    }

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
    if (this.isCustom()) {
      return null;
    }

    // 1. Adding allowed 2 Minute breaks between races, at most 3 times per lobby
    // 2. Assuming every player takes 1.5 Minutes to join
    // 3. Adding 1.5 Minutes per Race/Battle due to load screen
    let remindMinutesMax = 6 + (this.players.length * 1.5) + (this.trackCount * 1.5);

    // Drafting takes 5 more minutes
    if (this.draftTracks) {
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
    if (this.isCustom()) {
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
      [RACE_KRUNKING]: 37,
      [RACE_ITEMLESS_FFA]: 37,
      [RACE_ITEMLESS_DUOS]: 37,
      [RACE_ITEMLESS_4V4]: 37,
      [BATTLE_1V1]: 12,
      [BATTLE_FFA]: 12,
      [BATTLE_DUOS]: 12,
      [BATTLE_3V3]: 12,
      [BATTLE_4V4]: 12,
      [BATTLE_SURVIVAL]: 7,
      [CUSTOM]: 0,
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
      [RACE_KRUNKING]: 5,
      [RACE_ITEMLESS_FFA]: 3,
      [RACE_ITEMLESS_DUOS]: 3,
      [RACE_ITEMLESS_4V4]: 3,
      [BATTLE_1V1]: 1,
      [BATTLE_FFA]: 1,
      [BATTLE_DUOS]: 1,
      [BATTLE_3V3]: 1,
      [BATTLE_4V4]: 1,
      [BATTLE_SURVIVAL]: 1,
      [CUSTOM]: 1,
    };

    return defaultLapCount[this.type];
  },
  isIronMan() {
    // eslint-disable-next-line max-len
    return (this.trackCount === this.getMaxTrackCount() && !this.isTournament() && !this.isSurvival());
  },
  getTrackOptions() {
    if (this.isCustom()) {
      return [];
    }

    // all lobby types at least have full rng and pools
    const trackOptions = [
      TRACK_OPTION_RNG,
      TRACK_OPTION_POOLS,
    ];

    if (this.isStandard()) {
      // Iron Man is available for all lobby types except tournaments
      trackOptions.push(TRACK_OPTION_IRON_MAN);
    }

    if (this.isWar()) {
      // drafting for all 3 vs. 3 / 4 vs. 4 modes
      trackOptions.push(TRACK_OPTION_DRAFT);
    }

    return trackOptions;
  },
  getBannedTracks() {
    let bannedTracks;
    if (!this.region) {
      bannedTracks = {
        [RACE_ITEMS_FFA]: [TRACK_HYPER_SPACEWAY, TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_DUOS]: [TRACK_HYPER_SPACEWAY, TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_3V3]: [TRACK_HYPER_SPACEWAY, TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_4V4]: [TRACK_HYPER_SPACEWAY, TRACK_SPYRO_CIRCUIT],
        [RACE_SURVIVAL]: [TRACK_HYPER_SPACEWAY],
        [RACE_KRUNKING]: [TRACK_HYPER_SPACEWAY],
        [RACE_ITEMLESS_FFA]: [TRACK_DRAGON_MINES, TRACK_HYPER_SPACEWAY],
        [RACE_ITEMLESS_DUOS]: [TRACK_DRAGON_MINES, TRACK_HYPER_SPACEWAY],
        [RACE_ITEMLESS_4V4]: [TRACK_DRAGON_MINES, TRACK_HYPER_SPACEWAY],
        [BATTLE_1V1]: [],
        [BATTLE_FFA]: [],
        [BATTLE_DUOS]: [],
        [BATTLE_3V3]: [],
        [BATTLE_4V4]: [],
        [BATTLE_SURVIVAL]: [],
        [CUSTOM]: [],
      };
    } else {
      bannedTracks = {
        [RACE_ITEMS_FFA]: [TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_DUOS]: [TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_3V3]: [TRACK_SPYRO_CIRCUIT],
        [RACE_ITEMS_4V4]: [TRACK_SPYRO_CIRCUIT],
        [RACE_SURVIVAL]: [],
        [RACE_KRUNKING]: [],
        [RACE_ITEMLESS_FFA]: [TRACK_DRAGON_MINES],
        [RACE_ITEMLESS_DUOS]: [TRACK_DRAGON_MINES],
        [RACE_ITEMLESS_4V4]: [TRACK_DRAGON_MINES],
        [BATTLE_1V1]: [],
        [BATTLE_FFA]: [],
        [BATTLE_DUOS]: [],
        [BATTLE_3V3]: [],
        [BATTLE_4V4]: [],
        [BATTLE_SURVIVAL]: [],
        [CUSTOM]: [],
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
      [RACE_KRUNKING]: 1200,
      [RACE_ITEMLESS_FFA]: 1200,
      [RACE_ITEMLESS_DUOS]: 1200,
      [RACE_ITEMLESS_4V4]: 1200,
      [BATTLE_1V1]: 1200,
      [BATTLE_FFA]: 1200,
      [BATTLE_DUOS]: 1200,
      [BATTLE_3V3]: 1200,
      [BATTLE_4V4]: 1200,
      [BATTLE_SURVIVAL]: 1200,
      [CUSTOM]: 1200,
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
  getReactionEmote() {
    return '✅';
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
      [RACE_KRUNKING]: false,
      [RACE_ITEMLESS_FFA]: true,
      [RACE_ITEMLESS_DUOS]: false,
      [RACE_ITEMLESS_4V4]: false,
      [BATTLE_1V1]: false,
      [BATTLE_FFA]: false,
      [BATTLE_DUOS]: false,
      [BATTLE_3V3]: false,
      [BATTLE_4V4]: false,
      [BATTLE_SURVIVAL]: false,
      [CUSTOM]: false,
    };

    return enabled[this.type];
  },
};

module.exports.Lobby = model('lobby', Lobby);
