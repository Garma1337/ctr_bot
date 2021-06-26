const fs = require('fs');
const config = require('../config');
const { Player } = require('../db/models/player');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_arena',
  usage: '[arena]',
  description: 'Set your favorite arena.',
  guildOnly: true,
  cooldown: 10,
  execute(message, args) {
    // eslint-disable-next-line consistent-return
    fs.readFile(config.files.battle_arenas_file, 'utf8', (err, data) => {
      if (err) {
        throw err;
      }

      const arenas = data.trim().split('\n');

      if (args.length < 1) {
        sendAlertMessage(message.channel, 'You need to specify a arena. Here is the list of available arenas:', 'warning');
        return message.channel.send({
          embed: {
            author: {
              name: 'Select your favorite arena!',
            },
            fields: [
              {
                name: 'Arenas',
                value: arenas.join('\n'),
                inline: true,
              },
            ],
          },
        });
      }

      const input = args.join(' ').trim();
      const arena = arenas.find((t) => t.toLowerCase() === input.toLowerCase());

      if (!arena) {
        return sendAlertMessage(message.channel, `The arena "${input}" doesn't exist.`, 'warning');
      }

      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.favArena = arena;
        player.save().then(() => {
          sendAlertMessage(message.channel, `Your favorite arena has been set to "${arena}".`, 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });
    });
  },
};
