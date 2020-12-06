module.exports.battleModes = [
  [
    {
      name: 'Basic Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        'Power-ups: **DISABLED**: Beaker, Triple Missile and Triple Bomb',
      ],
      tracks: [],
    },
    {
      name: 'Balanced Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        'Power-ups: **DISABLED**: TNT, Beaker, Mask, Super Engine, Triple Missile and Triple Bomb',
      ],
      tracks: [],
    },
    {
      name: 'Bomb Limit Battle',
      settings: [
        'Game Mode: Limit Battle',
        'Type: Time',
        'Time Limit: 6 minutes',
        'Power-ups: **ENABLED ONLY**: Single Bomb',
      ],
      tracks: [],
    },
  ],
  [
    {
      name: 'Balanced Last Kart Driving',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        'Power-ups: **DISABLED**: Beaker, Shield, Mask, Invisibility, Super Engine, Triple Missile and Triple Bomb',
      ],
      tracks: [],
    },
    {
      name: 'Bomb Snipe Mode',
      settings: [
        'Game Mode: Last Kart Driving',
        'Life Limit: 9 lives',
        'Time Limit: 6 minutes',
        'Power-ups: **ENABLED ONLY**: Single Bomb and Turbo Canister',
      ],
      tracks: [],
    },
  ],
  [
    {
      name: 'Balanced Steal The Bacon',
      settings: [
        'Game Mode: Steal The Bacon',
        'Time Limit: 6 minutes',
        'Point Limit: 9 points',
        'Power-ups: **ENABLED ONLY**: Single Bomb, Single Missile and Turbo Canister',
      ],
      tracks: [
        'Rampage Ruins',
        'Nitro Court',
        'Parking Lot',
        'North Bowl',
        'Frozen Frenzy',
      ],
    },
    {
      name: 'Sneaky Steal The Bacon',
      settings: [
        'Game Mode: Steal The Bacon',
        'Time Limit: 6 minutes',
        'Point Limit: 9 points',
        'Power-ups: **ENABLED ONLY**: Single Bomb, Single Missile and Invisibility',
      ],
      tracks: [
        'Rampage Ruins',
        'Nitro Court',
        'Parking Lot',
        'North Bowl',
        'Frozen Frenzy',
      ],
    },
  ],
];
