const Clan = require('../db/models/clans');
const Player = require('../db/models/player');
const Rank = require('../db/models/rank');
const createPageableContent = require('../utils/createPageableContent');
const calculateSuperScore = require('../utils/calculateSuperScore');

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
  const players = data.players.length > 0 ? data.players : ['-'];
  const scores = data.scores.length > 0 ? data.scores : ['-'];
  const roles = data.roles.length > 0 ? data.roles : ['-'];

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
        name: ':bust_in_silhouette: Player',
        value: players.join('\n'),
        inline: true,
      },
      {
        name: ':diamond_shape_with_a_dot_inside: Role',
        value: roles.join('\n'),
        inline: true,
      },
      {
        name: ':checkered_flag: Score',
        value: scores.join('\n'),
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
    if (message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])) {
      return `Show clan members: \`!clan CTR\`
Edit clans:
\`!clan add CTR Crash Team Racing
!clan delete CTR\``;
    }

    return 'Show clan members: `!clan CTR`';
  },
  aliases: ['clan'],
  guildOnly: true,
  execute(message, args) {
    if (!args.length) {
      Clan.find().then((clans) => {
        message.guild.members.fetch().then((members) => {
          const discordIds = [];
          const clanMembers = {};

          clans.forEach((c) => {
            clanMembers[c.shortName] = {
              shortName: c.shortName,
              fullName: c.fullName,
              members: [],
            };

            members.forEach((m) => {
              const role = m.roles.cache.find((r) => r.name.toLowerCase() === c.fullName.toLowerCase());

              if (role) {
                clanMembers[c.shortName].members.push(m.user.id);

                if (!discordIds.includes(m.user.id)) {
                  discordIds.push(m.user.id);
                }
              }
            });
          });

          Player.find({ discordId: { $in: discordIds } }).then((players) => {
            const psns = [];
            const psnMapping = {};

            players.forEach((p) => {
              if (p.psn) {
                psns.push(p.psn);
                psnMapping[p.discordId] = p.psn;
              }
            });

            Rank.find({ name: { $in: psns } }).then((ranks) => {
              const superScores = [];

              ranks.forEach((r) => {
                superScores[r.name] = calculateSuperScore(r);
              });

              for (const i in clanMembers) {
                let superScoreSum = 0;
                clanMembers[i].superScoreCount = 0;

                clanMembers[i].members.forEach((m) => {
                  const psn = psnMapping[m];
                  const superScore = superScores[psn] || 0;
                  superScoreSum += superScore;

                  if (superScore > 0) {
                    clanMembers[i].superScoreCount += 1;
                  }
                });

                if (clanMembers[i].members.length > 1) {
                  clanMembers[i].score = Math.floor(superScoreSum / clanMembers[i].superScoreCount);
                } else {
                  clanMembers[i].score = superScoreSum;
                }
              }

              const transformed = [];

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
                .map((c, i) => `${i + 1}. **${c.fullName}** [${c.shortName}] - Score: ${c.score} - Members: ${c.members.length}`);

              createPageableContent(message.channel, message.author.id, {
                outputType: 'embed',
                elements: clanList,
                elementsPerPage: 20,
                embedOptions: { heading: `CTR Clan Ranking (${clanList.length} Clans)` },
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
      if (!message.member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES'])) {
        return message.channel.send('You don\'t have permission to do that!');
      }

      const shortName = args[1];
      const fullName = args.slice(2).join(' ');
      let clan = null;

      switch (action) {
        //  !clan add CTR Crash Team Racing
        //  !clan add_member CTR @tag
        //  !clan remove_member
        //  @Staff
        //  !clan_member add [CTR] @tag
        //  !clan_member remove CTR @tag
        case ADD:
          const { guild } = message;
          const clanRole = guild.roles.cache.find((r) => r.name === fullName);

          const regexShortName = createCaseInsensitiveRegEx(shortName);

          Clan.findOne({ shortName: { $regex: regexShortName } }).then((doc) => {
            if (doc) {
              message.channel.send('There is already a clan with this short name.');
              return;
            }
            // eslint-disable-next-line no-case-declarations
            clan = new Clan();
            clan.shortName = shortName;
            clan.fullName = fullName;
            clan.save().then(() => {
              message.channel.send(`Clan \`${shortName}\` was created.`);
            });

            if (!clanRole) {
              guild.roles.create({ data: { name: fullName } })
                .then(() => {
                  message.channel.send(`Role \`${fullName}\` was created.`);
                });
            } else {
              message.channel.send(`Role \`${fullName}\` already exists.`);
            }
          });
          break;

        // !clan delete CTR
        case REMOVE:
        case DELETE:
          clan = Clan.findOne({ shortName }).then((doc) => {
            if (doc) {
              doc.delete().then(() => {
                message.channel.send(`Clan ${shortName} was deleted.`);
              });
            } else {
              message.channel.send(`Clan ${shortName} was not found.`);
            }
          });
          break;
      }
    } else {
      // !clan CTR
      // !clan Crash Team Racing
      const clanName = args[0];
      const clanFullName = args.join(' ');

      const regexShortName = createCaseInsensitiveRegEx(clanName);
      const regexFullName = createCaseInsensitiveRegEx(clanFullName);

      Clan.findOne().or([
        { shortName: { $regex: regexShortName } },
        { fullName: { $regex: regexFullName } },
      ])
        .then((clan) => {
          if (clan) {
            const clanRole = message.guild.roles.cache.find((c) => c.name.toLowerCase() === clan.fullName.toLowerCase());

            if (!clanRole) {
              return message.channel.send(`The clan role "${clan.fullName}" was not found.`);
            }

            message.guild.members.fetch().then((members) => {
              const clanMembers = [];
              const memberIds = members.map((m) => m.id);

              Player.find({ discordId: { $in: memberIds } }).then((docs) => {
                const psns = [];
                const psnMapping = {};

                docs.forEach((p) => {
                  if (p.psn) {
                    psns.push(p.psn);
                    psnMapping[p.discordId] = p.psn;
                  }
                });

                Rank.find({ name: { $in: psns } }).then((ranks) => {
                  const superScores = {};
                  let superScoreSum = 0;
                  let superScoreCount = 0;

                  const captains = [];
                  const players = [];

                  members.forEach((m) => {
                    if (m.roles.cache.has(clanRole.id)) {
                      if (m.roles.cache.find((r) => r.name.toLowerCase() === 'captain')) {
                        captains.push(m);
                      } else {
                        players.push(m);
                      }

                      const psn = psnMapping[m.user.id] || null;
                      if (psn) {
                        const rank = ranks.find((r) => r.name === psn);

                        if (rank) {
                          const superScore = calculateSuperScore(rank);
                          superScores[psn] = superScore;
                          superScoreSum += superScore;

                          superScoreCount += 1;
                        }
                      }
                    }
                  });

                  clanMembers.push(...captains);
                  clanMembers.push(...players);

                  const averageSuperScore = Math.floor(superScoreSum / superScoreCount);

                  const format = (c) => {
                    let out = '';
                    const player = docs.find((p) => p.discordId === c.user.id);

                    if (player && player.flag) {
                      out += `${player.flag}`;
                    }

                    out += ` <@!${c.user.id}>`;

                    return out;
                  };

                  const scores = clanMembers.map((m) => {
                    const psn = psnMapping[m.user.id] || null;

                    return superScores[psn] || '-';
                  });

                  const roles = clanMembers.map((m) => {
                    if (captains.find((c) => c.user.id === m.user.id)) {
                      return 'Captain';
                    }

                    return 'Member';
                  });

                  const embed = getProfileEmbed({
                    name: clan.fullName,
                    tag: clan.shortName,
                    color: clan.color,
                    description: clan.description,
                    logo: clan.logo,
                    score: averageSuperScore,
                    discord: clan.discord,
                    players: clanMembers.map(format),
                    scores,
                    roles,
                  });

                  message.channel.send({ embed });
                });
              });
            });
          } else {
            return message.channel.send('There is no clan with this name.');
          }
        });
    }
  },
};
