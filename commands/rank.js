const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const calculateSuperScore = require('../utils/calculateSuperScore');
const createPageableContent = require('../utils/createPageableContent');
const getConfigValue = require('../utils/getConfigValue');
const sendAlertMessage = require('../utils/sendAlertMessage');

const {
  RACE_FFA,
  RACE_ITEMLESS,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_ITEMLESS_DUOS,
  BATTLE_FFA,
  BATTLE_4V4,
} = require('../db/models/ranked_lobby');

const ranks = {
  [RACE_FFA]: 'FFA',
  [RACE_ITEMLESS]: 'Itemless',
  [RACE_DUOS]: 'Duos',
  [RACE_3V3]: '3 vs. 3',
  [RACE_4V4]: '4 vs. 4',
  [RACE_SURVIVAL]: 'Survival',
  [RACE_ITEMLESS_DUOS]: 'Itemless Duos',
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

  const promise = getConfigValue('super_score_base_rank');
  Promise.resolve(promise).then((baseRank) => {
    fields.push({
      name: 'Super Score',
      value: calculateSuperScore(rank, baseRank),
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
    const baseRank = await getConfigValue('super_score_base_rank');

    if (args.length) {
      if (args[0] === 'list') {
        Player.find().then((players) => {
          const rankedPlayers = [];
          const psns = [];
          const psnMapping = {};
          const flagMapping = {};

          players.forEach((p) => {
            if (p.psn) {
              psns.push(p.psn);
              psnMapping[p.psn] = p.discordId;
              flagMapping[p.psn] = p.flag;
            }
          });

          Rank.find({ name: { $in: psns } }).then((playerRanks) => {
            playerRanks.forEach((r) => {
              const superScore = calculateSuperScore(r, baseRank);
              const discordId = psnMapping[r.name];

              rankedPlayers.push({
                discordId,
                psn: r.name.replace(/_/g, '\\_'),
                flag: flagMapping[r.name],
                superScore,
              });
            });

            const sortedRanking = rankedPlayers.sort((a, b) => b.superScore - a.superScore).map((rp, i) => `**${i + 1}**. ${rp.flag} <@!${rp.discordId}>\n**PSN**: ${rp.psn}\n**Score**: ${rp.superScore}\n`);

            createPageableContent(message.channel, message.author.id, {
              outputType: 'embed',
              elements: sortedRanking,
              elementsPerPage: 5,
              embedOptions: {
                heading: 'Super Score Ranking',
                image: 'https://static.wikia.nocookie.net/crashban/images/5/5a/CTRNF-Master_Wheels.png',
              },
              reactionCollectorOptions: { time: 3600000 },
            });
          });
        });
      } else {
        let psn;

        const user = message.mentions.users.first();
        if (!user) {
          psn = args[0];
        } else {
          const player = await Player.findOne({ discordId: user.id });
          psn = player.psn || '-';
        }

        Rank.findOne({ name: psn }).then((rank) => {
          if (!rank) {
            return sendAlertMessage(message.channel, `${psn} has not played any ranked matches yet.`, 'warning');
          }

          sendMessage(message, rank);
        });
      }
    } else {
      Player.findOne({ discordId: message.author.id }).then((player) => {
        if (!player || !player.psn) {
          return sendAlertMessage(message.channel, 'You have not played any ranked matches yet.', 'warning');
        }

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
