const fs = require('fs');
const config = require('../config');
const getRandomArrayElement = require('../utils/getRandomArrayElement');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'rng',
  description: 'Picks random tracks from the list of all tracks.',
  guildOnly: true,
  aliases: ['random_track'],
  // eslint-disable-next-line consistent-return
  execute(message, args) {
    let number = 1;
    if (args.length) {
      number = Number(args[0]);
    }

    const limits = {
      1: {
        min: 1,
        max: 40,
      },
      2: {
        min: 1,
        max: 12,
      },
    };

    const filter = (m) => m.author.id === message.author.id;
    const options = { max: 1, time: 60000, errors: ['time'] };

    sendAlertMessage(message.channel, `Select a pool to pick from. Waiting 1 minute
\`\`\`1 - Race Tracks
2 - Battle Maps\`\`\``, 'info').then((m) => {
      // eslint-disable-next-line consistent-return
      message.channel.awaitMessages(filter, options).then((collected) => {
        m.delete();

        const collectedMessage = collected.first();
        const { content } = collectedMessage;
        const option = parseInt(content, 10);

        if (![1, 2].includes(option)) {
          return sendAlertMessage(message.channel, 'Invalid option.', 'warning');
        }

        let file;
        switch (option) {
          case 1:
            file = config.files.tracks_file;
            break;
          case 2:
            file = config.files.battle_maps_file;
            break;
          default:
            break;
        }

        // eslint-disable-next-line no-restricted-globals
        if (isNaN(number) || number < limits[option].min || number > limits[option].max) {
          return sendAlertMessage(message.channel, `Please enter a number between \`${limits[option].min}\` and \`${limits[option].max}\`.`, 'warning');
        }

        fs.readFile(file, 'utf8', (err, data) => {
          if (err) {
            throw err;
          }

          const tracks = data.trim().split('\n');
          if (option === 1) {
            tracks.push('Retro Stadium');
          }

          const randomTracks = [];

          for (let i = 0; i < number; i += 1) {
            const randomTrack = getRandomArrayElement(tracks);
            const index = tracks.findIndex((t) => t === randomTrack);

            tracks.splice(index, 1);
            randomTracks.push(randomTrack);
          }

          sendAlertMessage(message.channel, `${randomTracks.map((r, i) => `${i + 1}. ${r}`).join('\n')}`, 'success');
        });
      }).catch(() => {
        m.delete();
        sendAlertMessage(message.channel, 'Command cancelled.', 'error');
      });
    });
  },
};
