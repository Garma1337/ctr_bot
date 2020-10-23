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
        return message.channel.send('You need to specify a character.');
      }

      const input = args.join(' ');
      const character = characters.find((c) => c.toLowerCase() === input.toLowerCase());

      if (!character) {
        return message.channel.send(`The character "${input}" doesn't exist.`);
      }

      Player.updateOne({ discordId: message.author.id }, { favCharacter: character }).exec();
      return message.channel.send(`Your favorite character has been set to "${character}".`);
    });
  },
};
