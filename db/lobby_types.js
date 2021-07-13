const {
  RACE_FFA,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
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
} = require('./models/lobby');

module.exports.lobbyTypes = [
  {
    name: 'FFA',
    uid: RACE_FFA,
    default: true,
  },
  {
    name: 'Duos',
    uid: RACE_DUOS,
    default: false,
  },
  {
    name: '3 vs. 3',
    uid: RACE_3V3,
    default: false,
  },
  {
    name: '4 vs. 4',
    uid: RACE_4V4,
    default: false,
  },
  {
    name: 'Survival',
    uid: RACE_SURVIVAL,
    default: false,
  },
  {
    name: 'Itemless 1 vs. 1',
    uid: RACE_ITEMLESS_1V1,
    default: false,
  },
  {
    name: 'Itemless FFA',
    uid: RACE_ITEMLESS_FFA,
    default: false,
  },
  {
    name: 'Itemless Duos',
    uid: RACE_ITEMLESS_DUOS,
    default: false,
  },
  {
    name: 'Itemless 3 vs. 3',
    uid: RACE_ITEMLESS_3V3,
    default: false,
  },
  {
    name: 'Itemless 4 vs. 4',
    uid: RACE_ITEMLESS_4V4,
    default: false,
  },
  {
    name: 'Battle 1 vs. 1',
    uid: BATTLE_1V1,
    default: false,
  },
  {
    name: 'Battle FFA',
    uid: BATTLE_FFA,
    default: false,
  },
  {
    name: 'Battle Duos',
    uid: BATTLE_DUOS,
    default: false,
  },
  {
    name: 'Battle 3 vs. 3',
    uid: BATTLE_3V3,
    default: false,
  },
  {
    name: 'Battle 4 vs. 4',
    uid: BATTLE_4V4,
    default: false,
  },
];
