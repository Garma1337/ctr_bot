const fs = require('fs');

/**
 * Returns a random array element
 * @param array
 * @returns {*}
 */
function getRandomElement(array) {
  const randomKey = Math.floor((array.length - 1) * Math.random());
  return array[randomKey];
}

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
      'No U-Turning',
      'No Jumps',
      'Only steering left',
      'Only steering right',
      'No Acceleration',
    ];

    for (let i = 1; i <= count; i += 1) {
      let randomCheat;
      const useRandomCheat = Math.random() > 0.35;
      if (useRandomCheat) {
        randomCheat = getRandomElement(cheats);
      } else {
        randomCheat = '-';
      }

      let randomTrack;
      let mirrorMode = false;
      let difficulty = null;
      const randomMode = getRandomElement(modes);
      if (raceModes.find((r) => r === randomMode)) {
        randomTrack = getRandomElement(raceTracks);

        if (Math.random() > 0.5) {
          mirrorMode = true;
        }

        if (['Relic Race', 'CTR Challenge'].includes(randomMode)) {
          difficulty = getRandomElement(difficulties);
        }
      } else {
        randomTrack = getRandomElement(battleTracks);
      }

      let randomCondition;
      const useCondition = Math.random() > 0.15;
      if (useCondition) {
        if (battleModes.includes(randomMode)) {
          conditions.splice(0, 1);
        }

        randomCondition = getRandomElement(conditions);
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
