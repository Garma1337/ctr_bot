const fs = require('fs');
const config = require('../config');
const { Player } = require('../db/models/player');
const sendAlertMessage = require('../utils/sendAlertMessage');

module.exports = {
  name: 'set_character',
  usage: '[character]',
  description: 'Set your favorite character.',
  guildOnly: true,
  cooldown: 10,
  execute(message, args) {
    // eslint-disable-next-line consistent-return
    fs.readFile(config.files.characters_file, 'utf8', (err, data) => {
      if (err) {
        throw err;
      }

      const characters = data.trim().split('\n');

      if (args.length < 1) {
        const column1 = characters.slice(0, 20);
        const column2 = characters.slice(20, 40);
        const column3 = characters.slice(40);

        sendAlertMessage(message.channel, 'You need to specify a character. Here is the list of available characters:', 'warning');
        return message.channel.send({
          embed: {
            color: config.default_embed_color,
            author: {
              name: 'Select your favorite character!',
            },
            fields: [
              {
                name: 'Characters',
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
      const character = characters.find((c) => c.toLowerCase() === input.toLowerCase());

      if (!character) {
        return sendAlertMessage(message.channel, `The character "${input}" doesn't exist.`, 'warning');
      }

      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.favCharacter = character;
        player.save().then(() => {
          sendAlertMessage(message.channel, `Your favorite character has been set to "${character}".`, 'success');
        }).catch((error) => {
          sendAlertMessage(message.channel, `Unable to update player. Error: ${error}`, 'error');
        });
      });
    });
  },
};
