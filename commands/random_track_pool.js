const { Lobby } = require('../db/models/lobby');
const generateTracks = require('../utils/generateTracks');
const sendAlertMessage = require('../utils/sendAlertMessage');

const {
  RACE_FFA,
  BATTLE_FFA,
} = require('../db/models/lobby');

module.exports = {
  name: 'rng_ffa',
  description: 'Picks random tracks from existing track pools',
  guildOnly: true,
  aliases: ['rng_mogi', 'rng_pools'],
  execute(message, args) {
    let number = 1;
    if (args.length) {
      number = Number(args[0]);
    }

    const filter = (m) => m.author.id === message.author.id;
    const options = { max: 1, time: 60000, errors: ['time'] };

    return sendAlertMessage(message.channel, `Select a pool to pick from. Waiting 1 minute.
\`\`\`1 - Race Tracks
2 - Battle Maps\`\`\``, 'info').then((confirmMessage) => {
      message.channel.awaitMessages(filter, options).then((collected) => {
        const collectedMessage = collected.first();
        const { content } = collectedMessage;
        collectedMessage.delete();

        if (['1', '2'].includes(content)) {
          confirmMessage.delete();
          sendAlertMessage(message.channel, 'Randomizing...', 'info').then((m) => {
            let type;

            switch (content) {
              case '1':
                type = RACE_FFA;
                break;
              case '2':
                type = BATTLE_FFA;
                break;
              default:
                break;
            }

            const lobby = new Lobby();
            lobby.type = type;
            lobby.pools = true;
            lobby.trackCount = number;

            generateTracks(lobby).then((maps) => {
              m.delete();
              sendAlertMessage(message.channel, `${maps.map((map, i) => `${i + 1}. ${map}`).join('\n')}`, 'success');
            });
          });
        } else {
          throw new Error('cancel');
        }
      }).catch(() => {
        confirmMessage.delete();
        sendAlertMessage(message.channel, 'Command cancelled.', 'error');
      });
    });
  },
};
