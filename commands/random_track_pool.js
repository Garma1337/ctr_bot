const rngPools = require('../utils/rngPools');
const {
  _4V4, BATTLE, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');

module.exports = {
  name: 'rng_ffa',
  description: 'Picks random tracks existing track pools',
  guildOnly: true,
  aliases: ['rng_mogi'],
  cooldown: 10,
  execute(message) {
    return message.channel.send(`Select lobby mode. Waiting 1 minute.
\`\`\`1 - FFA / Duos / 3 vs. 3 (full rng)
2 - FFA / Duos / 3 vs. 3 (pools)
3 - Itemless (full rng)
4 - Itemless (pools)
5 - 4 vs. 4 (full rng)
6 - 4 vs. 4 (pools)
7 - Battle Mode\`\`\``).then((confirmMessage) => {
      message.channel.awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
        .then((collected) => {
          const collectedMessage = collected.first();
          const { content } = collectedMessage;
          collectedMessage.delete();

          if (['1', '2', '3', '4', '5', '6', '7'].includes(content)) {
            confirmMessage.edit('Randomizing...').then((m) => {
              let type;
              let pools;

              switch (content) {
                case '1':
                  type = ITEMS;
                  pools = false;
                  break;
                case '2':
                  type = ITEMS;
                  pools = true;
                  break;
                case '3':
                  type = ITEMLESS;
                  pools = false;
                  break;
                case '4':
                  type = ITEMLESS;
                  pools = true;
                  break;
                case '5':
                  type = _4V4;
                  pools = false;
                  break;
                case '6':
                  type = _4V4;
                  pools = true;
                  break;
                case '7':
                  type = BATTLE;
                  pools = false;
                  break;
                default:
                  type = ITEMS;
                  pools = false;
                  break;
              }

              const title = `Tracks for ${type} lobby ${pools ? '(pools)' : '(full rng)'}`;
              rngPools({ type, pools }).then((maps) => {
                m.edit(`**${title}**\n\`\`\`${maps.map((map, i) => `${i + 1}. ${map}`).join('\n')}\`\`\``);
              });
            });
          } else {
            throw new Error('cancel');
          }
        }).catch(() => confirmMessage.edit('Command cancelled.'));
    });
  },
};
