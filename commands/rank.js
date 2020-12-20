const Player = require('../db/models/player');
const Rank = require('../db/models/rank');
const calculateSuperScore = require('../utils/calculateSuperScore');
const createPageableContent = require('../utils/createPageableContent');
const getConfigValue = require('../utils/getConfigValue');
const sendAlertMessage = require('../utils/sendAlertMessage');

const {
  BATTLE, _4V4, _3V3, DUOS, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');

const ranks = {
  [ITEMS]: 'FFA',
  [ITEMLESS]: 'Itemless',
  [DUOS]: 'Duos',
  [_3V3]: '3 vs. 3',
  [_4V4]: '4 vs. 4',
  [BATTLE]: 'Battle',
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

          players.forEach((p) => {
            if (p.psn) {
              psns.push(p.psn);
              psnMapping[p.psn] = p.discordId;
            }
          });

          Rank.find({ name: { $in: psns } }).then((playerRanks) => {
            playerRanks.forEach((r) => {
              const superScore = calculateSuperScore(r, baseRank);
              const discordId = psnMapping[r.name];

              rankedPlayers.push({
                discordId,
                psn: r.name.replace(/_/g, '\\_'),
                superScore,
              });
            });

            // Remove players who left the server
            message.guild.members.fetch().then((guildMembers) => {
              rankedPlayers.forEach((r, i) => {
                const member = guildMembers.get(r.discordId);
                if (!member) {
                  rankedPlayers.splice(i, 1);
                }
              });
            });

            const sortedRanking = rankedPlayers.sort((a, b) => b.superScore - a.superScore).map((rp, i) => `**${i + 1}**. <@!${rp.discordId}>\n**PSN**: ${rp.psn}\n**Score**: ${rp.superScore}\n`);

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
