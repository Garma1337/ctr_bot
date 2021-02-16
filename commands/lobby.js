const axios = require('axios');
const moment = require('moment');
const { CronJob } = require('cron');
const AsyncLock = require('async-lock');
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
  SURVIVAL_STYLES,
  LEADERBOARDS,
  TRACK_OPTION_RNG,
  TRACK_OPTION_POOLS,
  TRACK_OPTION_SPICY,
  TRACK_OPTION_DRAFT,
  TRACK_OPTION_IRON_MAN,
} = require('../db/models/ranked_lobby');
const config = require('../config.js');
const { Cooldown } = require('../db/models/cooldown');
const { Counter } = require('../db/models/counter');
const { Duo } = require('../db/models/duo');
const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const { RankedBan } = require('../db/models/ranked_ban');
const { RankedLobby } = require('../db/models/ranked_lobby');
const { Room } = require('../db/models/room');
const { Sequence } = require('../db/models/sequence');
const { Team } = require('../db/models/team');
const { client } = require('../bot');
const createDraft = require('../utils/createDraft');
const createDraftv2 = require('../utils/createDraftv2');
const createAndFindRole = require('../utils/createAndFindRole');
const generateTemplate = require('../utils/generateTemplate');
const getConfigValue = require('../utils/getConfigValue');
const getRandomArrayElement = require('../utils/getRandomArrayElement');
const isStaffMember = require('../utils/isStaffMember');
const rngPools = require('../utils/rngPools');
const rngModeBattle = require('../utils/rngModeBattle');
const sendAlertMessage = require('../utils/sendAlertMessage');
const sendLogMessage = require('../utils/sendLogMessage');
const { battleModesFFA, battleModes4v4 } = require('../db/modes_battle');
const { engineStyles } = require('../db/engineStyles');
const { regions } = require('../db/regions');
const { rulesets } = require('../db/rulesets');

const lock = new AsyncLock();

const PLAYER_DEFAULT_RANK = 1200;
const DEFAULT_RANK = PLAYER_DEFAULT_RANK;
const NAT1 = 'NAT 1';
const NAT2O = 'NAT 2 Open';
const NAT3 = 'NAT 3';
const FORCE_START_COOLDOWN = 5;

function getFooter(doc) {
  return {
    icon_url: doc.getIcon(),
    text: `id: ${doc._id}`,
  };
}

async function getPlayerInfo(playerId, doc) {
  const p = await Player.findOne({ discordId: playerId });
  const rank = await Rank.findOne({ name: p.psn });
  let rankValue = DEFAULT_RANK;

  if (rank) {
    rankValue = rank[doc.type].rank;
    rankValue = parseInt(rankValue, 10);
  }

  if (!rankValue) {
    rankValue = DEFAULT_RANK;
  }

  const flag = p.flag ? ` ${p.flag}` : ':united_nations:';
  let tag = `${flag} <@${playerId}>`;
  if (p.nat) {
    if (p.nat === NAT1 || p.nat === NAT2O) {
      tag += ' :small_blue_diamond:';
    } else {
      tag += ' :small_orange_diamond:';
    }
  }

  let { psn } = p;
  if (psn) {
    psn = psn.replace(/_/g, '\\_');
  }
  return [tag, psn, rankValue];
}

async function getEmbed(doc, players, tracks, roomChannel) {
  let playersText = 'No players.';
  let psnAndRanks = 'No players.';
  const ranks = [];

  const playersInfo = {};

  const playersOut = [];
  if (players && players.length) {
    const psns = [];
    let i = 0;
    for (const playerId of players) {
      i += 1;

      const [tag, psn, rank] = await getPlayerInfo(playerId, doc);

      ranks.push(rank);

      playersOut.push(tag);
      psns.push(`${psn} [${rank}]`);

      playersInfo[playerId] = { tag, psn, rank };
    }
    playersText = playersOut.join('\n');
    psnAndRanks = psns.join('\n');
  }

  if (doc.teamList && doc.teamList.length) {
    playersText = '';
    playersText += '**Teams:**\n';
    doc.teamList.forEach((team, i) => {
      playersText += `${i + 1}.`;
      team.forEach((player, k) => {
        const info = playersInfo[player];
        const tag = info && info.tag;
        playersText += `${k ? '⠀' : ''} ${tag}\n`;
        delete playersInfo[player];
      });
    });
    if (Object.keys(playersInfo).length) {
      playersText += '**Solo Queue:**\n';
      Object.entries(playersInfo).forEach(([key, value]) => {
        playersText += `${value.tag}\n`;
      });
    }
  }

  const sum = ranks.reduce((a, b) => a + b, 0);
  const avgRank = Math.round(sum / ranks.length) || 0;

  let fields;
  let lockedRank;
  if (!doc.locked.$isEmpty()) {
    const playerRank = parseInt(doc.locked.rank, 10);
    const minRank = playerRank - doc.locked.shift;
    const maxRank = playerRank + doc.locked.shift;
    lockedRank = {
      name: 'Rank Lock',
      value: `${minRank} - ${maxRank}`,
      inline: true,
    };
  }

  const iconUrl = doc.getIcon();
  const creator = await Player.findOne({ discordId: doc.creator });
  const timestamp = doc.started ? doc.startedAt : doc.date;
  const region = regions.find((r) => r.uid === doc.region);
  const engineRestriction = engineStyles.find((e) => e.uid === doc.engineRestriction);
  const survivalStyle = SURVIVAL_STYLES.find((s, i) => i === doc.survivalStyle);
  const ruleset = rulesets.find((r, i) => i === doc.ruleset);

  if (tracks) {
    fields = [
      {
        name: 'Players',
        value: playersText,
        inline: true,
      },
      {
        name: 'PSN IDs & Ranks',
        value: psnAndRanks,
        inline: true,
      },
      {
        name: 'Tracks',
        value: tracks,
        inline: true,
      },
      {
        name: 'Room',
        value: roomChannel.toString(),
        inline: true,
      },
      {
        name: 'Creator',
        value: `${creator.flag} <@${doc.creator}>`,
        inline: true,
      },
      {
        name: 'Average Rank',
        value: avgRank,
        inline: true,
      },
    ];

    if (doc.isRacing()) {
      fields.push({
        name: 'Ruleset',
        value: ruleset.name,
        inline: true,
      });

      fields.push({
        name: 'Tracks',
        value: doc.trackCount,
        inline: true,
      });

      fields.push({
        name: 'Laps',
        value: doc.lapCount,
        inline: true,
      });
    }

    if (lockedRank) {
      fields.push(lockedRank);
    }

    if (region) {
      fields.push({
        name: 'Region Lock',
        value: region.description,
        inline: true,
      });
    }

    if (doc.isRacing() && engineRestriction) {
      fields.push({
        name: 'Engine Style',
        value: engineRestriction.icon,
        inline: true,
      });
    }

    if (doc.isSurvival() && survivalStyle) {
      fields.push({
        name: 'Survival Style',
        value: survivalStyle,
        inline: true,
      });
    }

    return {
      color: doc.getColor(),
      author: {
        name: `${doc.getTitle()} has started`,
        icon_url: iconUrl,
      },
      image: {
        url: doc.getStartedIcon(),
      },
      fields,
      footer: getFooter(doc),
      timestamp,
    };
  }

  if (players) {
    fields = [
      {
        name: 'Players',
        value: playersText,
        inline: true,
      },
      {
        name: 'PSN IDs & Ranks',
        value: psnAndRanks,
        inline: true,
      },
      {
        name: 'Creator',
        value: `${creator.flag} <@${doc.creator}>`,
        inline: !!lockedRank,
      },
      {
        name: 'Average Rank',
        value: avgRank,
        inline: true,
      },
    ];

    if (doc.isRacing()) {
      fields.push({
        name: 'Ruleset',
        value: ruleset.name,
        inline: true,
      });

      fields.push({
        name: 'Tracks',
        value: doc.trackCount,
        inline: true,
      });

      fields.push({
        name: 'Laps',
        value: doc.lapCount,
        inline: true,
      });
    }

    if (lockedRank) {
      fields.splice(2, 0, lockedRank);
    }

    if (region) {
      fields.push({
        name: 'Region Lock',
        value: region.description,
        inline: true,
      });
    }

    if (doc.isRacing() && engineRestriction) {
      fields.push({
        name: 'Engine Style',
        value: engineRestriction.icon,
        inline: true,
      });
    }

    if (doc.isSurvival() && survivalStyle) {
      fields.push({
        name: 'Survival Style',
        value: survivalStyle,
        inline: true,
      });
    }

    return {
      color: doc.getColor(),
      author: {
        name: `Gathering ${doc.getTitle()}`,
        icon_url: iconUrl,
      },
      fields,
      footer: getFooter(doc),
      timestamp,
    };
  }

  fields = [
    {
      name: 'Creator',
      value: `${creator.flag} <@${doc.creator}>`,
      inline: true,
    },
  ];

  if (doc.isRacing()) {
    fields.push({
      name: 'Ruleset',
      value: ruleset.name,
      inline: true,
    });

    fields.push({
      name: 'Tracks',
      value: doc.trackCount,
      inline: true,
    });

    fields.push({
      name: 'Laps',
      value: doc.lapCount,
      inline: true,
    });
  }

  if (lockedRank) {
    fields.push(lockedRank);
  }

  if (region) {
    fields.push({
      name: 'Region Lock',
      value: region.description,
      inline: true,
    });
  }

  if (doc.isRacing() && engineRestriction) {
    fields.push({
      name: 'Engine Style',
      value: engineRestriction.icon,
      inline: true,
    });
  }

  if (doc.isSurvival() && survivalStyle) {
    fields.push({
      name: 'Survival Style',
      value: survivalStyle,
      inline: true,
    });
  }

  return {
    color: doc.getColor(),
    author: {
      name: `${doc.getTitle()}`,
      icon_url: iconUrl,
    },
    description: 'React with ✅ to participate',
    fields,
    footer: getFooter(doc),
    timestamp,
  };
}

function findRoom(lobby) {
  return Room.findOne({ lobby: null, guild: lobby.guild }).sort({ number: 1 }).then((doc) => {
    if (!doc) {
      return Sequence.findOneAndUpdate(
        { guild: lobby.guild, name: 'rooms' },
        { $inc: { number: 1 } },
        { upsert: true, new: true },
      ).then((seq) => {
        const room = new Room();
        room.lobby = lobby.id;
        room.guild = lobby.guild;
        room.number = seq.number;
        return room.save();
      });
    }

    doc.lobby = lobby.id;
    return doc.save();
  });
}

async function findRoomChannel(guildId, n) {
  const guild = client.guilds.cache.get(guildId);
  const channelName = `ranked-room-${n}`;
  let category = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_lobbies_category.toLowerCase() && c.type === 'category');
  if (!category) {
    category = await guild.channels.create(config.channels.ranked_lobbies_category, { type: 'category' });
  }

  let channel = guild.channels.cache.find((c) => c.name === channelName);
  if (!channel) {
    const roleStaff = await createAndFindRole(guild, config.roles.staff_role);
    const roleRanked = await createAndFindRole(guild, config.roles.ranked_role);
    const roleRankedVerified = await createAndFindRole(guild, config.roles.ranked_verified_role);

    channel = await guild.channels.create(channelName, {
      type: 'text',
      parent: category,
    });

    await channel.createOverwrite(roleStaff, { VIEW_CHANNEL: true });
    await channel.createOverwrite(roleRanked, { VIEW_CHANNEL: true });
    await channel.createOverwrite(roleRankedVerified, { VIEW_CHANNEL: true });
    await channel.createOverwrite(guild.roles.everyone, { VIEW_CHANNEL: false });
  }

  return channel;
}

function startLobby(docId) {
  RankedLobby.findOneAndUpdate({ _id: docId, started: false }, { started: true, startedAt: new Date() }, { new: true }).then((doc) => {
    client.guilds.cache.get(doc.guild).channels.cache.get(doc.channel).messages.fetch(doc.message).then((message) => {
      rngPools(doc, doc.pools).then((tracks) => {
        findRoom(doc).then((room) => {
          findRoomChannel(doc.guild, room.number).then(async (roomChannel) => {
            const trackCount = tracks.length;

            // Display track column but blank all tracks
            if (doc.isWar() && doc.draftTracks) {
              tracks = [];

              for (let i = 1; i <= trackCount; i += 1) {
                tracks.push('*N/A*');
              }
            }

            tracks = tracks.join('\n');
            const { players } = doc;

            let playersText = '';
            if (doc.isTeams()) {
              let playersCopy = [...players];
              if (players.length % 2 !== 0) {
                throw new Error('Players count is not divisible by 2');
              }

              doc.teamList.forEach((team) => {
                team.forEach((player) => {
                  playersCopy = playersCopy.filter((p) => p !== player);
                });
              });

              const shuffledPlayers = playersCopy.sort(() => Math.random() - 0.5);

              const randomTeams = [];
              let teamSize = 0;
              if (doc.isDuos()) teamSize = 2;
              if (doc.is3v3()) teamSize = 3;
              if (doc.is4v4()) teamSize = 4;

              const teamCount = shuffledPlayers.length / teamSize;

              // Balanced team making
              if (shuffledPlayers.length > 0) {
                const shuffledPlayerRanks = [];
                const playerModels = await Player.find({ discordId: { $in: shuffledPlayers } });
                const psns = playerModels.map((p) => p.psn);
                const rankModels = await Rank.find({ name: { $in: psns } });

                rankModels.forEach((r) => {
                  let ranking = PLAYER_DEFAULT_RANK;
                  if (r[doc.type]) {
                    ranking = r[doc.type].rank;
                  }

                  const player = playerModels.find((p) => p.psn === r.name);

                  shuffledPlayerRanks.push({
                    discordId: player.discordId,
                    rank: ranking,
                  });
                });

                const sorted = shuffledPlayerRanks.sort((a, b) => a.rank - b.rank);

                if (teamSize === 2) {
                  for (let i = 1; i <= teamCount; i += 1) {
                    const firstPlayer = sorted.shift();
                    const lastPlayer = sorted.pop();

                    randomTeams.push([
                      firstPlayer.discordId,
                      lastPlayer.discordId,
                    ]);
                  }
                }

                if ([3, 4].includes(teamSize)) {
                  if (teamCount > 1) {
                    /* custom greedy algorithm */
                    const result = {
                      A: [],
                      B: [],
                      sumA: 0,
                      sumB: 0,
                    };

                    sorted.forEach((s) => {
                      if ((result.sumA < result.sumB && result.A.length < teamSize) || result.B.length >= teamSize) {
                        result.A.push(s);
                        result.sumA += s.rank;
                      } else {
                        result.B.push(s);
                        result.sumB += s.rank;
                      }
                    });

                    const playersA = result.A.map((a) => a.discordId);
                    const playersB = result.B.map((b) => b.discordId);

                    randomTeams.push([...playersA]);
                    randomTeams.push([...playersB]);
                  } else {
                    const discordIds = sorted.map((s) => s.discordId);
                    randomTeams.push([...discordIds]);
                  }
                }
              }

              doc.teamList = Array.from(doc.teamList).concat(randomTeams);
              doc = await doc.save();

              playersText += '**Teams:**\n';
              doc.teamList.forEach((team, i) => {
                playersText += `${i + 1}.`;
                team.forEach((player, k) => {
                  playersText += `${k ? '⠀' : ''} <@${player}>\n`;
                });
              });
            } else {
              playersText = players.map((u, i) => `${i + 1}. <@${u}>`).join('\n');
            }

            const [PSNs, templateUrl, template, consoles] = await generateTemplate(players, doc);

            message.edit({
              embed: await getEmbed(doc, players, tracks, roomChannel),
            });

            const fields = [
              {
                name: 'PSN IDs & Ranks',
                value: PSNs.join('\n'),
                inline: true,
              },
              {
                name: 'Tracks',
                value: tracks,
                inline: true,
              },
            ];

            let modes = [];
            if (doc.isBattle()) {
              modes = await rngModeBattle(doc.type, tracks.split('\n'));

              fields.push({
                name: 'Modes',
                value: modes.join('\n'),
                inline: true,
              });
            }

            roomChannel.send({
              content: `**The ${doc.getTitle()} has started**
Your room is ${roomChannel}.
Use \`!lobby end\` when your match is done.
${playersText}`,
              embed: {
                color: doc.getColor(),
                title: `The ${doc.getTitle()} has started`,
                fields,
              },
            }).then((m) => {
              roomChannel.messages.fetchPinned().then((pinnedMessages) => {
                pinnedMessages.forEach((pinnedMessage) => pinnedMessage.unpin());
                m.pin();

                roomChannel.send({
                  embed: {
                    color: doc.getColor(),
                    title: 'Scores Template',
                    description: `\`\`\`${template}\`\`\`
  [Open template on gb.hlorenzi.com](${templateUrl})`,
                  },
                }).then(() => {
                  if (doc.isBattle()) {
                    let list;
                    if (doc.isFFA()) {
                      list = battleModesFFA;
                    } else if (doc.isWar()) {
                      list = battleModes4v4;
                    } else {
                      list = battleModesFFA;
                    }

                    const embedFields = [];
                    const entries = [];

                    modes.forEach((mode) => {
                      list.forEach((battleMode) => {
                        const entry = battleMode.find((element) => element.name === mode);

                        if (entry !== undefined && !entries.find((e) => e === mode)) {
                          embedFields.push({
                            name: mode,
                            value: entry.settings.join('\n'),
                          });

                          entries.push(mode);
                        }
                      });
                    });

                    roomChannel.send({
                      embed: {
                        color: doc.getColor(),
                        description: '**Global Settings**\nTeams: None (4 for Steal The Bacon)\nAI: Disabled',
                        author: {
                          name: 'Battle Mode Settings',
                        },
                        image: {
                          url: 'https://i.imgur.com/k56NKZc.jpg',
                        },
                        fields: embedFields,
                      },
                    });
                  }

                  const info = [`Report any rule violations to ranked staff by sending a DM to <@!${config.bot_user_id}>.`];

                  if (consoles.includes('PS5') && consoles.includes('PS4')) {
                    info.push('This lobby has players on PS4 as well as PS5. Please remember to turn on cutscenes and not start the next race too quickly to avoid lobby crashes!');
                  }

                  sendAlertMessage(roomChannel, info.map((i) => `• ${i}`).join('\n'), 'info').then(() => {
                    if (doc.isWar() && doc.draftTracks) {
                      const teams = ['A', 'B'];

                      const captainAPromise = client.guilds.cache.get(doc.guild).members.fetch(getRandomArrayElement(doc.teamList[0]));
                      const captainBPromise = client.guilds.cache.get(doc.guild).members.fetch(getRandomArrayElement(doc.teamList[1]));

                      Promise.all([captainAPromise, captainBPromise]).then((captains) => {
                        switch (doc.type) {
                          case RACE_3V3:
                            createDraft(roomChannel, '1', teams, captains);
                            break;
                          case RACE_4V4:
                            createDraft(roomChannel, '0', teams, captains);
                            break;
                          case BATTLE_4V4:
                            createDraftv2(roomChannel, 2, 0, 4, 30, captains);
                            break;
                          default:
                            break;
                        }
                      });
                    }

                    sendAlertMessage(roomChannel, 'Select a scorekeeper. The scorekeeper can react to this message to make others aware that he is keeping scores. If nobody reacts to this message within 5 minutes the lobby will be ended automatically.', 'info').then((m) => {
                      setTimeout(() => {
                        sendAlertMessage(roomChannel, 'Don\'t forget to select your scorekeeper because otherwise the lobby will be ended soon.', 'info');
                      }, 240000);

                      m.react('✅');

                      const filter = (r, u) => ['✅'].includes(r.emoji.name) && doc.players.includes(u.id);
                      const options = { max: 1, time: 300000, errors: ['time'] };

                      m.awaitReactions(filter, options).then((collected) => {
                        const reaction = collected.first();
                        const user = reaction.users.cache.last();

                        m.delete();
                        sendAlertMessage(roomChannel, `<@!${user.id}> has volunteered to do scores. Please make sure you keep the lobby updated about mid-match scores.`, 'success');
                      }).catch(() => {
                        deleteLobby(doc);
                        m.delete();
                        sendAlertMessage(roomChannel, 'The lobby was ended automatically because nobody volunteered to keep scores.', 'warning');
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }).catch(console.error);
}

function diffMinutes(dt2, dt1) {
  let diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

function confirmLobbyStart(doc, message, override = false) {
  const minutes = diffMinutes(new Date(), doc.date);

  if (doc.started) {
    return sendAlertMessage(message.channel, 'The lobby has already been started.', 'warning');
  }

  if (!override && minutes < FORCE_START_COOLDOWN) {
    return sendAlertMessage(message.channel, `You need to wait at least ${FORCE_START_COOLDOWN - minutes} more minutes to force start the lobby.`, 'warning');
  }

  const playersCount = doc.players.length;

  if (doc.isDuos() && playersCount % 2 !== 0) {
    return sendAlertMessage(message.channel, `The lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start Duos lobby with player count not divisible by 2.`, 'warning');
  }

  if (!doc.hasMinimumRequiredPlayers()) {
    return sendAlertMessage(message.channel, `You cannot start a ${doc.type} lobby with less than ${doc.getMinimumRequiredPlayers()} players.`, 'warning');
  }

  if (override) {
    return startLobby(doc.id);
  }

  return sendAlertMessage(message.channel, `The lobby \`${doc.id}\` has \`${playersCount}\` players. Are you sure you want to start it? Say \`yes\` or \`no\`.`, 'info').then(() => {
    const filter = (m) => m.author.id === message.author.id;
    const options = { max: 1, time: 60000, errors: ['time'] };

    message.channel.awaitMessages(filter, options).then((collected) => {
      const { content } = collected.first();
      if (content.toLowerCase() === 'yes') {
        if (doc.started) {
          return sendAlertMessage(message.channel, 'The lobby has already been started.', 'warning');
        }

        sendAlertMessage(message.channel, 'Generating tracks...', 'info').then((m) => m.delete({ timeout: 3000 }));
        startLobby(doc.id);
      } else {
        throw Error('cancel');
      }
    }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error'));
  });
}

function findLobby(lobbyID, isStaff, message, callback) {
  if (lobbyID) {
    let promise;

    if (isStaff) {
      promise = RankedLobby.findOne({ _id: lobbyID });
    } else {
      promise = RankedLobby.findOne({
        $or: [
          { _id: lobbyID, creator: message.author.id },
          { _id: lobbyID, started: true, players: message.author.id },
        ],
      });
    }

    promise.then((doc) => {
      if (!doc) {
        if (isStaff) {
          return sendAlertMessage(message.channel, 'There is no lobby with this ID.', 'warning');
        }

        return sendAlertMessage(message.channel, 'You don\'t have a lobby with this ID.', 'warning');
      }

      return callback(doc, message);
    });
  } else {
    RankedLobby.find({
      $or: [
        { creator: message.author.id },
        { started: true, players: message.author.id },
      ],
    }).then((docs) => {
      docs = docs.filter((doc) => {
        const guild = client.guilds.cache.get(doc.guild);
        if (!guild) {
          doc.delete();
          return false;
        }
        const channel = guild.channels.cache.get(doc.channel);
        if (!channel) {
          doc.delete();
          return false;
        }
        const docMessage = channel.messages.cache.get(doc.message);
        if (!docMessage) {
          doc.delete();
          return false;
        }

        return true;
      });

      if (!docs.length) {
        return sendAlertMessage(message.channel, 'You don\'t have any active lobbies!', 'warning');
      }

      if (docs.length === 1) {
        const doc = docs.shift();
        return callback(doc, message);
      }

      if (docs.length > 1) {
        const lobbies = docs.map((d) => `\`${d.id}\` created by <@${d.creator}>`).join('\n');
        return sendAlertMessage(message.channel, `You have more than 1 active lobby. You should specify the ID.\n${lobbies}`, 'warning');
      }
    });
  }
}

function deleteLobby(doc, msg) {
  const promiseMessageDelete = client.guilds.cache.get(doc.guild)
    .channels.cache.get(doc.channel)
    .messages.fetch(doc.message)
    .then((m) => m.delete());

  let endMessage = 'Lobby ended.';

  if (doc.started) {
    endMessage += ' Don\'t forget to submit your scores.';
  }

  const roomDocDelete = Room.findOne({ lobby: doc.id }).then((room) => {
    if (!room) {
      return;
    }

    const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
    if (msg && channel && msg.channel.id !== channel.id) {
      sendAlertMessage(channel, endMessage, 'success');
    }

    room.lobby = null;
    room.save();
  });

  const promiseDocDelete = doc.delete();

  Promise.all([promiseMessageDelete, promiseDocDelete, roomDocDelete]).then(() => {
    if (msg) {
      sendAlertMessage(msg.channel, endMessage, 'success');
    }
  });
}

module.exports = {
  name: 'lobby',
  description: 'Ranked lobbies',
  guildOnly: true,
  aliases: ['mogi', 'l', 'lebby'],
  async execute(message, args) {
    let action = args[0];
    let custom = false;

    if (!action) {
      action = 'new';
    }

    if (action === 'custom') {
      action = 'new';
      custom = true;
    }

    const lobbyID = args[1];
    const { member } = message;

    const configValue = await getConfigValue('ranked_lobby_lock_date', new Date());
    const now = moment();
    if (configValue) {
      const lockDate = moment(configValue);

      if (lockDate.isValid() && lockDate >= now) {
        return sendAlertMessage(message.channel, `Ranked Lobbies are temporarily closed until midnight CEST on ${lockDate.format('YYYY-MM-DD')}.`, 'warning');
      }
    }

    const { guild } = message;
    const { user } = member;

    const banned = await RankedBan.findOne({ discordId: user.id, guildId: guild.id });
    if (banned) {
      return sendAlertMessage(message.channel, 'You are currently banned from ranked lobbies.', 'warning');
    }

    const player = await Player.findOne({ discordId: user.id });
    if (!player || !player.psn) {
      return sendAlertMessage(message.channel, 'You need to set your PSN first by using `!set_psn`.', 'warning');
    }

    const isStaff = isStaffMember(member);

    const hasRankedRole = member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.ranked_verified_role.toLowerCase());

    if (!isStaff && !hasRankedRole) {
      return sendAlertMessage(message.channel, 'You don\'t have the `Ranked Verified` role to execute this command.', 'warning');
    }

    if (!isStaff) {
      if (!message.channel.parent || (message.channel.parent && message.channel.parent.name.toLowerCase() !== config.channels.ranked_lobbies_category.toLowerCase())) {
        return sendAlertMessage(message.channel, 'You can use this command only in the `Ranked Lobbies` category.', 'warning');
      }
    }

    action = action && action.toLowerCase();
    switch (action) {
      case 'new':
        const cooldown = await Cooldown.findOne({ guildId: guild.id, discordId: message.author.id, name: 'lobby' });
        if (!isStaff && cooldown && cooldown.count >= 1) {
          const updatedAt = moment(cooldown.updatedAt);
          updatedAt.add(5, 'm');
          const wait = moment.duration(now.diff(updatedAt));

          return sendAlertMessage(message.channel, `You cannot create multiple lobbies so often. You have to wait ${wait.humanize()}.`, 'warning');
        }

        const filter = (m) => m.author.id === message.author.id;
        const options = { max: 1, time: 60000, errors: ['time'] };

        return sendAlertMessage(message.channel, `Select lobby mode. Waiting 1 minute.
\`\`\`1 - FFA
2 - Itemless
3 - Duos
4 - 3 vs. 3
5 - 4 vs. 4
6 - Survival
7 - Itemless Duos
8 - Battle FFA
9 - Battle 4 vs. 4\`\`\``, 'info').then((confirmMessage) => {
          message.channel.awaitMessages(filter, options).then(async (collected) => {
            confirmMessage.delete();

            let collectedMessage = collected.first();
            const { content } = collectedMessage;

            let sentMessage;
            let choice = parseInt(content, 10);
            const modes = [1, 2, 3, 4, 5, 6, 7, 8, 9];

            if (modes.includes(choice)) {
              let type;
              switch (choice) {
                case 1:
                  type = RACE_FFA;
                  break;
                case 2:
                  type = RACE_ITEMLESS;
                  break;
                case 3:
                  type = RACE_DUOS;
                  break;
                case 4:
                  type = RACE_3V3;
                  break;
                case 5:
                  type = RACE_4V4;
                  break;
                case 6:
                  type = RACE_SURVIVAL;
                  break;
                case 7:
                  type = RACE_ITEMLESS_DUOS;
                  break;
                case 8:
                  type = BATTLE_FFA;
                  break;
                case 9:
                  type = BATTLE_4V4;
                  break;
                default:
                  break;
              }

              // Initialize lobby here to be able to use model functions
              const lobby = new RankedLobby();
              lobby.guild = guild.id;
              lobby.creator = message.author.id;
              lobby.type = type;

              const trackOptions = lobby.getTrackOptions();

              let trackOption = ![RACE_FFA, BATTLE_FFA].includes(type) ? TRACK_OPTION_POOLS : TRACK_OPTION_RNG;
              let pools = ![RACE_FFA, BATTLE_FFA].includes(type);
              let draftTracks = false;
              let spicyTracks = false;

              if (trackOptions.length > 1 && custom) {
                sentMessage = await sendAlertMessage(message.channel, `Select track option. Waiting 1 minute.
\`\`\`${trackOptions.map((t, i) => `${i + 1} - ${t}`).join('\n')}\`\`\``, 'info');

                const trackOptionSelection = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  return parseInt(content, 10);
                }).catch(() => {
                  sentMessage.delete();
                  return 1;
                });

                const index = trackOptionSelection - 1;

                if (trackOptions[index] === TRACK_OPTION_RNG) {
                  pools = false;
                } else if (trackOptions[index] === TRACK_OPTION_POOLS) {
                  pools = true;
                } else if (trackOptions[index] === TRACK_OPTION_SPICY) {
                  pools = false;
                  spicyTracks = true;
                } else if (trackOptions[index] === TRACK_OPTION_DRAFT) {
                  pools = false;
                  draftTracks = true;
                } else if (trackOptions[index] === TRACK_OPTION_IRON_MAN) {
                  pools = false;
                }

                trackOption = trackOptions[index];
              }

              lobby.pools = pools;
              lobby.draftTracks = draftTracks;
              lobby.spicyTracks = spicyTracks;

              let trackCount = (trackOption === TRACK_OPTION_IRON_MAN ? lobby.getMaxTrackCount() : lobby.getDefaultTrackCount());

              if (trackOption !== TRACK_OPTION_IRON_MAN && !draftTracks && !spicyTracks && type !== RACE_SURVIVAL && custom) {
                const text = lobby.getTrackCountOptions().map((o) => `\`${o}\``).join(', ');
                sentMessage = await sendAlertMessage(message.channel, `Select the number of tracks. The number has to be any of ${text}.`, 'info');

                trackCount = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  choice = parseInt(content, 10);
                  if (lobby.getTrackCountOptions().includes(choice)) {
                    return choice;
                  }

                  return lobby.getDefaultTrackCount();
                }).catch(() => {
                  sentMessage.delete();
                  return lobby.getDefaultTrackCount();
                });
              }

              lobby.trackCount = trackCount;

              let lapCount = 5;
              if (![BATTLE_FFA, BATTLE_4V4].includes(type) && custom) {
                sentMessage = await sendAlertMessage(message.channel, 'Select the number of laps. The number has to be `3`, `5` or `7`. Every other input will be counted as `5`.', 'info');

                lapCount = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  choice = parseInt(content, 10);
                  if ([3, 5, 7].includes(choice)) {
                    return choice;
                  }

                  return 5;
                }).catch(() => {
                  sentMessage.delete();
                  return 5;
                });
              }

              lobby.lapCount = lapCount;

              let ruleset = 1;
              if (![BATTLE_FFA, BATTLE_4V4].includes(type) && custom) {
                sentMessage = await sendAlertMessage(message.channel, `Select the ruleset. Waiting 1 minute.
\`\`\`${rulesets.map((r, i) => `${i + 1} - ${r.name}`).join('\n')}\`\`\``, 'info');

                ruleset = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  choice = parseInt(content, 10) - 1;
                  if (rulesets[choice]) {
                    return choice;
                  }

                  return 1;
                });
              }

              lobby.ruleset = ruleset;

              let region = null;
              if (custom) {
                sentMessage = await sendAlertMessage(message.channel, `Select region lock. Waiting 1 minute.
\`\`\`${regions.map((r, i) => `${i + 1} - ${r.description}`).join('\n')}
${regions.length + 1} - No region lock\`\`\``, 'info');

                region = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  choice = parseInt(content, 10);
                  if (choice < 4) {
                    return `region${choice}`;
                  }

                  return null;
                }).catch(() => {
                  sentMessage.delete();
                  return null;
                });
              }

              if (region) {
                lobby.region = region;
              }

              let engineRestriction = null;
              const engineUids = engineStyles.map((e) => e.uid);
              if (![BATTLE_FFA, BATTLE_4V4].includes(type) && custom) {
                sentMessage = await sendAlertMessage(message.channel, `Select an engine restriction. Waiting 1 minute.
\`\`\`${engineStyles.map((e, i) => `${i + 1} - ${e.name}`).join('\n')}
${engineStyles.length + 1} - No engine restriction\`\`\``, 'info');

                engineRestriction = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  choice = parseInt(content, 10);
                  if (choice > 0 && choice < 6) {
                    return engineUids[choice - 1];
                  }

                  return null;
                }).catch(() => {
                  sentMessage.delete();
                  return null;
                });
              }

              if (engineRestriction) {
                lobby.engineRestriction = engineRestriction;
              }

              let survivalStyle = 1;
              if (type === RACE_SURVIVAL && custom) {
                sentMessage = await sendAlertMessage(message.channel, `Select a play style. Waiting 1 minute.
\`\`\`${SURVIVAL_STYLES.map((s, i) => `${i + 1} - ${s}`).join('\n')}\`\`\``, 'info');

                survivalStyle = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  choice = parseInt(content, 10) - 1;
                  if (SURVIVAL_STYLES[choice]) {
                    return choice;
                  }

                  return 1;
                }).catch(() => {
                  sentMessage.delete();
                  return 1;
                });
              }

              lobby.survivalStyle = survivalStyle;

              let allowPremadeTeams = true;
              if (custom && [RACE_DUOS, RACE_3V3, RACE_4V4, RACE_ITEMLESS_DUOS, BATTLE_4V4].includes(type)) {
                sentMessage = await sendAlertMessage(message.channel, 'Do you want to allow premade teams? (yes / no)', 'info');
                allowPremadeTeams = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  return (content.toLowerCase() !== 'no');
                }).catch(() => {
                  sentMessage.delete();
                  return true;
                });
              }

              lobby.allowPremadeTeams = allowPremadeTeams;

              let reservedTeam = null;
              if (custom && allowPremadeTeams && [RACE_3V3, RACE_4V4, BATTLE_4V4].includes(type)) {
                sentMessage = await sendAlertMessage(message.channel, 'Do you want to reserve the lobby for an existing team? (yes / no)', 'info');
                const reserveLobby = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  return (content.toLowerCase() === 'yes');
                }).catch(() => {
                  sentMessage.delete();
                  return false;
                });

                if (reserveLobby) {
                  sentMessage = await sendAlertMessage(message.channel, 'Please mention one of the team members.', 'info');
                  const discordId = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                    sentMessage.delete();

                    collectedMessage = collected.first();
                    const mentionedUser = collectedMessage.mentions.users.first();

                    if (!mentionedUser) {
                      return null;
                    }

                    return mentionedUser.id;
                  }).catch(() => {
                    sentMessage.delete();
                    return null;
                  });

                  if (!discordId) {
                    return sendAlertMessage(message.channel, 'You need to mention a user.', 'warning');
                  } if (discordId === message.author.id) {
                    return sendAlertMessage(message.channel, 'You cannot mention yourself', 'warning');
                  }

                  reservedTeam = discordId;
                }
              }

              if (reservedTeam) {
                lobby.reservedTeam = reservedTeam;
              }

              let ranked = lobby.canBeRanked();
              if (custom && lobby.canBeRanked()) {
                sentMessage = await sendAlertMessage(message.channel, 'Do you want to create a ranked lobby? (yes / no)', 'info');
                ranked = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  if (content.toLowerCase() === 'maybe') {
                    return Boolean(Math.round(Math.random()));
                  }

                  return (content.toLowerCase() !== 'no');
                }).catch(() => {
                  sentMessage.delete();
                  return true;
                });
              }

              lobby.ranked = ranked;

              let mmrLock = false;
              let rankDiff = null;
              let playerRank = null;

              if (custom && ranked) {
                sentMessage = await sendAlertMessage(message.channel, 'Do you want to put a rank restriction on your lobby? (yes / no)', 'info');
                mmrLock = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  collectedMessage = collected.first();
                  const { content } = collectedMessage;

                  return (content.toLowerCase() === 'yes');
                }).catch(() => {
                  sentMessage.delete();
                  return false;
                });

                if (mmrLock) {
                  const diffMin = 200;
                  const diffMax = 500;
                  const diffDefault = 350;

                  sentMessage = await sendAlertMessage(message.channel, `Select allowed rank difference. Waiting 1 minute.
The value should be in the range of \`${diffMin} to ${diffMax}\`. The value defaults to \`${diffDefault}\` on any other input.`, 'info');

                  rankDiff = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                    sentMessage.delete();

                    collectedMessage = collected.first();
                    const { content } = collectedMessage;

                    let diff = parseInt(content, 10);

                    if (Number.isNaN(diff) || diff < diffMin || diff > diffMax) {
                      diff = diffDefault;
                    }

                    return diff;
                  }).catch(() => {
                    sentMessage.delete();
                    return diffDefault;
                  });

                  const rank = await Rank.findOne({ name: player.psn });
                  playerRank = PLAYER_DEFAULT_RANK;

                  if (rank && rank[type] && rank[type].rank) {
                    playerRank = rank[type].rank;
                  }
                }
              }

              if (mmrLock) {
                lobby.locked = {
                  rank: playerRank,
                  shift: Number(rankDiff),
                };
              }

              await Cooldown.findOneAndUpdate(
                { guildId: guild.id, discordId: message.author.id, name: 'lobby' },
                { $inc: { count: 1 }, $set: { updatedAt: now } },
                { upsert: true, new: true },
              );

              lobby.save().then(async (doc) => {
                const role = await createAndFindRole(guild, doc.getRoleName());

                let channel;
                let ping = null;
                if (lobby.ranked) {
                  channel = guild.channels.cache.find((c) => c.name === config.channels.ranked_lobbies_channel);
                  ping = role;
                } else {
                  channel = guild.channels.cache.find((c) => c.name === config.channels.unranked_lobbies_channel);
                }

                channel.send({
                  content: ping,
                  embed: await getEmbed(doc),
                }).then((m) => {
                  doc.channel = m.channel.id;
                  doc.message = m.id;
                  doc.save().then(() => {
                    m.react('✅');
                    sendAlertMessage(message.channel, `${doc.getTitle()} has been created. Don't forget to press ✅`, 'success');
                  });
                });
              });
            } else {
              return sendAlertMessage(message.channel, 'Command cancelled.', 'error').then((m) => m.delete({ timeout: 5000 }));
            }
          }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error').then((m) => m.delete({ timeout: 5000 })));
        }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error').then((m) => m.delete({ timeout: 5000 })));

        break;

      case 'start':
        findLobby(lobbyID, isStaff, message, confirmLobbyStart);
        break;

      case 'override':
        if (isStaff) {
          findLobby(lobbyID, isStaff, message, (d, m) => confirmLobbyStart(d, m, true));
        } else {
          return sendAlertMessage(message.channel, 'You don\'t have permissions to do that.', 'warning');
        }
        break;
      case 'end':
        findLobby(lobbyID, isStaff, message, (doc, msg) => {
          if (doc.started) {
            const minutes = diffMinutes(new Date(), doc.startedAt);
            const confirmationMinutes = doc.getLobbyEndCooldown();
            if (minutes < confirmationMinutes) {
              Room.findOne({ lobby: doc.id }).then((room) => {
                if (!room) {
                  return deleteLobby(doc, msg);
                }

                const roomChannel = message.guild.channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
                if (roomChannel) {
                  const requiredReactions = Math.ceil((doc.players.length - 1) * 0.75);

                  sendAlertMessage(roomChannel, `I need reactions from ${requiredReactions} other people in the lobby to confirm.`, 'info', doc.players).then((voteMessage) => {
                    voteMessage.react('✅');

                    const filter = (r, u) => ['✅'].includes(r.emoji.name) && doc.players.includes(u.id) && u.id !== message.author.id;
                    voteMessage.awaitReactions(filter, {
                      max: requiredReactions,
                      time: 60000,
                      errors: ['time'],
                    }).then((collected) => {
                      if (voteMessage.deleted) {
                        return sendAlertMessage(roomChannel, 'Command cancelled. Stop abusing staff powers.', 'error');
                      }

                      deleteLobby(doc, msg);
                    }).catch(() => {
                      sendAlertMessage(voteMessage.channel, 'Command cancelled.', 'error');
                    });
                  });
                }
              });
            } else {
              deleteLobby(doc, msg);
            }
          } else {
            return deleteLobby(doc, msg);
          }
        });
        break;
      case 'redo':
        findLobby(lobbyID, isStaff, message, (doc, msg) => {
          if (doc.started) {
            const minutes = diffMinutes(new Date(), doc.startedAt);
            const confirmationMinutes = doc.getLobbyEndCooldown();

            if (minutes >= confirmationMinutes) {
              Room.findOne({ lobby: doc.id }).then((room) => {
                if (!room) {
                  return deleteLobby(doc, msg);
                }

                const roomChannel = message.guild.channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
                if (roomChannel) {
                  const maxReactions = Math.ceil(doc.players.length / 2);
                  const pings = doc.players.map((p) => `<@${p}>`).join(' ');
                  sendAlertMessage(message.channel, `I need reactions from ${maxReactions} other people in the lobby to confirm.\n${pings}`, 'info').then((voteMessage) => {
                    voteMessage.react('✅');

                    const filter = (r, u) => ['✅'].includes(r.emoji.name) && doc.players.includes(u.id) && u.id !== message.author.id;
                    voteMessage.awaitReactions(filter, {
                      max: maxReactions,
                      time: 60000,
                      errors: ['time'],
                    }).then(async () => {
                      if (voteMessage.deleted) {
                        return sendAlertMessage(message.channel, 'Command cancelled. Stop abusing staff powers.', 'error');
                      }

                      const relobby = doc;
                      relobby._id = null;
                      relobby.date = null;
                      relobby.channel = null;
                      relobby.message = null;
                      relobby.started = null;
                      relobby.startedAt = null;
                      relobby.closed = false;

                      deleteLobby(doc, msg);

                      relobby.save().then(async (savedRelobby) => {
                        let content = null;
                        if (relobby.ranked) {
                          content = await createAndFindRole(guild, savedRelobby.getRoleName());
                        }

                        const channel = guild.channels.cache.find((c) => c.id === doc.channel);

                        channel.send({
                          content,
                          embed: await getEmbed(savedRelobby),
                        }).then((m) => {
                          savedRelobby.channel = m.channel.id;
                          savedRelobby.message = m.id;
                          savedRelobby.save().then((document) => {
                            m.react('✅');
                            sendAlertMessage(message.channel, `${savedRelobby.getTitle()} has been recreated.`, 'success');

                            startLobby(document._id);
                          });
                        });
                      });
                    }).catch(() => {
                      sendAlertMessage(voteMessage.channel, 'Command cancelled.', 'error');
                    });
                  });
                }
              });
            } else {
              return sendAlertMessage(message.channel, 'You cannot redo a lobby that has not been finished yet.', 'warning');
            }
          } else {
            return sendAlertMessage(message.channel, 'You cannot redo a lobby that has not been started yet.', 'warning');
          }
        });
        break;
      case 'join':
        findLobby(lobbyID, isStaff, message, (doc) => {
          if (!doc) {
            return sendAlertMessage(message.channel, 'There is no lobby with this ID.', 'warning');
          }

          if (doc.started) {
            return sendAlertMessage(message.channel, 'You cannot join a lobby that has already been started.', 'warning');
          }

          if (doc.players.includes(message.author.id)) {
            return sendAlertMessage(message.channel, 'You already joined this lobby.', 'warning');
          }

          client.guilds.cache.get(doc.guild).channels.cache.get(doc.channel).messages.fetch(doc.message).then((lobbyMessage) => {
            const reaction = {
              message: lobbyMessage,
              users: null,
            };

            mogi(reaction, message.author);
          });
        });
        break;
      case 'leave':
        findLobby(lobbyID, isStaff, message, (doc) => {
          if (!doc) {
            return sendAlertMessage(message.channel, 'There is no lobby with this ID.', 'warning');
          }

          if (doc.started) {
            return sendAlertMessage(message.channel, 'You cannot leave a lobby that has already been started.', 'warning');
          }

          if (!doc.players.includes(message.author.id)) {
            return sendAlertMessage(message.channel, 'You never joined this lobby.', 'warning');
          }

          client.guilds.cache.get(doc.guild).channels.cache.get(doc.channel).messages.fetch(doc.message).then((lobbyMessage) => {
            const reaction = {
              message: lobbyMessage,
              users: null,
            };

            // eslint-disable-next-line no-use-before-define
            mogi(reaction, message.author, true);
          });
        });
        break;
      case 'quit':
        findLobby(lobbyID, isStaff, message, (doc) => {
          if (!doc) {
            return sendAlertMessage(message.channel, 'There is no lobby with this ID.', 'warning');
          }

          if (!doc.started) {
            return sendAlertMessage(message.channel, 'You cannot quit a lobby that has not been started.', 'warning');
          }

          if (!doc.isSurvival()) {
            return sendAlertMessage(message.channel, 'You can only quit survival lobbies.', 'warning');
          }

          doc.players = doc.players.filter((p) => p !== message.author.id);
          doc.save().then(() => {
            sendAlertMessage(message.channel, 'You were removed from the lobby.', 'success');

            if (doc.players.length <= 1) {
              deleteLobby(doc, message);
            }
          }).catch(() => {
            sendAlertMessage(message.channel, 'Something went wrong when removing you from the lobby.', 'error');
          });
        });
        break;
      case 'update_ranks':
        if (!isStaff) {
          return sendAlertMessage(message.channel, 'You need to be a staff member to use this command.', 'warning');
        }

        // eslint-disable-next-line no-use-before-define
        getRanks().then(() => {
          sendAlertMessage(message.channel, 'All ranks have been updated.', 'success');
        });
        break;
      case 'force_add':
        findLobby(lobbyID, isStaff, message, (doc) => {
          if (!doc) {
            return sendAlertMessage(message.channel, 'There is no lobby with this ID.', 'warning');
          }

          const forced = message.mentions.users.first();

          if (doc.started) {
            return sendAlertMessage(message.channel, 'You cannot force a user into a lobby that has already been started.', 'warning');
          }

          if (doc.players.includes(forced.id)) {
            return sendAlertMessage(message.channel, `<@!${forced.id}> already joined this lobby.`, 'warning');
          }

          client.guilds.cache.get(doc.guild).channels.cache.get(doc.channel).messages.fetch(doc.message).then((lobbyMessage) => {
            const reaction = {
              message: lobbyMessage,
              users: null,
            };

            // eslint-disable-next-line no-use-before-define
            mogi(reaction, forced);
          });
        });
        break;
      default:
        break;
    }
  },
};

const banDuration = moment.duration(5, 'minutes');

// todo rewrite with Cooldown model
async function tickCount(reaction, user) {
  const { guild } = reaction.message;

  const member = await guild.members.fetch(user.id);
  const isStaff = isStaffMember(member);
  if (isStaff) return;

  const now = new Date();
  Counter.findOneAndUpdate(
    { guildId: guild.id, discordId: user.id },
    { $inc: { tickCount: 1 }, $set: { tickUpdatedAt: now } },
    { upsert: true, new: true },
  ).then((doc) => {
    if (doc.tickCount === 7) { // ban
      if (reaction.users) {
        reaction.users.remove(user);
      }

      const bannedTill = moment().add(banDuration);
      RankedBan.findOneAndUpdate(
        { guildId: guild.id, discordId: user.id },
        { bannedAt: now, bannedTill },
        { upsert: true },
      ).exec();

      const lobbiesChannel = guild.channels.cache.find((c) => c.name === config.channels.ranked_lobbies_channel);
      lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false });

      const notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_notifications_channel.toLowerCase());
      const message = `You've been banned from ranked lobbies for ${banDuration.humanize()}.`;

      user.createDM().then((dm) => dm.send(message)).catch(() => { });
      sendAlertMessage(notificationChannel, message, 'warning', [user.id]);
    } else if (doc.tickCount === 3 || doc.tickCount === 5) {
      const notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_notifications_channel.toLowerCase());
      const message = `I will ban you from ranked lobbies for ${banDuration.humanize()} if you continue to spam reactions.`;

      user.createDM().then((dm) => dm.send(message)).catch(() => { });
      sendAlertMessage(notificationChannel, message, 'warning', [user.id]);
    }
  });
}

async function restrictSoloQueue(doc, user, soloQueue) {
  const errors = [];
  const player = await Player.findOne({ discordId: user.id });

  if (doc.reservedTeam) {
    if (![doc.creator, doc.reservedTeam].includes(user.id)) {
      errors.push(`This lobby is reserved for <@!${doc.creator}>'s and <@!${doc.reservedTeam}>'s teams.`);
    } else {
      errors.push('This lobby is reserved for your team. Please set your team members first.');
    }
  }

  if (!doc.locked.$isEmpty()) {
    let rank = PLAYER_DEFAULT_RANK;

    if (player && player.psn) {
      const playerRank = await Rank.findOne({ name: player.psn });

      if (playerRank && playerRank[doc.type]) {
        rank = playerRank[doc.type].rank;
      }
    }

    const minRank = doc.locked.rank - doc.locked.shift;
    const maxRank = doc.locked.rank + doc.locked.shift;
    const rankTooLow = rank < minRank;
    const rankTooHigh = rank > maxRank;

    if (rankTooLow || rankTooHigh) {
      errors.push(`Your rank is too ${rankTooLow ? 'low' : 'high'}.`);
    }
  }

  if (!doc.isBattle() && !doc.isItemless()) {
    if (!player || (!player.discordVc && !player.ps4Vc)) {
      errors.push('You are unable to use voice chat. Please set your voice chat options first by using `!set_voice_chat`.');
    }

    let playerLanguages;
    if (player) {
      playerLanguages = player.languages || [];
    } else {
      playerLanguages = [];
    }

    if (playerLanguages.length <= 0) {
      errors.push('You need to set your languages first. You can do so by using `!set_languages`.');
    }

    if (soloQueue.length >= 1) {
      const soloQueuers = await Player.find({ discordId: { $in: soloQueue } });

      const referenceLanguages = [];
      const languages = [];
      let compatibleLanguage = false;

      // Check all languages of all players,
      // find those languages that everyone speaks
      // and check if the player who wants to join speaks any of those languages
      soloQueuers.forEach((p) => {
        const soloQueuerLanguages = p.languages || [];

        soloQueuerLanguages.forEach((l) => {
          if (languages[l]) {
            languages[l].count += 1;
          } else {
            languages[l] = {
              language: l,
              count: 1,
            };
          }

          if (languages[l].count === soloQueue.length) {
            referenceLanguages.push(languages[l]);

            referenceLanguages.forEach((r) => {
              playerLanguages.forEach((pl) => {
                if (r.language === pl) {
                  compatibleLanguage = true;
                }
              });
            });
          }
        });
      });

      if (!compatibleLanguage) {
        errors.push('You don\'t speak the same language as the other players. You can set your language by using `!set_languages`.');
      }

      const soloQueuerVcs = { discord: 0, ps4: 0 };
      let compatibleVc = false;

      soloQueuers.forEach((p) => {
        soloQueuerVcs.discord += p.discordVc ? 1 : 0;
        soloQueuerVcs.ps4 += p.ps4Vc ? 1 : 0;

        if ((soloQueuerVcs.discord === soloQueue.length && player.discordVc) || (soloQueuerVcs.ps4 === soloQueue.length && player.ps4Vc)) {
          compatibleVc = true;
        }
      });

      if (!compatibleVc) {
        errors.push('You are unable to use the same voice chat as the other players. You can set your voice chat options by using `!set_voice_chat`.');
      }
    }
  }

  return errors;
}

/**
 * Validates NAT Types in a lobby
 * @param doc
 * @returns {Promise<{valid: boolean, conflicts: []}>}
 */
async function validateNatTypes(doc) {
  const players = await Player.find({ discordId: { $in: doc.players } });

  let hasNat1 = false;
  let hasNat2O = false;
  let hasNat3 = false;
  const nat3Players = [];

  players.forEach((p) => {
    if (p.nat === 'NAT 1') {
      hasNat1 = true;
    }

    if (p.nat === 'NAT 2 Open') {
      hasNat2O = true;
    }

    if (p.nat === 'NAT 3') {
      hasNat3 = true;
      nat3Players.push(p);
    }
  });

  let valid = true;
  const conflicts = [];

  if (hasNat3 && !hasNat1 && !hasNat2O) {
    valid = false;

    if (hasNat3) {
      nat3Players.forEach((n) => {
        conflicts.push(`<@!${n.discordId}> [${n.nat}]`);
      });
    }
  }

  return {
    valid,
    conflicts,
  };
}

async function mogi(reaction, user, removed = false) {
  if (user.id === client.user.id) {
    return;
  }

  const { message } = reaction;
  if (message.author.id === client.user.id) {
    const conditions = {
      guild: message.guild.id,
      channel: message.channel.id,
      message: message.id,
      started: false,
      closed: false,
    };

    const { guild } = message;

    let rankedNotifications = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_notifications_channel.toLowerCase());
    if (!rankedNotifications) {
      rankedNotifications = await guild.channels.create(config.channels.ranked_notifications_channel);
    }

    RankedLobby.findOne(conditions).then(async (doc) => {
      if (doc) {
        const errors = [];

        if (!removed) {
          tickCount(reaction, user);

          const member = await guild.members.fetch(user.id);
          if (!member) return;

          const banned = await RankedBan.findOne({ discordId: member.id, guildId: guild.id });
          if (banned && doc.ranked) {
            const lobbiesChannel = guild.channels.cache.find((c) => c.name === config.channels.ranked_lobbies_channel);
            lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false });
            errors.push('You are banned.');
          }

          if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.muted_role)) {
            errors.push('You are muted.');
          }

          const player = await Player.findOne({ discordId: user.id });

          if (!player || !player.psn) {
            errors.push('You need to set your PSN. Example: `!set_psn ctr_tourney_bot`.');
          }

          if (!player || !player.nat) {
            errors.push('You need to set your NAT Type. Use `!set_nat` and then follow the bot instructions.');
          }

          if (!player || player.consoles.length <= 0) {
            errors.push('You need to set your console. Use `!set_console` and then follow the bot instructions.');
          }

          if (doc.region) {
            if (!player || !player.region) {
              errors.push('You need to set your region because the lobby you are trying to join is region locked. Use `!set_region` and then follow the bot instructions.');
            } else if (player.region !== doc.region) {
              const lobbyRegion = regions.find((r) => r.uid === doc.region);
              const playerRegion = regions.find((r) => r.uid === player.region);

              errors.push(`The lobby you are trying to join is locked to ${lobbyRegion.name} and you are from ${playerRegion.name}.`);
            }
          }

          const repeatLobby = await RankedLobby.findOne({ guild: guild.id, players: user.id, _id: { $ne: doc._id } });

          if (repeatLobby) {
            errors.push('You cannot be in 2 lobbies at the same time.');
          }

          if (!doc.locked.$isEmpty() && [RACE_FFA, RACE_ITEMLESS, RACE_SURVIVAL, BATTLE_FFA].includes(doc.type) && player.psn) {
            const playerRank = await Rank.findOne({ name: player.psn });

            let rank = PLAYER_DEFAULT_RANK;
            if (playerRank && playerRank[doc.type]) {
              rank = playerRank[doc.type].rank;
            }

            const lockedRank = doc.locked.rank;
            const minRank = lockedRank - doc.locked.shift;
            const maxRank = lockedRank + doc.locked.shift;
            const rankTooLow = rank < minRank;
            const rankTooHigh = rank > maxRank;

            if (rankTooLow || rankTooHigh) {
              errors.push(`Your rank is too ${rankTooLow ? 'low' : 'high'}.`);
            }
          }

          if (player && player.nat && doc.type === RACE_SURVIVAL && player.nat === NAT3) {
            errors.push('You cannot join a survival lobby because you are NAT Type 3.');
          }
        }

        lock.acquire(doc._id, async () => RankedLobby.findOne({ _id: doc._id }).then(async (doc) => {
          let players = Array.from(doc.players);

          const playersCount = players.length;
          if (!removed && doc.hasMaximumAllowedPlayers()) {
            return;
          }

          let teamList = Array.from(doc.teamList);

          if (doc.isDuos()) {
            const userSavedDuo = await Duo.findOne({
              guild: guild.id,
              $or: [{ discord1: user.id }, { discord2: user.id }],
            });
            if (userSavedDuo) {
              if (!doc.allowPremadeTeams) {
                errors.push('The lobby does not allow premade teams.');
              }

              const savedPartner = userSavedDuo.discord1 === user.id ? userSavedDuo.discord2 : userSavedDuo.discord1;

              if (removed) {
                players = players.filter((p) => p !== user.id && p !== savedPartner);
                teamList = teamList.filter((p) => !(Array.isArray(p) && p.includes(user.id)));
              } else {
                const repeatLobbyPartner = await RankedLobby.findOne({
                  guild: guild.id,
                  players: savedPartner,
                  _id: { $ne: doc._id },
                });

                if (repeatLobbyPartner) {
                  errors.push('Your partner is in another lobby.');
                }

                const partnerBanned = await RankedBan.findOne({ discordId: savedPartner, guildId: guild.id });
                if (partnerBanned) {
                  userSavedDuo.delete();
                  errors.push('Your partner is banned. The duo has been deleted.');
                }

                const partner = await Player.findOne({ discordId: savedPartner });

                if (!partner || !partner.nat) {
                  errors.push('Your partner needs to set their NAT Type. Use `!set_nat` and then follow the bot instructions.');
                }

                if (doc.region) {
                  if (!partner || !partner.region) {
                    errors.push('Your partner needs to set their region. Use `!set_region` and then follow the bot instructions.');
                  } else if (partner.region !== doc.region) {
                    const lobbyRegion = regions.find((r) => r.uid === doc.region);
                    const partnerRegion = regions.find((r) => r.uid === partner.region);

                    errors.push(`The lobby you are trying to join is locked to ${lobbyRegion.name} and your partner is from ${partnerRegion.name}.`);
                  }
                }

                if (!doc.locked.$isEmpty()) {
                  const player = await Player.findOne({ discordId: user.id });

                  let player1Rank = PLAYER_DEFAULT_RANK;
                  let player2Rank = PLAYER_DEFAULT_RANK;

                  if (player && player.psn && partner && partner.psn) {
                    const playerRank = await Rank.findOne({ name: player.psn });
                    const partnerRank = await Rank.findOne({ name: partner.psn });

                    if (playerRank && playerRank[doc.type]) {
                      player1Rank = playerRank[doc.type].rank;
                    }

                    if (partnerRank && partnerRank[doc.type]) {
                      player2Rank = partnerRank[doc.type].rank;
                    }
                  }

                  const averageRank = Math.ceil((player1Rank + player2Rank) / 2);

                  const minRank = doc.locked.rank - doc.locked.shift;
                  const maxRank = doc.locked.rank + doc.locked.shift;
                  const rankTooLow = averageRank < minRank;
                  const rankTooHigh = averageRank > maxRank;

                  if (rankTooLow || rankTooHigh) {
                    errors.push(`Your team's rank is too ${rankTooLow ? 'low' : 'high'}.`);
                  }
                }

                if (playersCount === 7) {
                  const soloQueue = players.filter((p) => !doc.teamList.flat().includes(p));
                  const lastSoloQueuePlayer = soloQueue.pop();
                  players = players.filter((p) => p !== lastSoloQueuePlayer);
                }

                if (!players.includes(user.id) && !players.includes(savedPartner)) {
                  const duo = [user.id, savedPartner];
                  players.push(...duo);
                  teamList.push(duo);
                }
              }
            } else if (removed) {
              players = players.filter((p) => p !== user.id);
            } else if (!players.includes(user.id)) {
              const soloQueue = players.filter((p) => !doc.teamList.flat().includes(p));
              const soloQueueErrors = await restrictSoloQueue(doc, user, soloQueue);

              if (soloQueueErrors <= 0) {
                players.push(user.id);
              } else {
                errors.push(...soloQueueErrors);
              }
            }
            doc.teamList = teamList;
          } else if (doc.isWar()) {
            const team = await Team.findOne({
              guild: guild.id,
              players: user.id,
            });
            if (team) {
              if (doc.is3v3() && team.players.length === 4) {
                errors.push('You cannot join a 3 vs. 3 lobby with a team of 4 players.');
              }

              if (doc.is4v4() && team.players.length === 3) {
                errors.push('You cannot join a 4 vs. 4 lobby with a team of 3 players.');
              }

              if (!doc.allowPremadeTeams) {
                errors.push('This lobby does not allow premade teams.');
              }

              const teamPlayers = team.players;

              if (removed) {
                players = players.filter((p) => !teamPlayers.includes(p));
                teamList = teamList.filter((p) => !(Array.isArray(p) && p.includes(user.id)));
              } else {
                const repeatLobbyTeam = await RankedLobby.findOne({
                  guild: guild.id,
                  players: { $in: teamPlayers },
                  _id: { $ne: doc._id },
                });

                if (repeatLobbyTeam) {
                  errors.push('One of your teammates is in another lobby.');
                }

                const teammateBanned = await RankedBan.findOne({ discordId: teamPlayers, guildId: guild.id });
                if (teammateBanned) {
                  team.delete();
                  errors.push('One of your teammates is banned. The team has been deleted.');
                }

                const teammates = await Player.find({ discordId: { $in: teamPlayers } });
                let rankSum = 0;

                for (const i in teammates) {
                  const teammate = teammates[i];

                  if (!teammate.nat) {
                    errors.push(`Your teammate ${teammate.psn} needs to set their NAT Type. Use \`!set_nat\` and then follow the bot instructions.`);
                  }

                  if (doc.region) {
                    if (!teammate.region) {
                      errors.push(`Your teammate ${teammate.psn} needs to set their region. Use \`!set_region\` and then follow the bot instructions.`);
                    } else if (teammate.region !== doc.region) {
                      const lobbyRegion = regions.find((r) => r.uid === doc.region);
                      const teammateRegion = regions.find((r) => r.uid === teammate.region);

                      errors.push(`The lobby you are trying to join is locked to ${lobbyRegion.name} and your teammate ${teammate.psn} is from ${teammateRegion.name}.`);
                    }
                  }

                  if (!doc.locked.$isEmpty()) {
                    const teammateRank = await Rank.findOne({ name: teammate.psn });

                    let rank = PLAYER_DEFAULT_RANK;
                    if (teammateRank && teammateRank[doc.type]) {
                      rank = teammateRank[doc.type].rank;
                    }

                    rankSum += rank;
                  }
                }

                if (!doc.locked.$isEmpty()) {
                  const averageRank = Math.ceil(rankSum / team.players.length);

                  const minRank = doc.locked.rank - doc.locked.shift;
                  const maxRank = doc.locked.rank + doc.locked.shift;
                  const rankTooLow = averageRank < minRank;
                  const rankTooHigh = averageRank > maxRank;

                  if (rankTooLow || rankTooHigh) {
                    errors.push(`Your team's rank is too ${rankTooLow ? 'low' : 'high'}.`);
                  }
                }

                if (doc.reservedTeam && !team.players.includes(doc.creator) && !team.players.includes(doc.reservedTeam)) {
                  errors.push(`The lobby is reserved for <@!${doc.creator}>'s and <@!${doc.reservedTeam}>'s teams.`);
                }

                let cutoffPlayerCount;
                if (doc.is4v4()) {
                  cutoffPlayerCount = 4;
                } else {
                  cutoffPlayerCount = 3;
                }

                if (playersCount > cutoffPlayerCount) {
                  const soloQueue = players.filter((p) => !doc.teamList.flat().includes(p));
                  if (doc.teamList.length) {
                    players = players.filter((p) => !soloQueue.includes(p));
                  } else {
                    const soloToKick = soloQueue.slice(cutoffPlayerCount);
                    players = players.filter((p) => !soloToKick.includes(p));
                  }
                }

                if (!players.some((p) => teamPlayers.includes(p))) {
                  players.push(...teamPlayers);
                  teamList.push(teamPlayers);
                }
              }
            } else if (removed) {
              players = players.filter((p) => p !== user.id);
            } else if (!players.includes(user.id)) {
              const soloQueue = players.filter((p) => !doc.teamList.flat().includes(p));
              const soloQueueErrors = await restrictSoloQueue(doc, user, soloQueue);

              if (soloQueueErrors <= 0) {
                players.push(user.id);
              } else {
                errors.push(...soloQueueErrors);
              }
            }
            doc.teamList = teamList;
          } else if (removed) {
            players = players.filter((p) => p !== user.id);
          } else if (!players.includes(user.id)) {
            players.push(user.id);
          }

          doc.players = players;

          if (doc.hasMinimumRequiredPlayers()) {
            const validation = await validateNatTypes(doc);

            if (!validation.valid) {
              errors.push('Incompatible NAT Types (no suitable host).');
            }
          }

          if (errors.length > 0) {
            let out = 'You cannot join the lobby for the following reasons:\n\n';
            out += errors.map((e, i) => `${i + 1}. ${e}`).join('\n');

            if (reaction.users) {
              reaction.users.remove(user);
            }

            user.createDM().then((dmChannel) => sendAlertMessage(dmChannel, out, 'warning')).catch(() => { });
            return sendAlertMessage(rankedNotifications, out, 'warning', [user.id]);
          }

          return doc.save().then(async () => {
            const count = players.length;
            if (count) {
              if (doc.hasMaximumAllowedPlayers()) {
                startLobby(doc.id);
              } else {
                message.edit({
                  embed: await getEmbed(doc, players),
                });
              }
            } else {
              message.edit({
                embed: await getEmbed(doc),
              });
            }
          }).catch(() => {
            console.log('Unable to save lobby ...');
          });
        }));
      }
    });
  }
}

client.on('messageReactionAdd', async (reaction, user) => {
  // When we receive a reaction we check if the reaction is partial or not
  if (reaction.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      await reaction.fetch();
      await reaction.users.fetch();
    } catch (error) {
      console.log('Something went wrong when fetching the message: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }

  mogi(reaction, user);
});

client.on('messageReactionRemove', async (reaction, user) => {
  // When we receive a reaction we check if the reaction is partial or not
  if (reaction.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      await reaction.fetch();
    } catch (error) {
      console.log('Something went wrong when fetching the message: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
  mogi(reaction, user, true);
});

client.on('messageDelete', async (message) => {
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.log('Something went wrong when fetching the message: ', error);
    }
  }

  const conditions = { message: message.id };

  RankedLobby.findOne(conditions).then(async (doc) => {
    if (doc) {
      Room.findOne({ lobby: doc.id }).then((room) => {
        if (!room) {
          return;
        }

        const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
        if (channel && message.channel.id !== channel.id) {
          sendAlertMessage(channel, 'Lobby ended. Don\'t forget to submit your scores.', 'success');
        }

        room.lobby = null;
        room.save();
      });
      doc.delete();
    }
  });
});

const findRoomAndSendMessage = (doc, ping = false) => {
  const message = 'Don\'t forget to close the lobby with `!lobby end` and submit your scores.';

  let pings = [];
  if (ping) {
    pings = doc.players;
  }

  Room.findOne({ lobby: doc.id }).then((room) => {
    if (room) {
      const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
      if (channel) {
        sendAlertMessage(channel, message, 'info', pings);
      }
    }
  });
};

const checkOldLobbies = () => {
  RankedLobby.find({ started: true }).then((docs) => {
    docs.forEach((doc) => {
      const minutes = diffMinutes(new Date(), doc.startedAt);

      if (doc.getRemindMinutes().includes(minutes)) {
        findRoomAndSendMessage(doc);
      } else if (doc.getPingMinutes().includes(minutes)) {
        findRoomAndSendMessage(doc, true);
      }
    });
  });

  RankedLobby.find({ started: false }).then((docs) => {
    docs.forEach(async (doc) => {
      const minutes = diffMinutes(new Date(), doc.date);

      const remindMinutes = [55];
      const CLOSE_MINUTES = 60;

      if (remindMinutes.includes(minutes) || minutes >= CLOSE_MINUTES) {
        const guild = client.guilds.cache.get(doc.guild);

        if (guild) {
          let notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_notifications_channel.toLowerCase());
          if (!notificationChannel) {
            notificationChannel = await guild.channels.create(config.channels.ranked_notifications_channel);
          }

          if (minutes >= CLOSE_MINUTES) {
            const duration = moment.duration(CLOSE_MINUTES, 'minutes').humanize();
            deleteLobby(doc);
            sendAlertMessage(notificationChannel, `Your lobby \`${doc.id}\` has been deleted because it wasn't started in ${duration}.`, 'info', [doc.creator]);
          } else {
            const duration = moment.duration(CLOSE_MINUTES - minutes, 'minutes').humanize();
            sendAlertMessage(notificationChannel, `Your lobby \`${doc.id}\` will be deleted in ${duration} if it will not be started.`, 'warning', [doc.creator]);
          }
        }
      }
    });
  });
};

new CronJob('* * * * *', checkOldLobbies).start();

function checkRankedBans() {
  const now = new Date();
  RankedBan.find({ bannedTill: { $lte: now } }).then((docs) => {
    docs.forEach((doc) => {
      const guild = client.guilds.cache.get(doc.guildId);

      if (guild) {
        const channel = guild.channels.cache.find((c) => c.name === config.channels.ranked_lobbies_channel);
        const permissionOverwrites = channel.permissionOverwrites.get(doc.discordId);
        if (permissionOverwrites) {
          permissionOverwrites.delete().then(() => {});
        }

        doc.delete();
      }
    });
  });
}

function resetCounters() {
  const oneMinuteAgo = moment().subtract(1, 'm');
  Counter.find({ tickUpdatedAt: { $lte: oneMinuteAgo }, tickCount: { $gt: 0 } })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.tickCount = 0;
        doc.save();
      });
    });

  const duration = moment().subtract(3, 'h');
  Counter.find({ pingUpdatedAt: { $lte: duration }, pingCount: { $gt: 0 } })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.pingCount = 0;
        doc.save();
      });
    });

  checkRankedBans();
}

new CronJob('* * * * *', resetCounters).start();

function resetCooldowns() {
  const onHourAgo = moment().subtract(1, 'h');
  Cooldown.find({ updatedAt: { $lte: onHourAgo }, count: { $gt: 0 }, name: 'pings' })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.count = 0;
        doc.save();
      });
    });

  const duration = moment().subtract(3, 'h');
  Cooldown.find({ updatedAt: { $lte: duration }, count: { $gt: 0 }, name: 'ranked pings' })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.count = 0;
        doc.save();
      });
    });

  const fiveMinutes = moment().subtract(5, 'm');
  Cooldown.find({ updatedAt: { $lte: fiveMinutes }, count: { $gt: 0 }, name: 'lobby' })
    .then((docs) => {
      docs.forEach((doc) => {
        doc.count = 0;
        doc.save();
      });
    });
}

new CronJob('* * * * *', resetCooldowns).start();

client.on('message', (message) => {
  if (message.author.bot) return;
  if (message.channel.type !== 'text') return;

  const { member } = message;
  const isStaff = isStaffMember(member);

  // check submissions
  if (message.channel.name === config.channels.ranked_results_submissions_channel) {
    if (!isStaff && !message.content.includes('`') && message.content.includes('|')) {
      message.reply(`\`\`\`${message.content}\`\`\``).then(() => {
        message.delete();
      });
    }
  }

  if (isStaff) return;

  const { roles } = message.mentions;

  if (message.channel.parent && message.channel.parent.name.toLowerCase() === config.channels.ranked_lobbies_category.toLowerCase() && roles.find((r) => r.name.toLowerCase() === config.roles.tournament_staff_role.toLowerCase())) {
    let rankedStaff = `@${config.roles.ranked_staff_role}`;

    sendAlertMessage(message.channel, `Incorrect staff ping. If you have a problem ping ${rankedStaff}.`, 'warning').then((m) => {
      const rankedStaffRole = message.guild.roles.cache.find((r) => r.name.toLowerCase() === 'ranked staff');
      if (rankedStaffRole) {
        rankedStaff = rankedStaffRole.toString();

        m.delete();
        sendAlertMessage(message.channel, `${message.author}, incorrect staff ping. If you have a problem ping ${rankedStaff}.`, 'warning');
      }
    });
  }
});

client.on('ready', () => {
  RankedLobby.find().then((docs) => {
    docs.forEach(async (doc) => {
      const guild = client.guilds.cache.get(doc.guild);
      if (!guild) {
        doc.delete();
        return;
      }

      const channel = guild.channels.cache.get(doc.channel);
      if (!channel) {
        doc.delete();
        return;
      }

      channel.messages.fetch(doc.message).catch(() => {
        doc.delete();
      });
    });
  });
});

function getBoardRequestData(teamId) {
  return `{
  team(teamId: "${teamId}")
    {
      id, kind, name, tag, iconSrc, flag, gamePreset, ownerIds, updaterIds, createDate, modifyDate, activityDate, wins, draws, losses, baseWins, baseDraws, baseLosses, ratingScheme, ratingMin, tiers { name, lowerBound, color }, ratingElo { initial, scalingFactors }, ratingMk8dxMmr { initial, scalingFactors, baselines }, matchCount, playerCount,
      players { name, ranking, maxRanking, minRanking, wins, losses, playedMatchCount, firstActivityDate, lastActivityDate, rating, ratingGain, maxRating, minRating, maxRatingGain, maxRatingLoss, points, maxPointsGain }
    }
}`;
}

// update cached ranks
async function getRanks() {
  const url = 'https://gb.hlorenzi.com/api/v1/graphql';

  const ranks = {};

  for (const key in LEADERBOARDS) {
    const id = LEADERBOARDS[key];
    const response = await axios.post(url, getBoardRequestData(id), { headers: { 'Content-Type': 'text/plain' } });
    const { players } = response.data.data.team;
    players.forEach((p) => {
      const { name } = p;
      if (!(name in ranks)) {
        ranks[name] = { name };
      }
      ranks[name][key] = { rank: p.rating, position: p.ranking };
    });
  }

  await Rank.deleteMany();
  await Rank.insertMany(Object.values(ranks));
}

new CronJob('0/15 * * * *', getRanks).start();

// check bans on rejoin
client.on('guildMemberAdd', (member) => {
  const { guild } = member;
  const { user } = member;

  const now = new Date();

  RankedBan.findOne({ discordId: user.id, guildId: guild.id, bannedTill: { $gte: now } }).then((doc) => {
    if (doc) {
      const lobbiesChannel = guild.channels.cache.find((c) => c.name === config.channels.ranked_lobbies_channel);
      lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false }).then(() => {
        sendLogMessage(guild, `<@${user.id}> ranked banned on rejoin`);
      });
    }
  });
});

// new role
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const DMCallback = (m) => {
    const logMessage = `Sent message to ${m.channel.recipient}:\n\`\`\`${m.content}\`\`\``;
    sendLogMessage(newMember.guild, logMessage);
  };

  const DMCatchCallback = (error) => {
    const logMessage = `Ranked role: ${error.message} ${newMember}`;
    sendLogMessage(newMember.guild, logMessage);
  };

  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  if (oldRoles.some((r) => r.name.toLowerCase() === config.roles.ranked_verified_role.toLowerCase())) {
    return;
  }

  if (!oldRoles.some((r) => r.name.toLowerCase() === config.roles.ranked_role.toLowerCase()) && newRoles.some((r) => r.name.toLowerCase() === config.roles.ranked_role.toLowerCase())) {
    const promise = getConfigValue('ranked_welcome_message', config.default_ranked_welcome_message);
    Promise.resolve(promise).then((welcomeMessage) => {
      newMember.createDM().then((dm) => {
        dm.send(welcomeMessage).then(DMCallback).catch(DMCatchCallback);
      });
    });
  }

  if (newRoles.some((r) => r.name.toLowerCase() === config.roles.ranked_verified_role.toLowerCase())) {
    const { guild } = newMember;
    let notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_notifications_channel.toLowerCase());
    if (!notificationChannel) {
      notificationChannel = await guild.channels.create(config.channels.ranked_notifications_channel);
    }

    let rankedRules = `#${config.channels.ranked_rules_channel}`;

    const rankedRulesChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_rules_channel.toLowerCase());
    if (rankedRulesChannel) {
      rankedRules = rankedRulesChannel.toString();
    }

    let rankedGuide = `#${config.channels.ranked_guide_channel}`;

    const rankedGuideChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_guide_channel.toLowerCase());
    if (rankedGuideChannel) {
      rankedGuide = rankedGuideChannel.toString();
    }

    Player.findOne({ discordId: newMember.id }).then((doc) => {
      if (!doc || !doc.psn) {
        sendAlertMessage(notificationChannel, `${newMember}, welcome to the ranked lobbies.
Make sure to read the ${rankedRules} and ${rankedGuide} and set your PSN by using \`!set_psn\` before you can join any lobby.`, 'info');
      }
    });
  }
});

const teamDuration = moment.duration(3, 'hours');

function checkOldDuos() {
  const lte = moment().subtract(teamDuration);
  Duo.find({ date: { $lte: lte } }).then((duos) => {
    duos.forEach((duo) => {
      RankedLobby.findOne({
        type: RACE_DUOS,
        players: { $in: [duo.discord1, duo.discord2] },
      }).then((activeLobby) => {
        if (!activeLobby) {
          duo.delete().then(() => {
            const guild = client.guilds.cache.get(duo.guild);

            if (guild) {
              const notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_notifications_channel.toLowerCase());
              const message = `Duo <@${duo.discord1}> & <@${duo.discord2}> was removed after ${teamDuration.humanize()}.`;

              sendAlertMessage(notificationChannel, message, 'info');
            }
          });
        }
      });
    });
  });
}

new CronJob('* * * * *', checkOldDuos).start();

function checkOldTeams() {
  const lte = moment().subtract(teamDuration);
  Team.find({ date: { $lte: lte } }).then((teams) => {
    teams.forEach((team) => {
      RankedLobby.findOne({
        type: { $in: [RACE_3V3, RACE_4V4] },
        players: { $in: teams.players },
      }).then((activeLobby) => {
        if (!activeLobby) {
          team.delete().then(() => {
            const guild = client.guilds.cache.get(team.guild);

            if (guild) {
              const notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_notifications_channel.toLowerCase());
              const teamPing = team.players.map((p) => `<@${p}>`).join(', ');
              const message = `Team ${teamPing} was removed after ${teamDuration.humanize()}.`;

              sendAlertMessage(notificationChannel, message, 'info');
            }
          });
        }
      });
    });
  });
}

new CronJob('* * * * *', checkOldTeams).start();
