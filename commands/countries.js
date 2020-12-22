const Player = require('../db/models/player');
const Rank = require('../db/models/rank');
const calculateSuperScore = require('../utils/calculateSuperScore');
const createPageableContent = require('../utils/createPageableContent');
const getConfigValue = require('../utils/getConfigValue');
const sendAlertMessage = require('../utils/sendAlertMessage');
const { flagName, flagToCode } = require('../utils/flags');

function getProfileEmbed(data) {
  const { name } = data;
  const { flag } = data;
  const { shortCode } = data;
  const score = data.score || 0;
  const players = data.players.length > 0 ? data.players : ['-'];
  const psns = data.psns.length > 0 ? data.psns : ['-'];

  const dataFields = [
    `**Name**: ${name}`,
    `**Flag**: ${flag}`,
    `**Short Code**: ${shortCode}`,
    `**Score**: ${score}`,
    `**Players**: ${data.players.length}`,
  ];

  return {
    timestamp: new Date(),
    author: {
      name: `Country "${name}"`,
    },
    fields: [
      {
        name: ':shield: Data',
        value: dataFields.join('\n'),
      },
      {
        name: ':busts_in_silhouette: Players',
        value: players.join('\n'),
        inline: true,
      },
      {
        name: ':credit_card: PSN IDs',
        value: psns.join('\n'),
        inline: true,
      },
    ],
  };
}

module.exports = {
  name: 'countries',
  description: 'Countries of members.',
  guildOnly: true,
  aliases: ['country'],
  execute(message, args) {
    if (!args.length) {
      const countryMembers = {};

      Player.find().then((players) => {
        const psns = [];
        const psnMapping = {};

        players.forEach((p) => {
          if (p.psn) {
            psns.push(p.psn);
            psnMapping[p.discordId] = p.psn;
          }

          if (p.flag) {
            if (!countryMembers[p.flag]) {
              countryMembers[p.flag] = {
                flag: p.flag,
                members: [p.discordId],
                superScoreCount: 0,
              };
            } else {
              countryMembers[p.flag].members.push(p.discordId);
            }
          }
        });

        Rank.find({ name: { $in: psns } }).then((ranks) => {
          const promise = getConfigValue('super_score_base_rank');
          Promise.resolve(promise).then((baseRank) => {
            const superScores = [];

            ranks.forEach((r) => {
              superScores[r.name] = calculateSuperScore(r, baseRank);
            });

            for (const i in countryMembers) {
              let superScoreSum = 0;

              countryMembers[i].members.forEach((m) => {
                const psn = psnMapping[m];
                const superScore = superScores[psn] || 0;
                superScoreSum += superScore;

                if (superScore > 0) {
                  countryMembers[i].superScoreCount += 1;
                }
              });

              if (countryMembers[i].members.length > 1 && countryMembers[i].superScoreCount > 0) {
                countryMembers[i].score = Math.floor(superScoreSum / countryMembers[i].superScoreCount);
              } else {
                countryMembers[i].score = superScoreSum;
              }
            }

            const transformed = [];

            for (const x in countryMembers) {
              transformed.push({
                flag: countryMembers[x].flag,
                members: countryMembers[x].members,
                score: countryMembers[x].score,
              });
            }

            const countryList = transformed
              .sort((a, b) => b.score - a.score)
              .map((c, i) => `**${i + 1}.** ${c.flag}\n**Score**: ${c.score}\n**Members**: ${c.members.length}\n`);

            createPageableContent(message.channel, message.author.id, {
              outputType: 'embed',
              elements: countryList,
              elementsPerPage: 5,
              embedOptions: { heading: `Country Ranking - ${countryList.length} Countries` },
              reactionCollectorOptions: { time: 3600000 },
            });
          });
        });
      });
    } else {
      const flag = args.shift();

      if (!message.client.flags.includes(flag)) {
        return sendAlertMessage(message.channel, 'You should specify country flag. To see them all use the `!flags` command', 'warning');
      }

      Player.find({ flag }).then(async (players) => {
        if (players.length <= 0) {
          return sendAlertMessage(message.channel, `There are no players from ${flag}.`, 'info');
        }

        const psns = [];
        const psnMapping = {};
        const playerIds = [];

        players.forEach((p) => {
          if (p.psn) {
            psns.push(p.psn);
            psnMapping[p.discordId] = p.psn;
          }

          playerIds.push(p.discordId);
        });

        Rank.find({ name: { $in: psns } }).then((ranks) => {
          const promise = getConfigValue('super_score_base_rank');
          Promise.resolve(promise).then((baseRank) => {
            const superScores = {};
            let superScoreSum = 0;
            let superScoreCount = 0;

            playerIds.forEach((m) => {
              const psn = psnMapping[m] || null;
              if (psn) {
                const rank = ranks.find((r) => r.name === psn);

                if (rank) {
                  const superScore = calculateSuperScore(rank, baseRank);
                  superScores[psn] = superScore;
                  superScoreSum += superScore;

                  superScoreCount += 1;
                }
              }
            });

            const averageSuperScore = Math.floor(superScoreSum / superScoreCount);

            const formatMembers = (m) => {
              let out = '';
              const player = players.find((p) => p.discordId === m);

              if (player && player.flag) {
                out += `${player.flag}`;
              } else {
                out += ':united_nations:';
              }

              out += ` <@!${m}>`;

              return out;
            };

            const formatPsns = (m) => {
              let out;
              const player = players.find((p) => p.discordId === m);

              if (player && player.psn) {
                out = `${player.psn.replace(/_/g, '\\_')}`;

                if (superScores[player.psn]) {
                  out += ` (Score: ${superScores[player.psn]})`;
                }
              } else {
                out = '-';
              }

              return out;
            };

            const embed = getProfileEmbed({
              name: flagName[flag],
              flag,
              shortCode: flagToCode(flag),
              score: averageSuperScore,
              players: playerIds.map(formatMembers),
              psns: playerIds.map(formatPsns),
            });

            return message.channel.send({ embed });
          });
        });
      });
    }
  },
};
