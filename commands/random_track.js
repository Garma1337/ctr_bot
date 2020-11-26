const fs = require('fs');
const getRandomArrayElement = require('../utils/getRandomArrayElement');

module.exports = {
  name: 'rng',
  description: 'Picks random tracks from the list of all tracks.',
  guildOnly: true,
  aliases: ['random_track'],
  cooldown: 10,
  execute(message, args) {
    let number = 1;

    if (args.length) {
      number = Number(args[0]);

      if (isNaN(number) || number < 1 || number > 40) {
        return message.channel.send('Please enter a number between 1 and 40');
      }
    }

    fs.readFile('tracks.txt', 'utf8', (err, data) => {
      if (err) {
        throw err;
      }

      const tracks = data.trim().split('\n');
      tracks.push('Retro Stadium');

      const randomTracks = [];

      for (let i = 0; i < number; i++) {
        const randomTrack = getRandomArrayElement(tracks);
        const index = tracks.findIndex((t) => t === randomTrack);

        // Prevent track from appearing twice
        tracks.splice(index, 1);

        randomTracks.push(randomTrack);
      }

      message.channel.send(`\`\`\`${randomTracks.map((r, i) => `${i + 1}. ${r}`).join('\n')}\`\`\``);
    });
  },
};
