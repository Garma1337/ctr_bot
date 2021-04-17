const { client } = require('../bot');

const turboCanister = client.getEmote('turboCanister', '813098480339124285');
const superEngine = client.getEmote('superEngine', '813098478825766933');
const tripleBomb = client.getEmote('tripleBomb', '813098480477536276');
const greenBeaker = client.getEmote('greenBeaker', '813098480461283358');
const greenShield = client.getEmote('greenShield', '813098480444506132');
const tnt = client.getEmote('tnt', '813098480464560148');
const invisibility = client.getEmote('invisibility', '813098478619721728');
const missile = client.getEmote('missile', '813098480025075732');
const bomb = client.getEmote('bomb', '813098480495099914');
const akuMask = client.getEmote('akuMask', '813098480381329449');
const tripleMissile = client.getEmote('tripleMissile', '813098480179347486');

module.exports.battleModesSolos = [
  [
    {
      name: 'Basic Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        `Power-ups: **DISABLED**: ${greenBeaker}, ${tripleMissile} and ${tripleBomb}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
    {
      name: 'Balanced Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        `Power-ups: **DISABLED**: ${tnt}, ${greenBeaker}, ${akuMask}, ${superEngine}, ${tripleMissile} and ${tripleBomb}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
    {
      name: 'Bomb Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        `Power-ups: **ENABLED ONLY**: ${bomb}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
  ],
  [
    {
      name: 'Balanced Last Kart Driving',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Power-ups: **DISABLED**: ${greenBeaker}, ${greenShield}, ${akuMask}, ${invisibility}, ${superEngine}, ${tripleMissile} and ${tripleBomb}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
    {
      name: 'Bomb Snipe Mode',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Power-ups: **ENABLED ONLY**: ${bomb} and ${turboCanister}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
  ],
  [
    {
      name: 'Balanced Steal The Bacon',
      settings: [
        'Game Mode: Steal The Bacon',
        'Time Limit: 6 minutes',
        'Point Limit: 9 points',
        `Power-ups: **ENABLED ONLY**: ${bomb}, ${missile} and ${turboCanister}`,
      ],
      maps: [
        'Rampage Ruins',
        'Nitro Court',
        'Parking Lot',
        'North Bowl',
        'Frozen Frenzy',
      ],
      maxPlayers: 4,
    },
  ],
];

module.exports.battleModesTeams = [
  [
    {
      name: 'Basic Last Kart Driving',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Power-ups: **DISABLED**: ${greenShield}, ${tripleMissile} and ${tripleBomb}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
    {
      name: 'Balanced Last Kart Driving',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Power-ups: **DISABLED**: ${greenBeaker}, ${greenShield}, ${akuMask}, ${invisibility}, ${superEngine}, ${tripleMissile} and ${tripleBomb}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
    {
      name: 'Bomb Snipe Mode',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Power-ups: **ENABLED ONLY**: ${bomb} and ${turboCanister}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
    {
      name: 'Minefield',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Power-ups: **ENABLED ONLY**: ${greenBeaker}, ${tnt} and ${turboCanister}`,
      ],
      maps: [
        'Nitro Court',
        'Parking Lot',
        'Lab Basement',
        'Frozen Frenzy',
      ],
      maxPlayers: 8,
    },
  ],
  [
    {
      name: 'Crystal Grab',
      settings: [
        'Game Mode: Crystal Grab',
        'Time Limit: 6 minutes',
        `Power-ups: **DISABLED**: ${greenShield}, ${akuMask}, ${invisibility}, ${tripleMissile} and ${tripleBomb}`,
      ],
      maps: [],
      maxPlayers: 8,
    },
  ],
];
