const { Clan } = require('../db/models/clan');
const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const calculateMeaningfulness = require('../utils/calculateMeaningfulness');
const calculateSuperScore = require('../utils/calculateSuperScore');
const createPageableContent = require('../utils/createPageableContent');
const getConfigValue = require('../utils/getConfigValue');
const isStaffMember = require('../utils/isStaffMember');
const sendAlertMessage = require('../utils/sendAlertMessage');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function createCaseInsensitiveRegEx(s) {
  return new RegExp(`^${(escapeRegExp(s))}$`, 'i');
}

function getProfileEmbed(data) {
  const { name } = data;
  const { tag } = data;
  const color = Number(data.color) || 0;
  const { description } = data;
  const logo = data.logo || 'https://www.crashbandicoot.com/content/dam/atvi/Crash/crash-touchui/ctr/home/ctr-full-logo.png';
  const score = data.score || 0;
  const discord = data.discord || '-';
  const members = data.members.length > 0 ? data.members : ['-'];
  const psns = data.psns.length > 0 ? data.psns : ['-'];

  const profileFields = [
    `**Name**: ${name}`,
    `**Tag**: ${tag}`,
    `**Score**: ${score}`,
    `**Discord**: ${discord}`,
  ];

  const embed = {
    timestamp: new Date(),
    color,
    footer: {
      text: '!clan_profile help',
    },
    thumbnail: {
      url: logo,
    },
    author: {
      name,
      icon_url: logo,
    },
    fields: [
      {
        name: ':shield: Profile',
        value: profileFields.join('\n'),
      },
      {
        name: ':busts_in_silhouette: Members',
        value: members.join('\n'),
        inline: true,
      },
      {
        name: ':credit_card: PSN IDs',
        value: psns.join('\n'),
        inline: true,
      },
    ],
  };

  if (description) {
    embed.description = description;
  }

  if (data.discord) {
    embed.author.url = data.discord;
  }

  return embed;
}

module.exports = {
  name: 'clans',
  description(message) {
    if (isStaffMember(message.member)) {
      return `Show clan members: \`!clan CTR\`
Edit clans:
\`!clan add CTR Crash Team Racing
!clan delete CTR\``;
    }

    return 'Show clan members: `!clan CTR`';
  },
  aliases: ['clan'],
  guildOnly: true,
  cooldown: 10,
  execute(message, args) {
    if (!args.length) {
      Clan.find().then((clans) => {
        const discordIds = [];
        const clanMembers = {};

        clans.forEach((c) => {
          clanMembers[c.shortName] = {
            shortName: c.shortName,
            fullName: c.fullName,
            members: c.getMemberIds(),
          };

          discordIds.push(...clanMembers[c.shortName].members);
        });

        Player.find({ discordId: { $in: discordIds } }).then((players) => {
          const rankedNames = [];
          const rankedNameMapping = {};

          players.forEach((p) => {
            if (p.rankedName) {
              rankedNames.push(p.rankedName);
              rankedNameMapping[p.discordId] = p.rankedName;
            }
          });

          Rank.find({ name: { $in: rankedNames } }).then((ranks) => {
            const promise = getConfigValue('super_score_base_rank');
            Promise.resolve(promise).then((baseRank) => {
              const superScores = [];

              ranks.forEach((r) => {
                superScores[r.name] = calculateSuperScore(r, baseRank);
              });

              // eslint-disable-next-line guard-for-in
              for (const i in clanMembers) {
                let superScoreSum = 0;
                clanMembers[i].superScoreCount = 0;

                clanMembers[i].members.forEach((m) => {
                  const psn = rankedNameMapping[m];
                  const superScore = superScores[psn] || 0;
                  superScoreSum += superScore;

                  if (superScore > 0) {
                    clanMembers[i].superScoreCount += 1;
                  }
                });

                if (clanMembers[i].members.length >= 1 && clanMembers[i].superScoreCount > 0) {
                  // eslint-disable-next-line max-len
                  const meaningfulness = calculateMeaningfulness(5, clanMembers[i].superScoreCount, 0.05);
                  // eslint-disable-next-line max-len
                  clanMembers[i].score = Math.floor((superScoreSum / clanMembers[i].superScoreCount) * meaningfulness);
                } else {
                  clanMembers[i].score = superScoreSum;
                }
              }

              const transformed = [];

              // eslint-disable-next-line guard-for-in
              for (const x in clanMembers) {
                transformed.push({
                  shortName: clanMembers[x].shortName,
                  fullName: clanMembers[x].fullName,
                  members: clanMembers[x].members,
                  score: clanMembers[x].score,
                });
              }

              const clanList = transformed
                .sort((a, b) => b.score - a.score)
                .map((c, i) => `**${i + 1}.** ${c.fullName} [${c.shortName}]\n**Score**: ${c.score}\n**Members**: ${c.members.length}\n`);

              createPageableContent(message.channel, message.author.id, {
                outputType: 'embed',
                elements: clanList,
                elementsPerPage: 5,
                embedOptions: {
                  heading: `Clan Ranking - ${clanList.length} Clans`,
                  image: 'https://static.wikia.nocookie.net/crashban/images/8/8f/CTRNF-Turbo.png',
                },
                reactionCollectorOptions: { time: 3600000 },
              });
            });
          });
        });
      });

      return;
    }

    const action = args[0];

    const ADD = 'add';
    const DELETE = 'delete';
    const REMOVE = 'remove';

    const actions = [ADD, DELETE, REMOVE];
    if (actions.includes(action)) {
      if (!isStaffMember(message.member)) {
        // eslint-disable-next-line consistent-return
        return sendAlertMessage(message.channel, 'You don\'t have permission to do that!', 'warning');
      }

      const shortName = args[1];
      const fullName = args.slice(2).join(' ');
      let clan = null;

      // eslint-disable-next-line default-case
      switch (action) {
        case ADD:
          // eslint-disable-next-line no-case-declarations
          const regexShortName = createCaseInsensitiveRegEx(shortName);

          // eslint-disable-next-line consistent-return
          Clan.findOne({ shortName: { $regex: regexShortName } }).then((doc) => {
            if (doc) {
              return sendAlertMessage(message.channel, `There is already a clan with the short name "${shortName}".`, 'warning');
            }

            clan = new Clan();
            clan.shortName = shortName;
            clan.fullName = fullName;
            clan.save().then(() => {
              sendAlertMessage(message.channel, `The clan "${shortName}" was created.`, 'success');
            });
          });

          break;

        case REMOVE:
        case DELETE:
          clan = Clan.findOne({ shortName }).then((doc) => {
            if (doc) {
              doc.delete().then(() => {
                sendAlertMessage(message.channel, `The clan "${shortName}" was deleted.`, 'success');
              });
            } else {
              sendAlertMessage(message.channel, `The clan "${shortName}" does not exist.`, 'warning');
            }
          });
          break;
      }
    } else {
      const clanName = args[0];
      const clanFullName = args.join(' ');

      const regexShortName = createCaseInsensitiveRegEx(clanName);
      const regexFullName = createCaseInsensitiveRegEx(clanFullName);

      // eslint-disable-next-line max-len,consistent-return
      Clan.findOne().or([{ shortName: { $regex: regexShortName } }, { fullName: { $regex: regexFullName } }]).then((clan) => {
        if (clan) {
          Player.find({ discordId: { $in: clan.getMemberIds() } }).then((docs) => {
            const rankedNames = [];
            const rankedNameMapping = {};

            docs.forEach((p) => {
              if (p.rankedName) {
                rankedNames.push(p.rankedName);
                rankedNameMapping[p.discordId] = p.rankedName;
              }
            });

            Rank.find({ name: { $in: rankedNames } }).then((ranks) => {
              const promise = getConfigValue('super_score_base_rank');
              Promise.resolve(promise).then((baseRank) => {
                const superScores = {};
                let superScoreSum = 0;
                let superScoreCount = 0;

                clan.getMemberIds().forEach((m) => {
                  const rankedName = rankedNameMapping[m] || null;
                  if (rankedName) {
                    const rank = ranks.find((r) => r.name === rankedName);

                    if (rank) {
                      const superScore = calculateSuperScore(rank, baseRank);
                      superScores[rankedName] = superScore;
                      superScoreSum += superScore;

                      superScoreCount += 1;
                    }
                  }
                });

                const meaningfulness = calculateMeaningfulness(5, superScoreCount, 0.05);
                // eslint-disable-next-line max-len
                const weightedSuperScore = Math.floor((superScoreSum / superScoreCount) * meaningfulness);

                const formatMembers = (m) => {
                  let out = '';
                  const player = docs.find((p) => p.discordId === m);
                  const isCaptain = clan.hasCaptain(m);

                  if (player && player.flag) {
                    out += `${player.flag}`;
                  } else {
                    out += ':united_nations:';
                  }

                  out += ` <@!${m}>`;

                  if (isCaptain) {
                    out += ' :crown:';
                  }

                  return out;
                };

                const formatPsns = (m) => {
                  let out;
                  const player = docs.find((p) => p.discordId === m);

                  if (player && player.psn) {
                    out = `${player.psn.replace(/_/g, '\\_')}`;

                    if (superScores[player.rankedName]) {
                      out += ` (Score: ${superScores[player.rankedName]})`;
                    }
                  } else {
                    out = '-';
                  }

                  return out;
                };

                const embed = getProfileEmbed({
                  name: clan.fullName,
                  tag: clan.shortName,
                  color: clan.color,
                  description: clan.description,
                  logo: clan.logo,
                  score: weightedSuperScore,
                  discord: clan.discord,
                  members: clan.getMemberIds().map(formatMembers),
                  psns: clan.getMemberIds().map(formatPsns),
                });

                return message.channel.send({ embed });
              });
            });
          });
        } else {
          return sendAlertMessage(message.channel, `The clan "${clanName}" does not exist.`, 'warning');
        }
      });
    }
  },
};
