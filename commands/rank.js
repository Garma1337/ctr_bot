const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const createPageableContent = require('../utils/createPageableContent');
const generateSuperScoreRanking = require('../utils/generateSuperScoreRanking');
const sendAlertMessage = require('../utils/sendAlertMessage');

const {
  RACE_FFA,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_ITEMLESS_FFA,
  BATTLE_FFA,
  BATTLE_4V4,
} = require('../db/models/lobby');

const ranks = {
  [RACE_FFA]: 'Items FFA',
  [RACE_DUOS]: 'Duos',
  [RACE_3V3]: '3 vs. 3',
  [RACE_4V4]: '4 vs. 4',
  [RACE_SURVIVAL]: 'Survival',
  [RACE_ITEMLESS_FFA]: 'Itemless FFA',
  [BATTLE_FFA]: 'Battle FFA',
  [BATTLE_4V4]: 'Battle 4 vs. 4',
};

function sendMessage(message, rank) {
  const fields = Object.entries(ranks).map(([key, name]) => {
    const position = rank[key].position + 1;
    const r = parseInt(rank[key].rank, 10);

    let value = `#${position} - ${r}`;
    if (Number.isNaN(position) || Number.isNaN(r)) value = '-';

    return ({
      name,
      value,
      inline: true,
    });
  });

  generateSuperScoreRanking().then((superScoreRanking) => {
    const superScoreEntry = superScoreRanking.find((r) => r.psn === rank.name);

    fields.push({
      name: 'Super Score',
      value: `${superScoreEntry ? `#${superScoreEntry.rank} - ${superScoreEntry.superScore}` : '-'}`,
      inline: true,
    });

    message.channel.send({
      embed: {
        title: `${rank.name}'s ranks`,
        fields,
      },
    });
  });
}

module.exports = {
  name: 'rank',
  description: 'Check your rank',
  guildOnly: true,
  cooldown: 10,
  async execute(message, args) {
    if (args.length) {
      if (args[0] === 'list') {
        generateSuperScoreRanking().then((superScoreRanking) => {
          const elements = superScoreRanking.map((sr) => `**${sr.rank}**. ${sr.flag} <@!${sr.discordId}>\n**PSN**: ${sr.psn}\n**Score**: ${sr.superScore}\n`);

          createPageableContent(message.channel, message.author.id, {
            outputType: 'embed',
            elements,
            elementsPerPage: 5,
            embedOptions: {
              heading: 'Super Score Ranking',
              image: 'https://static.wikia.nocookie.net/crashban/images/5/5a/CTRNF-Master_Wheels.png',
            },
            reactionCollectorOptions: { time: 3600000 },
          });
        });
      } else {
        let psn;

        const user = message.mentions.users.first();
        if (!user) {
          psn = args[0];
        } else {
          const player = await Player.findOne({ discordId: user.id });

          if (!player) {
            return sendAlertMessage(message.channel, `<@!${user.id}> has not played any ranked matches yet.`, 'warning');
          }

          psn = player.psn || '-';
        }

        // eslint-disable-next-line consistent-return
        Rank.findOne({ name: psn }).then((rank) => {
          if (!rank) {
            return sendAlertMessage(message.channel, `${psn} has not played any ranked matches yet.`, 'warning');
          }

          sendMessage(message, rank);
        });
      }
    } else {
      // eslint-disable-next-line consistent-return
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player || !player.psn) {
          return sendAlertMessage(message.channel, 'You have not played any ranked matches yet.', 'warning');
        }

        // eslint-disable-next-line consistent-return
        Rank.findOne({ name: player.psn }).then((rank) => {
          if (!rank) {
            return sendAlertMessage(message.channel, 'You have not played any ranked matches yet.', 'warning');
          }

          sendMessage(message, rank);
        });
      });
    }
  },
};
