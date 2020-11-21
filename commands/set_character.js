const fs = require('fs');
const Player = require('../db/models/player');

module.exports = {
  name: 'set_character',
  usage: '[character]',
  description: 'Set your favorite character.',
  guildOnly: true,
  execute(message, args) {
    fs.readFile('characters.txt', 'utf8', (err, data) => {
      if (err) {
        throw err;
      }

      const characters = data.trim().split('\n');

      if (args.length < 1) {
        const column1 = characters.slice(0, 20);
        const column2 = characters.slice(20, 40);
        const column3 = characters.slice(40);

        message.channel.send('You need to specify a character. Here is the list of available characters:');
        return message.channel.send({
          embed: {
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
        return message.channel.send(`The character "${input}" doesn't exist.`);
      }

      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player) {
          player = new Player();
          player.discordId = message.author.id;
        }

        player.favCharacter = character;
        player.save().then(() => {
          message.channel.send(`Your favorite character has been set to "${character}".`);
        }).catch((error) => {
          message.channel.send(`Unable to update player. Error: ${error}`);
        });
      });
    });
  },
};
