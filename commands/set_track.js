const fs = require('fs');
const { Player } = require('../db/models/player');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_track',
  usage: '[track]',
  description: 'Set your favorite track.',
  guildOnly: true,
  execute(message, args) {
    fs.readFile('tracks.txt', 'utf8', (err, data) => {
      if (err) {
        throw err;
      }

      const tracks = data.trim().split('\n');
      tracks.push('Retro Stadium');

      if (args.length < 1) {
        const column1 = tracks.slice(0, 15);
        const column2 = tracks.slice(15, 30);
        const column3 = tracks.slice(30);

        sendAlertMessage(message.channel, 'You need to specify a track. Here is the list of available tracks:', 'warning');
        return message.channel.send({
          embed: {
            author: {
              name: 'Select your favorite track!',
            },
            fields: [
              {
                name: 'Tracks',
                value: column1.join('\n'),
                inline: true,
              },
              {
                name: '\u200B',
                value: column2.join('\n'),
                inline: true,
              },
              {
                name: '\u200B',
                value: column3.join('\n'),
                inline: true,
              },
            ],
          },
        });
      }

      const input = args.join(' ').trim();
      const track = tracks.find((t) => t.toLowerCase() === input.toLowerCase());

      if (!track) {
        return sendAlertMessage(message.channel, `The track "${input}" doesn't exist.`, 'warning');
      }

      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.favTrack = track;
        player.save().then(() => {
          sendAlertMessage(message.channel, `Your favorite track has been set to "${track}".`, 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });
    });
  },
};
