const moment = require('moment');
const { Player } = require('../db/models/player');
const createPageableContent = require('../utils/createPageableContent');
const sendAlertMessage = require('../utils/sendAlertMessage');
const sortObject = require('../utils/sortObject');
const { regions } = require('../db/regions');
const { consoles } = require('../db/consoles');

module.exports = {
  name: 'stats',
  description: 'See various statistics',
  guildOnly: true,
  aliases: ['statistics'],
  cooldown: 15,
  // eslint-disable-next-line consistent-return
  async execute(message, args) {
    const types = [
      'regions',
      'languages',
      'birthdays',
      'voice_chat',
      'nat_types',
      'time_zones',
      'characters',
      'tracks',
      'arenas',
      'consoles',
    ];

    const type = args[0];
    if (!types.includes(type)) {
      return sendAlertMessage(message.channel, `Invalid type. Here is a list of all available statistics types:\n
\`\`\`${types.join('\n')}\`\`\``, 'warning');
    }

    const players = await Player.find();
    const elements = [];
    let embedHeading;

    switch (type) {
      case 'regions':
        embedHeading = 'Regions';
        // eslint-disable-next-line no-case-declarations
        let playerRegions = {};

        players.forEach((p) => {
          if (p.region) {
            if (!playerRegions[p.region]) {
              playerRegions[p.region] = 1;
            } else {
              playerRegions[p.region] += 1;
            }
          }
        });

        playerRegions = sortObject(playerRegions);

        // eslint-disable-next-line guard-for-in
        for (const i in playerRegions) {
          const region = regions.find((r) => r.uid === i);

          elements.push(`${region.name} - ${playerRegions[i]} players`);
        }
        break;

      case 'languages':
        embedHeading = 'Most spoken languages';
        // eslint-disable-next-line no-case-declarations
        let languages = {};

        players.forEach((p) => {
          p.languages.forEach((l) => {
            if (!languages[l]) {
              languages[l] = 1;
            } else {
              languages[l] += 1;
            }
          });
        });

        languages = sortObject(languages);

        // eslint-disable-next-line guard-for-in
        for (const i in languages) {
          elements.push(`${i} - ${languages[i]} players`);
        }

        break;

      case 'birthdays':
        embedHeading = 'Most common birthdays';
        // eslint-disable-next-line no-case-declarations
        let birthdays = {};

        players.forEach((p) => {
          if (p.birthday) {
            const birthday = moment(p.birthday);

            if (birthday.isValid()) {
              const year = Number(birthday.year());

              if (!birthdays[year]) {
                birthdays[year] = 1;
              } else {
                birthdays[year] += 1;
              }
            }
          }
        });

        birthdays = sortObject(birthdays);

        // eslint-disable-next-line guard-for-in
        for (const i in birthdays) {
          elements.push(`${i} - ${birthdays[i]} players`);
        }
        break;

      case 'voice_chat':
        embedHeading = 'Most used voice chats';
        // eslint-disable-next-line no-case-declarations
        let discordVc = 0;
        // eslint-disable-next-line no-case-declarations
        let ps4Vc = 0;

        players.forEach((p) => {
          if (p.discordVc) {
            discordVc += 1;
          }

          if (p.ps4Vc) {
            ps4Vc += 1;
          }
        });

        elements.push(`Discord - ${discordVc} players`);
        elements.push(`PS4 - ${ps4Vc} players`);
        break;

      case 'nat_types':
        embedHeading = 'Most common NAT types';
        // eslint-disable-next-line no-case-declarations
        let natTypes = {};

        players.forEach((p) => {
          if (p.nat) {
            if (!natTypes[p.nat]) {
              natTypes[p.nat] = 1;
            } else {
              natTypes[p.nat] += 1;
            }
          }
        });

        natTypes = sortObject(natTypes);

        // eslint-disable-next-line guard-for-in
        for (const i in natTypes) {
          elements.push(`${i} - ${natTypes[i]} players`);
        }
        break;

      case 'time_zones':
        embedHeading = 'Most common time zones';
        // eslint-disable-next-line no-case-declarations
        let timeZones = {};

        players.forEach((p) => {
          if (p.timeZone) {
            if (!timeZones[p.timeZone]) {
              timeZones[p.timeZone] = 1;
            } else {
              timeZones[p.timeZone] += 1;
            }
          }
        });

        timeZones = sortObject(timeZones);

        // eslint-disable-next-line guard-for-in
        for (const i in timeZones) {
          elements.push(`${i} - ${timeZones[i]} players`);
        }
        break;

      case 'characters':
        embedHeading = 'Most favorited Characters';
        // eslint-disable-next-line no-case-declarations
        let characters = {};

        players.forEach((p) => {
          if (p.favCharacter) {
            if (!characters[p.favCharacter]) {
              characters[p.favCharacter] = 1;
            } else {
              characters[p.favCharacter] += 1;
            }
          }
        });

        characters = sortObject(characters);

        // eslint-disable-next-line guard-for-in
        for (const i in characters) {
          elements.push(`${i} - ${characters[i]} players`);
        }
        break;

      case 'tracks':
        embedHeading = 'Most favorited tracks';
        // eslint-disable-next-line no-case-declarations
        let tracks = {};

        players.forEach((p) => {
          if (p.favTrack) {
            if (!tracks[p.favTrack]) {
              tracks[p.favTrack] = 1;
            } else {
              tracks[p.favTrack] += 1;
            }
          }
        });

        tracks = sortObject(tracks);

        // eslint-disable-next-line guard-for-in
        for (const i in tracks) {
          elements.push(`${i} - ${tracks[i]} players`);
        }
        break;

      case 'arenas':
        embedHeading = 'Most favorited arenas';
        // eslint-disable-next-line no-case-declarations
        let arenas = {};

        players.forEach((p) => {
          if (p.favArena) {
            if (!arenas[p.favArena]) {
              arenas[p.favArena] = 1;
            } else {
              arenas[p.favArena] += 1;
            }
          }
        });

        arenas = sortObject(arenas);

        // eslint-disable-next-line guard-for-in
        for (const i in arenas) {
          elements.push(`${i} - ${arenas[i]} players`);
        }
        break;

      case 'consoles':
        embedHeading = 'Most used consoles';
        // eslint-disable-next-line no-case-declarations
        let playerConsoles = {};

        players.forEach((p) => {
          p.consoles.forEach((console) => {
            if (!playerConsoles[console]) {
              playerConsoles[console] = 1;
            } else {
              playerConsoles[console] += 1;
            }
          });
        });

        playerConsoles = sortObject(playerConsoles);

        // eslint-disable-next-line guard-for-in
        for (const i in playerConsoles) {
          const console = consoles.find((c) => c.tag === i);

          elements.push(`${console.name} - ${playerConsoles[i]} players`);
        }
        break;
      default:
        break;
    }

    createPageableContent(message.channel, message.author.id, {
      outputType: 'embed',
      elements,
      elementsPerPage: 20,
      embedOptions: { heading: embedHeading },
      reactionCollectorOptions: { time: 3600000 },
    });
  },
};
