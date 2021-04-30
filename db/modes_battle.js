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

module.exports.battleModes1v1 = [
  [
    {
      name: 'Point Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Points',
        'Point Limit: 10',
        `Items: **ENABLED ONLY**: ${turboCanister}, ${superEngine}, ${tnt}, ${missile} and ${bomb}`,
        'Teams: None',
      ],
      arenas: [
        'Skull Rock',
        'Nitro Court',
        'Parking Lot',
        'Rocky Road',
        'Lab Basement',
        'Rampage Ruins',
        'The North Bowl',
        'Temple Turmoil',
        'Desert Storm',
      ],
      maxPlayers: 2,
    },
    {
      name: 'Time Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        `Items: **ENABLED ONLY**: ${turboCanister}, ${superEngine}, ${tnt}, ${missile} and ${bomb}`,
        'Teams: None',
      ],
      arenas: [
        'Skull Rock',
        'Nitro Court',
        'Parking Lot',
        'Rocky Road',
        'Lab Basement',
        'Rampage Ruins',
        'The North Bowl',
        'Temple Turmoil',
        'Desert Storm',
      ],
      maxPlayers: 2,
    },
  ],
  [
    {
      name: 'Bomb Snipe Mode',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Items: **ENABLED ONLY**: ${bomb} and ${turboCanister}`,
        'Teams: None',
      ],
      arenas: [
        'Skull Rock',
        'Nitro Court',
        'Parking Lot',
        'Rocky Road',
        'Lab Basement',
        'Rampage Ruins',
        'The North Bowl',
        'Temple Turmoil',
        'Desert Storm',
        'Magnetic Mayhem',
        'Terra Drome',
      ],
      maxPlayers: 2,
    },
  ],
  [
    {
      name: 'Crystal Grab',
      settings: [
        'Game Mode: Crystal Grab',
        'Time Limit: 6 minutes',
        `Items: **DISABLED**: ${greenShield}, ${akuMask}, ${invisibility}, ${tripleMissile} and ${tripleBomb}`,
        'Teams: None',
      ],
      arenas: [],
      maxPlayers: 2,
    },
  ],
  [
    {
      name: 'Basic Capture The Flag',
      settings: [
        'Game Mode: Capture The Flag',
        'Time Limit: 6 minutes',
        'Point Limit: 9 points',
        `Items: **DISABLED**: ${greenBeaker}, ${greenShield}, ${akuMask} and ${tripleMissile}`,
        'Teams: 2',
      ],
      arenas: [
        'Skull Rock',
        'Nitro Court',
        'Parking Lot',
        'Rocky Road',
        'Rampage Ruins',
        'Temple Turmoil',
        'Desert Storm',
        'Terra Drome',
      ],
      maxPlayers: 2,
    },
    {
      name: 'Balanced Capture The Flag',
      settings: [
        'Game Mode: Capture The Flag',
        'Time Limit: 6 minutes',
        'Point Limit: 9 points',
        `Items: **ENABLED ONLY**: ${turboCanister}, ${missile} and ${bomb}`,
        'Teams: 2',
      ],
      arenas: [
        'Skull Rock',
        'Nitro Court',
        'Parking Lot',
        'Rocky Road',
        'Rampage Ruins',
        'Temple Turmoil',
        'Desert Storm',
        'Terra Drome',
      ],
      maxPlayers: 2,
    },
  ],
];

module.exports.battleModesSolos = [
  [
    {
      name: 'Basic Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        `Items: **DISABLED**: ${greenBeaker}, ${tripleMissile} and ${tripleBomb}`,
        'Teams: None',
      ],
      arenas: [],
      maxPlayers: 8,
    },
    {
      name: 'Balanced Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        `Items: **DISABLED**: ${tnt}, ${greenBeaker}, ${akuMask}, ${superEngine}, ${tripleMissile} and ${tripleBomb}`,
        'Teams: None',
      ],
      arenas: [],
      maxPlayers: 8,
    },
    {
      name: 'Bomb Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        `Items: **ENABLED ONLY**: ${bomb}`,
        'Teams: None',
      ],
      arenas: [],
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
        `Items: **DISABLED**: ${greenBeaker}, ${greenShield}, ${akuMask}, ${invisibility}, ${superEngine}, ${tripleMissile} and ${tripleBomb}`,
        'Teams: None',
      ],
      arenas: [],
      maxPlayers: 8,
    },
    {
      name: 'Bomb Snipe Mode',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Items: **ENABLED ONLY**: ${bomb} and ${turboCanister}`,
        'Teams: None',
      ],
      arenas: [],
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
        `Items: **ENABLED ONLY**: ${bomb}, ${missile} and ${turboCanister}`,
        'Teams: 4',
      ],
      arenas: [
        'Rampage Ruins',
        'Nitro Court',
        'Parking Lot',
        'North Bowl',
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
        `Items: **DISABLED**: ${greenShield}, ${tripleMissile} and ${tripleBomb}`,
        'Teams: None',
      ],
      arenas: [],
      maxPlayers: 8,
    },
    {
      name: 'Balanced Last Kart Driving',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Items: **DISABLED**: ${greenBeaker}, ${greenShield}, ${akuMask}, ${invisibility}, ${superEngine}, ${tripleMissile} and ${tripleBomb}`,
        'Teams: None',
      ],
      arenas: [],
      maxPlayers: 8,
    },
    {
      name: 'Bomb Snipe Mode',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Items: **ENABLED ONLY**: ${bomb} and ${turboCanister}`,
        'Teams: None',
      ],
      arenas: [],
      maxPlayers: 8,
    },
    {
      name: 'Minefield',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        `Items: **ENABLED ONLY**: ${greenBeaker}, ${tnt} and ${turboCanister}`,
        'Teams: None',
      ],
      arenas: [
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
        'Time Limit: 3 minutes',
        `Items: **DISABLED**: ${greenShield}, ${akuMask}, ${invisibility}, ${tripleMissile} and ${tripleBomb}`,
        'Teams: None',
      ],
      arenas: [],
      maxPlayers: 8,
    },
  ],
];
