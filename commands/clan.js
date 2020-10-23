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
            const clanRole = message.guild.roles.cache
              .find((c) => c.name.toLowerCase() === clan.fullName.toLowerCase());

            if (!clanRole) return message.channel.send('Clan role was not found.');

            message.guild.members.fetch().then((members) => {
              const captains = [];
              const players = [];

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

                  members
                    .sort((a, b) => a.displayName.localeCompare(b.displayName))
                    .forEach((m) => {
                      if (m.roles.cache.has(clanRole.id)) {
                        if (m.roles.cache.find((r) => r.name === 'Captain')) {
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

                  const averageSuperScore = Math.floor(superScoreSum / superScoreCount);

                  const toPing = (p) => {
                    let s = p.toString();
                    const player = docs.find((f) => f.discordId === p.user.id);
                    if (player && player.flag) s += ` ${player.flag}${superScores[player.psn] ? ` (Score: ${superScores[player.psn]})` : ''}`;
                    return s;
                  };
                  const description = `**${clanRole.name}** (Score: ${averageSuperScore} - Members: ${clanRole.members.size})
  
Captain:
${captains.map(toPing).join('\n')}

Members:
${players.map(toPing).join('\n')}`;

                  message.channel.send('...').then((m) => {
                    m.edit(description).then();
                  });
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
