const fs = require('fs');
const getRandomArrayElement = require('../utils/getRandomArrayElement');

module.exports = {
  name: 'generate_challenges',
  description: 'Generates challenge ideas from different modes.',
  guildOnly: true,
  permissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  aliases: ['gc'],
  execute(message, args) {
    let count = 1;
    if (args.length > 0) {
      count = parseInt(args[0], 10);

      if (count > 10) {
        return message.channel.send('You cannot generate more than 10 challenges at once.');
      }
    }

    const cheats = [
      'Icy Tracks',
      'STP',
      'Infinite Mask',
      'Infinite Turbo',
      'Infinite Bombs',
    ];

    const raceModes = [
      'Time Trial',
      'Ring Rally',
      'Relic Race',
      'CTR Challenge',
    ];

    const difficulties = [
      'Easy',
      'Medium',
      'Hard',
    ];

    const battleModes = [
      'Battle Mode',
      'Crystal Grab',
    ];

    const modes = raceModes.concat(battleModes);

    const raceTracks = fs.readFileSync('tracks.txt', 'utf8').split('\n');
    const battleTracks = fs.readFileSync('battle_tracks.txt', 'utf8').split('\n');

    const conditions = [
      'No Turbo Pads',
      'No Powersliding',
      'No Jumps',
      'Only steering left',
      'Only steering right',
      'No Acceleration',
      'No Blue Fire Pads',
      'Reverse Camera in Lap 3',
      'Full Reverse Camera',
      'Driving Backwards',
      'Blue Fire = USF',
    ];

    for (let i = 1; i <= count; i += 1) {
      let randomCheat;
      const useRandomCheat = Math.random() > 0.35;
      if (useRandomCheat) {
        randomCheat = getRandomArrayElement(cheats);
      } else {
        randomCheat = '-';
      }

      let randomTrack;
      let mirrorMode = false;
      let difficulty = null;
      const randomMode = getRandomArrayElement(modes);
      if (raceModes.find((r) => r === randomMode)) {
        randomTrack = getRandomArrayElement(raceTracks);

        if (Math.random() > 0.5) {
          mirrorMode = true;
        }

        if (['Relic Race', 'CTR Challenge'].includes(randomMode)) {
          difficulty = getRandomArrayElement(difficulties);
        }
      } else {
        randomTrack = getRandomArrayElement(battleTracks);
      }

      let randomCondition;
      const useCondition = Math.random() > 0.35;
      if (useCondition) {
        if (battleModes.includes(randomMode)) {
          conditions.splice(0, 1);
        }

        randomCondition = getRandomArrayElement(conditions);
      } else {
        randomCondition = '-';
      }

      const output = `Here is an idea for a challenge:
\`\`\`
Cheat: ${randomCheat}
Mode: ${randomMode}${difficulty ? ` (Difficulty: ${difficulty})` : ''}
Track: ${randomTrack}${mirrorMode ? ' (Mirror Mode)' : ''}
Condition: ${randomCondition}
\`\`\``;

      message.channel.send(output);
    }

    return true;
  },
};
