const axios = require('axios');
const moment = require('moment');
const { CronJob } = require('cron');
const AsyncLock = require('async-lock');
const {
  _4V4, BATTLE, DUOS, ITEMLESS, ITEMS,
} = require('../db/models/ranked_lobbies');
const RankedLobby = require('../db/models/ranked_lobbies').default;
const Duo = require('../db/models/duos');
const Team = require('../db/models/teams');
const Player = require('../db/models/player');
const Rank = require('../db/models/rank');
const Room = require('../db/models/rooms');
const Sequence = require('../db/models/sequences');
const Counter = require('../db/models/counters');
const Cooldown = require('../db/models/cooldowns');
const RankedBan = require('../db/models/ranked_bans');
const { client } = require('../bot');
const rngPools = require('../utils/rngPools');
const rngModeBattle = require('../utils/rngModeBattle');
const generateTemplate = require('../utils/generateTemplate');
const { parseData } = require('../table');
const sendLogMessage = require('../utils/sendLogMessage');
const createDraft = require('../utils/createDraft');
const getRandomArrayElement = require('../utils/getRandomArrayElement');
const config = require('../config.js');
const { battleModes } = require('../utils/modes_battle');
const { regions } = require('../utils/regions');

const lock = new AsyncLock();

function getTitle(doc) {
  let title = '';

  if (doc.region) {
    title = 'Region Locked ';
  }

  if (!doc.locked.$isEmpty()) {
    title += 'Rank Locked ';
  }

  switch (doc.type) {
    case ITEMS:
      title += 'Item';
      break;
    case ITEMLESS:
      title += 'Itemless';
      break;
    case DUOS:
      title += 'Duos';
      break;
    case BATTLE:
      title += 'Battle';
      break;
    case _4V4:
      title += '4 vs. 4';
      break;
    default:
      break;
  }

  title += ' Lobby';

  if (doc.draftTracks) {
    title += ' (draft)';
  } else if (doc.pools) {
    title += ' (pools)';
  } else {
    title += ' (full rng)';
  }

  return title;
}

function getFooter(doc) {
  return { text: `id: ${doc._id}` };
}

const icons = {
  [ITEMS]: 'https://vignette.wikia.nocookie.net/crashban/images/3/32/CTRNF-BowlingBomb.png',
  [ITEMLESS]: 'https://vignette.wikia.nocookie.net/crashban/images/9/96/NF_Champion_Wheels.png',
  [DUOS]: 'https://vignette.wikia.nocookie.net/crashban/images/8/83/CTRNF-AkuUka.png',
  [BATTLE]: 'https://vignette.wikia.nocookie.net/crashban/images/9/97/CTRNF-Invisibility.png',
  [_4V4]: 'https://i.imgur.com/3dvcaur.png',
};

const roleNames = {
  [ITEMS]: 'ranked items',
  [ITEMLESS]: 'ranked itemless',
  [DUOS]: 'ranked duos',
  [BATTLE]: 'ranked battle',
  [_4V4]: 'ranked 4v4',
};

const TRACK_OPTION_RNG = 'Full RNG';
const TRACK_OPTION_POOLS = 'Pools';
const TRACK_OPTION_DRAFT = 'Draft';

const PLAYER_DEFAULT_RANK = 1000;
const DEFAULT_RANK = PLAYER_DEFAULT_RANK;
const ITEMS_MAX = 8;
const ITEMLESS_MAX = 4;
const NAT1 = 'NAT 1';
const NAT2O = 'NAT 2 Open';
const FORCE_START_COOLDOWN = 5;
const LOBBY_END_COOLDOWNS = {
  [ITEMS]: 50,
  [ITEMLESS]: 30,
  [DUOS]: 50,
  [BATTLE]: 30,
  [_4V4]: 60,
};

function getIcon(doc) {
  return icons[doc.type];
}

function getRoleName(type) {
  return roleNames[type];
}

async function getPlayerInfo(playerId, doc) {
  const p = await Player.findOne({ discordId: playerId });
  // if (!p) p = { psn: 'UNSET' };
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

async function getEmbed(doc, players, maps, roomChannel) {
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
    doc.teamList.forEach((duo, i) => {
      playersText += `${i + 1}.`;
      duo.forEach((player, k) => {
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

  const iconUrl = getIcon(doc);
  const timestamp = doc.started ? doc.startedAt : doc.date;
  const region = regions.find((r) => r.uid === doc.region);

  if (maps) {
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
        name: 'Maps',
        value: maps,
        inline: true,
      },
      {
        name: 'Room',
        value: roomChannel.toString(),
        inline: true,
      },
      {
        name: 'Creator',
        value: `<@${doc.creator}>`,
        inline: true,
      },
      {
        name: 'Average Rank',
        value: avgRank,
        inline: true,
      },
    ];

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

    return {
      author: {
        name: `${getTitle(doc)} has started`,
        icon_url: iconUrl,
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
        value: `<@${doc.creator}>`,
        inline: !!lockedRank,
      },
      {
        name: 'Average Rank',
        value: avgRank,
        inline: true,
      },
    ];

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

    return {
      author: {
        name: `Gathering ${getTitle(doc)}`,
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
      value: `<@${doc.creator}>`,
      inline: true,
    },
  ];

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

  return {
    author: {
      name: `${getTitle(doc)}`,
      icon_url: iconUrl,
    },
    description: 'React with ✅ to participate',
    fields,
    footer: getFooter(doc),
    timestamp,
  };
}

function findRoom(lobby) {
  // todo findOneAndUpdate
  return Room.findOne({ lobby: null, guild: lobby.guild }).sort({ number: 1 }).then((doc) => {
    if (!doc) {
      return Sequence.findOneAndUpdate(
        { guild: lobby.guild, name: 'rooms' },
        { $inc: { number: 1 } },
        { upsert: true, new: true },
      )
        .then((seq) => {
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

async function findRole(guild, roleName) {
  const roles = await guild.roles.fetch();
  let role = roles.cache.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
  if (!role) {
    role = await guild.roles.create({
      data: { name: roleName, mentionable: true },
      reason: `imagine not having ${roleName} role smh`,
    });
  }
  return role;
}

async function findRoomChannel(guildId, n) {
  const guild = client.guilds.cache.get(guildId);
  const channelName = `ranked-room-${n}`;
  let category = guild.channels.cache.find((c) => c.name.toLowerCase() === 'ranked lobbies' && c.type === 'category');
  if (!category) {
    category = await guild.channels.create('Ranked Lobbies', { type: 'category' });
  }

  let channel = guild.channels.cache.find((c) => c.name === channelName);
  if (!channel) {
    const roleStaff = await findRole(guild, 'Staff');
    const roleRanked = await findRole(guild, 'Ranked Verified');
    const roleRankedItems = await findRole(guild, 'Ranked Items');
    const roleRankedItemless = await findRole(guild, 'Ranked Itemless');
    const roleRankedBattle = await findRole(guild, 'Ranked Battle');
    const roleRanked4v4 = await findRole(guild, 'Ranked 4v4');

    channel = await guild.channels.create(channelName, {
      type: 'text',
      parent: category,
    });

    channel.createOverwrite(roleStaff, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRanked, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRankedItems, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRankedItemless, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRankedBattle, { VIEW_CHANNEL: true });
    channel.createOverwrite(roleRanked4v4, { VIEW_CHANNEL: true });
    channel.createOverwrite(guild.roles.everyone, { VIEW_CHANNEL: false });
  }

  return channel;
}

function startLobby(docId) {
  RankedLobby.findOneAndUpdate({ _id: docId, started: false }, { started: true, startedAt: new Date() }, { new: true })
    .then((doc) => {
      client.guilds.cache
        .get(doc.guild).channels.cache
        .get(doc.channel).messages
        .fetch(doc.message).then((message) => {
          rngPools(doc, doc.pools).then((maps) => {
            findRoom(doc).then((room) => {
              findRoomChannel(doc.guild, room.number).then(async (roomChannel) => {
                maps = maps.join('\n');
                const mapCount = maps.length;

                // Display track column but blank all tracks
                if (doc.is4v4() && doc.draftTracks) {
                  maps = [];
                  for (let i = 1; i <= mapCount; i += 1) {
                    maps.push('*N/A (drafted)*');
                  }
                }

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
                  if (doc.is4v4()) teamSize = 4;

                  // for (let i = 0; i < shuffledPlayers.length; i += 1) {
                  //   const last = randomTeams[randomTeams.length - 1];
                  //   if (!last || last.length === teamSize) {
                  //     randomTeams.push([shuffledPlayers[i]]);
                  //   } else {
                  //     last.push(shuffledPlayers[i]);
                  //   }
                  // }

                  // Balanced team making
                  const shuffledPlayerRanks = [];

                  shuffledPlayers.forEach(async (s) => {
                    const player = await Player.findOne({ discordId: s });
                    const playerRank = await Rank.findOne({ name: player.psn });

                    let rank = PLAYER_DEFAULT_RANK;
                    if (playerRank && playerRank[doc.type]) {
                      rank = playerRank[doc.type].rank;
                    }

                    shuffledPlayerRanks.push({
                      discordId: s,
                      rank,
                    });
                  });

                  const sorted = shuffledPlayerRanks.sort((a, b) => a.rank - b.rank);
                  const teamCount = shuffledPlayers / teamSize;

                  for (let i = 1; i <= teamCount; i += 1) {
                    if (teamSize === 2) {
                      randomTeams.push([
                        sorted.shift().discordId,
                        sorted.pop().discordId,
                      ]);
                    }

                    if (teamSize === 4) {
                      randomTeams.push([
                        sorted.shift().discordId,
                        sorted.shift().discordId,
                        sorted.pop().discordId,
                        sorted.pop().discordId,
                      ]);
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

                const [PSNs, templateUrl, template] = await generateTemplate(players, doc);

                message.edit({
                  embed: await getEmbed(doc, players, maps, roomChannel),
                });

                // todo add ranks and tags?
                const fields = [
                  {
                    name: 'PSN IDs',
                    value: PSNs.join('\n'),
                    inline: true,
                  },
                  {
                    name: 'Maps',
                    value: maps,
                    inline: true,
                  },
                ];

                const modes = await rngModeBattle(maps.split('\n'));

                if (doc.isBattle()) {
                  fields.push({
                    name: 'Modes',
                    value: modes.join('\n'),
                    inline: true,
                  });
                }

                roomChannel.send({
                  content: `**The ${getTitle(doc)} has started**
*Organize your host and scorekeeper*
Your room is ${roomChannel}.
Use \`!lobby end\` when your match is done.
${playersText}`,
                  embed: {
                    title: `The ${getTitle(doc)} has started`,
                    fields,
                  },
                }).then((m) => {
                  roomChannel.messages.fetchPinned().then((pinnedMessages) => {
                    pinnedMessages.forEach((pinnedMessage) => pinnedMessage.unpin());
                    m.pin();
                  });

                  roomChannel.send({
                    embed: {
                      title: 'Scores Template',
                      description: `\`\`\`${template}\`\`\`
[Open template on gb.hlorenzi.com](${templateUrl})`,
                    },
                  });

                  if (maps.includes('Tiger Temple')) {
                    roomChannel.send('Remember: Tiger Temple shortcut is banned! <:feelsbanman:649075198997561356>');
                  }

                  if (doc.isBattle()) {
                    const settings = [];

                    modes.forEach((mode) => {
                      battleModes.forEach((battleMode) => {
                        const entry = battleMode.find((element) => element.name === mode);

                        if (entry !== undefined) {
                          const text = `------ ${mode} ------
${entry.settings.join('\n')}`;

                          settings.push(text);
                        }
                      });
                    });

                    roomChannel.send(`\`\`\`
Battle Mode Rules

Teams: OFF (4 for Steal The Bacon)
AI: DISABLEDbei äl

${settings.join('\n\n')}\`\`\``);
                  }

                  if (doc.is4v4() && doc.draftTracks) {
                    const captainA = client.guilds.cache.get(doc.guild).members.fetch(getRandomArrayElement(doc.teamList[0]));
                    const captainB = client.guilds.cache.get(doc.guild).members.fetch(getRandomArrayElement(doc.teamList[1]));
                    const teams = ['A', 'B'];

                    createDraft(roomChannel, 0, teams, [captainA, captainB]);
                  }
                });
              });
            });
          });
        });
    })
    .catch(console.error);
}

function diffMinutes(dt2, dt1) {
  let diff = (dt2.getTime() - dt1.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

function confirmLobbyStart(doc, message, override = false) {
  const minutes = diffMinutes(new Date(), doc.date);

  if (doc.started) {
    return message.channel.send('Lobby has already been started.');
  }

  if (!override && minutes < FORCE_START_COOLDOWN) {
    return message.channel.send(`You need to wait at least ${FORCE_START_COOLDOWN - minutes} more minutes to force start the lobby.`);
  }

  const playersCount = doc.players.length;

  if (doc.isDuos() && playersCount % 2 !== 0) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start Duos lobby with player count not divisible by 2.`);
  }

  if (!doc.hasMinimumRequiredPlayers()) {
    return message.channel.send(`You cannot start a ${doc.type} lobby with less than ${doc.getMinimumRequiredPlayers()} players.`);
  }

  if (override) {
    return startLobby(doc.id);
  }

  return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players. Are you sure you want to start it? Say \`yes\` or \`no\`.`)
    .then(() => {
      message.channel
        .awaitMessages((m) => m.author.id === message.author.id, { max: 1, time: 60000, errors: ['time'] })
        .then((collected) => {
          const { content } = collected.first();
          if (content.toLowerCase() === 'yes') {
            if (doc.started) {
              return message.channel.send('Lobby has already been started.');
            }
            message.channel.send('Generating maps...').then((m) => m.delete({ timeout: 3000 }));
            startLobby(doc.id);
          } else {
            throw Error('cancel');
          }
        })
        .catch(() => message.channel.send('Command cancelled.'));
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
          return message.channel.send('There is no lobby with this ID.');
        }
        return message.channel.send('You don\'t have lobby with this ID.');
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
        return message.channel.send('You don\'t have any active lobbies!');
      }

      if (docs.length === 1) {
        const doc = docs.shift();
        return callback(doc, message);
      }

      if (docs.length > 1) {
        const lobbies = docs.map((d) => `\`${d.id}\` created by <@${d.creator}>`).join('\n');
        return message.channel.send('...')
          .then((m) => m.edit(`You have more than 1 active lobby. You should specify the ID.\n${lobbies}`));
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
      channel.send(endMessage);
    }

    room.lobby = null;
    room.save();
  });
  const promiseDocDelete = doc.delete();

  Promise.all([promiseMessageDelete, promiseDocDelete, roomDocDelete]).then(() => {
    if (msg) msg.channel.send(endMessage);
  });
}

module.exports = {
  name: 'lobby',
  description: 'Ranked lobbies',
  guildOnly: true,
  aliases: ['mogi', 'l'],
  async execute(message, args) {
    let action = args[0];

    if (!action) {
      action = 'new';
    }

    const lobbyID = args[1];

    const { member } = message;

    const now = moment();
    if (moment('2020-10-01 00:00') >= now) {
      return message.channel.send('Lobbies are temporarily closed.');
    }

    const { guild } = message;
    const { user } = member;

    const banned = await RankedBan.findOne({ discordId: user.id, guildId: guild.id });
    if (banned) {
      return message.reply('you are currently banned from ranked lobbies.');
    }

    const player = await Player.findOne({ discordId: user.id });
    if (!player || !player.psn) {
      return message.reply('you need to set your PSN first by using `!set_psn`.');
    }

    const isStaff = member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

    const hasRankedRole = member.roles.cache.find((r) => r.name.toLowerCase() === 'ranked verified');

    if (!isStaff && !hasRankedRole) {
      return message.channel.send('You don\'t have a ranked verified role to execute this command.');
    }

    if (message.channel.parent && message.channel.parent.name.toLowerCase() !== 'ranked lobbies') {
      return message.reply('you can use this command only in `Ranked Lobbies` category.');
    }

    action = action && action.toLowerCase();
    switch (action) {
      case 'new':
        // eslint-disable-next-line no-case-declarations
        const creatorsLobby = await RankedLobby.findOne({ creator: message.author.id });
        if (creatorsLobby && !isStaff) {
          return message.reply('you have already created a lobby.');
        }

        const cooldown = await Cooldown.findOne({ guildId: guild.id, discordId: message.author.id, name: 'lobby' });
        if (!isStaff && cooldown && cooldown.count >= 1) {
          const updatedAt = moment(cooldown.updatedAt);
          updatedAt.add(5, 'm');
          const wait = moment.duration(now.diff(updatedAt));
          return message.reply(`you cannot create multiple lobbies so often. You have to wait ${wait.humanize()}.`);
        }

        const filter = (m) => m.author.id === message.author.id;
        const options = { max: 1, time: 60000, errors: ['time'] };

        return message.channel.send(`Select lobby mode. Waiting 1 minute.
\`\`\`1 - FFA Items
2 - Itemless
3 - Duos
4 - 4v4
5 - Battle Mode\`\`\`
`).then((confirmMessage) => {
          message.channel.awaitMessages(filter, options).then(async (collected) => {
            confirmMessage.delete();

            const collectedMessage = collected.first();
            const { content } = collectedMessage;
            collectedMessage.delete();

            const choice = parseInt(content, 10);
            const modes = [1, 2, 3, 4, 5];
            if (modes.includes(choice)) {
              let type;
              switch (choice) {
                case 1:
                  type = ITEMS;
                  break;
                case 2:
                  type = ITEMLESS;
                  break;
                case 3:
                  type = DUOS;
                  break;
                case 4:
                  type = _4V4;
                  break;
                case 5:
                  type = BATTLE;
                  break;
                default:
                  break;
              }

              const trackOptions = [
                TRACK_OPTION_RNG,
                TRACK_OPTION_POOLS,
              ];

              if (type === _4V4) {
                trackOptions.push(TRACK_OPTION_DRAFT);
              }

              let trackOption;

              if (type === BATTLE) {
                trackOption = TRACK_OPTION_RNG;
              } else {
                const sentMessage = await message.channel.send(`Select track option. Waiting 1 minute.
\`\`\`${trackOptions.map((t, i) => `${i + 1} - ${t}`).join('\n')}\`\`\``);

                trackOption = await message.channel.awaitMessages(filter, options).then(async (collected) => {
                  sentMessage.delete();

                  const collectedMessage = collected.first();
                  const { content } = collectedMessage;
                  collectedMessage.delete();

                  return parseInt(content, 10);
                }).catch(() => {
                  sentMessage.delete();
                  return false;
                });
              }

              let pools = false;
              let draftTracks = false;
              const index = trackOption - 1;

              if (trackOptions[index] === TRACK_OPTION_POOLS) {
                pools = true;
              } else if (trackOptions[index] === TRACK_OPTION_DRAFT) {
                draftTracks = true;
              }

              return message.channel.send(`Select region lock. Waiting 1 minute.
\`\`\`${regions.map((r, i) => `${i + 1} - ${r.description}`).join('\n')}
4 - No region lock\`\`\``).then(async (confirmMessage) => {
                message.channel.awaitMessages(filter, options).then(async (collected) => {
                  confirmMessage.delete();

                  const collectedMessage = collected.first();
                  const { content } = collectedMessage;
                  collectedMessage.delete();

                  const choice = parseInt(content, 10);

                  if (![1, 2, 3, 4].includes(choice)) {
                    throw new Error('cancel');
                  }

                  let region = null;
                  if (choice < 4) {
                    region = `region${choice}`;
                  }

                  let mmrLock = false;
                  let rankDiff = null;
                  let playerRank = null;

                  return message.channel.send('Do you want to put a rank restriction on your lobby? (yes / no)').then(async (confirmMessage) => {
                    message.channel.awaitMessages(filter, options).then(async (collected) => {
                      confirmMessage.delete();

                      const collectedMessage = collected.first();
                      const { content } = collectedMessage;
                      collectedMessage.delete();

                      mmrLock = (content.toLowerCase() === 'yes');

                      if (mmrLock) {
                        const diffMin = 200;
                        const diffMax = 500;
                        const diffDefault = 350;

                        const sentMessage = await message.channel.send(`Select allowed rank difference. Waiting 1 minute.
The value should be in the range of \`${diffMin} to ${diffMax}\`. The value defaults to \`${diffDefault}\` on any other input.`);

                        rankDiff = await message.channel.awaitMessages(filter, options).then((collected2) => {
                          sentMessage.delete();

                          const collectedMessage2 = collected2.first();
                          const { content } = collectedMessage2;
                          collectedMessage2.delete();

                          let diff = parseInt(content, 10);

                          if (Number.isNaN(diff) || diff < diffMin || diff > diffMax) {
                            diff = diffDefault;
                          }

                          return diff;
                        }).catch(() => {
                          sentMessage.delete();
                          return false;
                        });

                        const rank = await Rank.findOne({ name: player.psn });
                        playerRank = PLAYER_DEFAULT_RANK;

                        if (rank && rank[type]) {
                          playerRank = rank[type].rank;
                        }
                      }

                      let allowPremadeTeams = true;
                      if ([DUOS, _4V4].includes(type)) {
                        const sentMessage = await message.channel.send('Do you want to allow premade teams? (yes / no)');
                        allowPremadeTeams = await message.channel.awaitMessages(filter, options).then((collected2) => {
                          sentMessage.delete();

                          const collectedMessage2 = collected2.first();
                          const { content } = collectedMessage2;
                          collectedMessage2.delete();

                          return content.toLowerCase() !== 'no';
                        }).catch(() => {
                          sentMessage.delete();
                          return false;
                        });
                      }

                      const sameTypeLobby = await RankedLobby.findOne({
                        started: false,
                        guild: message.guild.id,
                        pools,
                        type,
                        region,
                        allowPremadeTeams,
                        draftTracks,
                      });

                      if (sameTypeLobby) {
                        const sentMessage = await message.channel.send('There is already lobby of this type, are you sure you want to create a new one? (yes / no)');
                        const response = await message.channel
                          .awaitMessages(filter, options)
                          .then((collected2) => {
                            sentMessage.delete();

                            const message2 = collected2.first();
                            const content2 = message2.content;
                            message2.delete();
                            return content2.toLowerCase() === 'yes';
                          })
                          .catch(() => false);
                        if (!response) {
                          throw new Error('cancel');
                        }
                      }

                      await Cooldown.findOneAndUpdate(
                        { guildId: guild.id, discordId: message.author.id, name: 'lobby' },
                        { $inc: { count: 1 }, $set: { updatedAt: now } },
                        { upsert: true, new: true },
                      );

                      const lobby = new RankedLobby();
                      lobby.guild = guild.id;
                      lobby.creator = message.author.id;
                      lobby.type = type;
                      lobby.pools = pools;
                      lobby.allowPremadeTeams = allowPremadeTeams;
                      lobby.draftTracks = draftTracks;

                      if (region) {
                        lobby.region = region;
                      }

                      if (mmrLock) {
                        lobby.locked = {
                          rank: playerRank,
                          shift: Number(rankDiff),
                        };
                      }

                      lobby.save().then(async (doc) => {
                        const role = await findRole(guild, getRoleName(type));

                        guild.channels.cache.find((c) => c.name === 'ranked-lobbies')
                          .send({
                            content: role,
                            embed: await getEmbed(doc),
                          }).then((m) => {
                            doc.channel = m.channel.id;
                            doc.message = m.id;
                            doc.save().then(() => {
                              m.react('✅');
                              message.channel.send(`${getTitle(doc)} has been created. Don't forget to press ✅.`);
                            });
                          });
                      });
                    });
                  });
                });
              }).catch(() => confirmMessage.edit('Command cancelled.').then((m) => m.delete({ timeout: 5000 })));
            }

            throw new Error('cancel');
          }).catch(() => confirmMessage.edit('Command cancelled.').then((m) => m.delete({ timeout: 5000 })));
        });

        break;

      case 'start':
        findLobby(lobbyID, isStaff, message, confirmLobbyStart);
        break;

      case 'override':
        if (isStaff) {
          findLobby(lobbyID, isStaff, message, (d, m) => confirmLobbyStart(d, m, true));
        } else {
          return message.channel.send('You don\'t have permissions to do that.');
        }
        break;
      case 'end':
        findLobby(lobbyID, isStaff, message, (doc, msg) => {
          if (doc.started) {
            const minutes = diffMinutes(new Date(), doc.startedAt);
            const confirmationMinutes = LOBBY_END_COOLDOWNS[doc.type];
            if (minutes < confirmationMinutes) {
              Room.findOne({ lobby: doc.id }).then((room) => {
                if (!room) {
                  return deleteLobby(doc, msg);
                }

                const roomChannel = message.guild.channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
                if (roomChannel) {
                  const pings = doc.players.map((p) => `<@${p}>`).join(' ');
                  roomChannel.send(`I need reactions from ${Math.ceil(doc.players.length / 4)} other people in the lobby to confirm.\n${pings}`).then((voteMessage) => {
                    voteMessage.react('✅');

                    const filter = (r, u) => ['✅'].includes(r.emoji.name) && doc.players.includes(u.id) && u.id !== message.author.id;
                    voteMessage.awaitReactions(filter, {
                      max: Math.ceil(doc.players.length / 4),
                      time: 60000,
                      errors: ['time'],
                    })
                      .then((collected) => {
                        deleteLobby(doc, msg);
                      })
                      .catch(() => {
                        voteMessage.channel.send('Command cancelled.');
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
            const confirmationMinutes = LOBBY_END_COOLDOWNS[doc.type];

            if (minutes >= confirmationMinutes) {
              Room.findOne({ lobby: doc.id }).then((room) => {
                if (!room) {
                  return deleteLobby(doc, msg);
                }

                const roomChannel = message.guild.channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
                if (roomChannel) {
                  const maxReactions = Math.ceil(doc.players.length / 2);
                  const pings = doc.players.map((p) => `<@${p}>`).join(' ');
                  roomChannel.send(`I need reactions from ${maxReactions} other people in the lobby to confirm.\n${pings}`).then((voteMessage) => {
                    voteMessage.react('✅');

                    const filter = (r, u) => ['✅'].includes(r.emoji.name) && doc.players.includes(u.id) && u.id !== message.author.id;
                    voteMessage.awaitReactions(filter, {
                      max: maxReactions,
                      time: 60000,
                      errors: ['time'],
                    }).then(async () => {
                      const relobby = new RankedLobby();
                      relobby.guild = guild.id;
                      relobby.creator = message.author.id;
                      relobby.type = doc.type;
                      relobby.pools = doc.pools;
                      relobby.region = doc.region;
                      relobby.locked = doc.locked;
                      relobby.players = doc.players;
                      relobby.teamList = doc.teamList;
                      relobby.allowPremadeTeams = doc.allowPremadeTeams;
                      relobby.draftTracks = doc.draftTracks;

                      deleteLobby(doc, msg);

                      relobby.save().then(async (savedRelobby) => {
                        const role = await findRole(guild, getRoleName(relobby.type));
                        const channel = guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
                        channel.send({ content: role, embed: await getEmbed(savedRelobby) }).then((m) => {
                          savedRelobby.channel = m.channel.id;
                          savedRelobby.message = m.id;
                          savedRelobby.save().then((document) => {
                            m.react('✅');
                            message.channel.send(`${getTitle(savedRelobby)} has been recreated.`);

                            startLobby(document._id);
                          });
                        });
                      });
                    }).catch(() => {
                      voteMessage.channel.send('Command cancelled.');
                    });
                  });
                }
              });
            } else {
              return message.channel.send('You cannot redo a lobby that has not been finished yet.');
            }
          }
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
  const isStaff = member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);
  if (isStaff) return;

  const now = new Date();
  Counter.findOneAndUpdate(
    { guildId: guild.id, discordId: user.id },
    { $inc: { tickCount: 1 }, $set: { tickUpdatedAt: now } },
    { upsert: true, new: true },
  )
    .then((doc) => {
      if (doc.tickCount === 7) { // ban
        reaction.users.remove(user);

        const bannedTill = moment().add(banDuration);
        RankedBan.findOneAndUpdate(
          { guildId: guild.id, discordId: user.id },
          { bannedAt: now, bannedTill },
          { upsert: true },
        ).exec();

        const lobbiesChannel = guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
        lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false });

        const generalChannel = guild.channels.cache.find((c) => c.name === 'ranked-general');
        const message = `${user}, you've been banned from ranked lobbies for ${banDuration.humanize()}.`;
        user.createDM().then((dm) => dm.send(message));
        generalChannel.send(message);
      } else if (doc.tickCount === 3 || doc.tickCount === 5) {
        const channel = guild.channels.cache.find((c) => c.name === 'ranked-general');
        const message = `${user}, I will ban you from ranked lobbies for ${banDuration.humanize()} if you continue to spam reactions.`;
        user.createDM().then((dm) => dm.send(message));
        channel.send(message);
      }
    });
}

async function restrictSoloQueue(user, reaction, channel, soloQueue, locked, type) {
  const player = await Player.findOne({ discordId: user.id });

  if (!locked.$isEmpty()) {
    const playerRank = await Rank.findOne({ name: player.psn });

    let rank = PLAYER_DEFAULT_RANK;
    if (playerRank && playerRank[type]) {
      rank = playerRank[type].rank;
    }

    const minRank = locked.rank - locked.shift;
    const maxRank = locked.rank + locked.shift;
    const rankTooLow = rank < minRank;
    const rankTooHigh = rank > maxRank;

    if (rankTooLow || rankTooHigh) {
      reaction.users.remove(user);
      const errorMsg = `${user}, you cannot join the solo queue because ${rankTooLow ? 'your rank is too low.' : 'your rank is too high.'}`;
      user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
      channel.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
      return true;
    }
  }

  if (!player.discordVc && !player.ps4Vc) {
    reaction.users.remove(user);
    const errorMsg = `${user}, you cannot join the solo queue without being able to use voice chat. Please set your voice chat options first by using \`!set_voice_chat\`.`;
    user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
    channel.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
    return true;
  }

  const playerLanguages = player.languages || [];
  if (playerLanguages.length <= 0) {
    reaction.users.remove(user);
    const errorMsg = `${user}, you cannot join the solo queue without setting your language first. You can set your language by using \`!set_languages\`.`;
    user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
    channel.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
    return true;
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
      reaction.users.remove(user);
      const errorMsg = `${user}, you cannot join the solo queue because you don't speak the same language as the other players. You can set your language by using \`!set_languages\`.`;
      user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
      channel.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
      return true;
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
      reaction.users.remove(user);
      const errorMsg = `${user}, you cannot join the solo queue because you cannot use the same voice chat as the other players. You can set your voice chat options by using \`!set_voice_chat\`.`;
      user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
      channel.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
      return true;
    }
  }

  return false;
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

    let rankedGeneral = guild.channels.cache.find((c) => c.name === 'ranked-general');
    if (!rankedGeneral) {
      rankedGeneral = await guild.channels.create('ranked-general');
    }

    RankedLobby.findOne(conditions).then(async (doc) => {
      if (doc) {
        if (!removed) {
          tickCount(reaction, user);

          const member = await guild.members.fetch(user.id);
          if (!member) return;

          let errorMsg;

          const banned = await RankedBan.findOne({ discordId: member.id, guildId: guild.id });
          if (banned) {
            reaction.users.remove(user);
            const lobbiesChannel = guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
            lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false });
            errorMsg = `${user}, you cannot join ranked lobbies because you're banned.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          if (member.roles.cache.find((r) => r.name.toLowerCase() === 'muted')) {
            reaction.users.remove(user);
            errorMsg = `${user}, you cannot join ranked lobbies because you're muted.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          const player = await Player.findOne({ discordId: user.id });

          if (!player || !player.psn) {
            reaction.users.remove(user);
            errorMsg = `${user}, you need to set your PSN before you are able to join ranked lobbies. Example: \`!set_psn ctr_tourney_bot\`.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          if (!player.nat) {
            reaction.users.remove(user);
            errorMsg = `${user}, you need to set your NAT Type before you are able to join ranked lobbies. Use \`!set_nat\` and then follow the bot instructions.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          if (doc.region) {
            if (!player.region) {
              reaction.users.remove(user);
              errorMsg = `${user}, you need to set your region before you can join a region locked lobby. Use \`!set_region\`.`;
              user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
              return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
            }

            if (player.region !== doc.region) {
              const lobbyRegion = regions.find((r) => r.uid === doc.region);
              const playerRegion = regions.find((r) => r.uid === player.region);

              reaction.users.remove(user);
              errorMsg = `${user}, you cannot join a lobby of ${lobbyRegion.name} because you are from ${playerRegion.name}.`;
              user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
              return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
            }
          }

          const repeatLobby = await RankedLobby.findOne({ guild: guild.id, players: user.id, _id: { $ne: doc._id } });

          if (repeatLobby) {
            reaction.users.remove(user);
            errorMsg = `${user}, you cannot be in 2 ranked lobbies at the same time.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          if (!doc.locked.$isEmpty() && [ITEMS, ITEMLESS, BATTLE].includes(doc.type)) {
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
              reaction.users.remove(user);
              errorMsg = `${user}, you cannot join this lobby because ${rankTooLow ? 'your rank is too low.' : 'your rank is too high.'}`;
              user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
              return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
            }
          }
        }

        lock.acquire(doc._id, async () => RankedLobby.findOne({ _id: doc._id }).then(async (doc) => {
          let players = Array.from(doc.players);

          const playersCount = players.length;
          if (!removed) {
            if ((doc.isItemless() || doc.isBattle()) && doc.hasMinimumRequiredPlayers()) {
              return;
            }

            if (playersCount >= ITEMS_MAX) {
              return;
            }
          }

          let teamList = Array.from(doc.teamList);

          if (doc.isDuos()) {
            const userSavedDuo = await Duo.findOne({
              guild: guild.id,
              $or: [{ discord1: user.id }, { discord2: user.id }],
            });
            if (userSavedDuo) {
              if (!doc.allowPremadeTeams) {
                reaction.users.remove(user);
                const errorMsg = `${user}, this lobby does not allow premade teams.`;
                user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
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
                  reaction.users.remove(user);
                  const errorMsg = `${user}, your partner is in another lobby.`;
                  user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                  return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                }

                const partnerBanned = await RankedBan.findOne({ discordId: savedPartner, guildId: guild.id });
                if (partnerBanned) {
                  reaction.users.remove(user);
                  userSavedDuo.delete();
                  const errorMsg = `${user}, your partner is banned. The duo has been deleted.`;
                  user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                  rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                  return;
                }

                const partner = await Player.findOne({ discordId: savedPartner });

                if (!partner.nat) {
                  reaction.users.remove(user);
                  const errorMsg = `${user}, you partner needs to set their NAT Type before you can join a lobby. Use \`!set_nat\`.`;
                  user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                  return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                }

                if (doc.region) {
                  if (!partner.region) {
                    reaction.users.remove(user);
                    const errorMsg = `${user}, you partner needs to set their region before you can join a region locked lobby. Use \`!set_region\`.`;
                    user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                    return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                  }

                  if (partner.region !== doc.region) {
                    const lobbyRegion = regions.find((r) => r.uid === doc.region);
                    const partnerRegion = regions.find((r) => r.uid === partner.region);

                    reaction.users.remove(user);
                    const errorMsg = `${user}, you cannot join a lobby of ${lobbyRegion.name} because your partner is from ${partnerRegion.name}.`;
                    user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                    return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                  }
                }

                if (!doc.locked.$isEmpty()) {
                  const player = await Player.findOne({ discordId: user.id });

                  const playerRank = await Rank.findOne({ name: player.psn });
                  const partnerRank = await Rank.findOne({ name: partner.psn });

                  let player1Rank = PLAYER_DEFAULT_RANK;
                  let player2Rank = PLAYER_DEFAULT_RANK;

                  if (playerRank && playerRank[doc.type]) {
                    player1Rank = playerRank[doc.type].rank;
                  }

                  if (partnerRank && partnerRank[doc.type]) {
                    player2Rank = partnerRank[doc.type].rank;
                  }

                  const averageRank = Math.ceil((player1Rank + player2Rank) / 2);

                  const minRank = doc.locked.rank - doc.locked.shift;
                  const maxRank = doc.locked.rank + doc.locked.shift;
                  const rankTooLow = averageRank < minRank;
                  const rankTooHigh = averageRank > maxRank;

                  if (rankTooLow || rankTooHigh) {
                    reaction.users.remove(user);
                    const errorMsg = `${user}, you cannot join this lobby because ${rankTooLow ? 'your team\'s rank is too low.' : 'your team\'s rank is too high.'}`;
                    user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                    return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                  }
                }

                if (playersCount === ITEMS_MAX - 1) {
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
              const restrict = await restrictSoloQueue(user, reaction, rankedGeneral, soloQueue, doc.locked, doc.type);

              if (!restrict) {
                players.push(user.id);
              }
            }
            doc.teamList = teamList;
          } else if (doc.is4v4()) {
            const team = await Team.findOne({
              guild: guild.id,
              players: user.id,
            });
            if (team) {
              if (!doc.allowPremadeTeams) {
                reaction.users.remove(user);
                const errorMsg = `${user}, this lobby does not allow premade teams.`;
                user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
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
                  reaction.users.remove(user);
                  const errorMsg = `${user}, one of your teammates is in another lobby.`;
                  user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                  return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                }

                const teammateBanned = await RankedBan.findOne({ discordId: teamPlayers, guildId: guild.id });
                if (teammateBanned) {
                  reaction.users.remove(user);
                  team.delete();
                  const errorMsg = `${user}, one of your teammates is banned. The team has been deleted.`;
                  user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                  rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                  return;
                }

                const teammates = await Player.find({ discordId: { $in: teamPlayers } });
                let rankSum = 0;

                for (const i in teammates) {
                  const teammate = teammates[i];

                  if (!teammate.nat) {
                    reaction.users.remove(user);
                    const errorMsg = `${user}, your teammate ${teammate.psn} needs to set their NAT Type before you can join a lobby. Use \`!set_nat\`.`;
                    user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                    return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                  }

                  if (doc.region) {
                    if (!teammate.region) {
                      reaction.users.remove(user);
                      const errorMsg = `${user}, your teammate ${teammate.psn} needs to set their region before you can join a region locked lobby. Use \`!set_region\`.`;
                      user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                      return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                    }

                    if (teammate.region !== doc.region) {
                      const lobbyRegion = regions.find((r) => r.uid === doc.region);
                      const teammateRegion = regions.find((r) => r.uid === teammate.region);

                      reaction.users.remove(user);
                      const errorMsg = `${user}, you cannot join a lobby of ${lobbyRegion.name} because your teammate ${teammate.psn} is from ${teammateRegion.name}.`;
                      user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                      return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
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
                  const averageRank = Math.ceil(rankSum / 4);

                  const minRank = doc.locked.rank - doc.locked.shift;
                  const maxRank = doc.locked.rank + doc.locked.shift;
                  const rankTooLow = averageRank < minRank;
                  const rankTooHigh = averageRank > maxRank;

                  if (rankTooLow || rankTooHigh) {
                    reaction.users.remove(user);
                    const errorMsg = `${user}, you cannot join this lobby because ${rankTooLow ? 'your team\'s rank is too low.' : 'your team\'s rank is too high.'}`;
                    user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
                    return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
                  }
                }

                if (playersCount > 4) {
                  const soloQueue = players.filter((p) => !doc.teamList.flat().includes(p));
                  if (doc.teamList.length) {
                    players = players.filter((p) => !soloQueue.includes(p));
                  } else {
                    const soloToKick = soloQueue.slice(4);
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
              const restrict = await restrictSoloQueue(user, reaction, rankedGeneral, soloQueue, doc.locked, doc.type);

              if (!restrict) {
                players.push(user.id);
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
              reaction.users.remove(user);
              const errorMsg = `${user}, you cannot join the lobby because due to incompatible NAT Types (no suitable host).`;
              user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
              return rankedGeneral.send('...').then((m) => {
                m.edit(errorMsg);
                m.delete({ timeout: 60000 });
              });
            }
          }

          return doc.save().then(async (newDoc) => {
            const count = players.length;
            if (count) {
              if (((doc.isItemless() || doc.isBattle()) && count === ITEMLESS_MAX) || (count === ITEMS_MAX)) {
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
          }).catch(console.error);
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
          channel.send('Lobby ended. Don\'t forget to submit your scores.');
        }

        room.lobby = null;
        room.save();
      });
      doc.delete();
    }
  });
});

const findRoomAndSendMessage = (doc, ping = false) => {
  let message = 'Don\'t forget to close the lobby with `!lobby end` and submit your scores.';

  if (ping) {
    message += `\n${doc.players.map((p) => `<@${p}>`).join(' ')}`;
  }

  Room.findOne({ lobby: doc.id }).then((room) => {
    if (room) {
      const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name === `ranked-room-${room.number}`);
      if (channel) {
        channel.send(message);
      }
    }
  });
};

const checkOldLobbies = () => {
  RankedLobby.find({ started: true }).then((docs) => {
    docs.forEach((doc) => {
      const minutes = diffMinutes(new Date(), doc.startedAt);

      const remindMinutes = {
        [ITEMLESS]: [30, 45],
        [BATTLE]: [30, 45],
        [ITEMS]: [45, 60],
        [DUOS]: [45, 60],
        [_4V4]: [60, 75],
      };

      const pingMinutes = {
        [ITEMLESS]: [60, 75, 90, 105, 120],
        [BATTLE]: [60, 75, 90, 105, 120],
        [ITEMS]: [75, 90, 105, 120],
        [DUOS]: [75, 90, 105, 120],
        [_4V4]: [90, 105, 120, 135],
      };

      if (remindMinutes[doc.type].includes(minutes)) {
        findRoomAndSendMessage(doc);
      } else if (pingMinutes[doc.type].includes(minutes)) {
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
        let channel = guild.channels.cache.find((c) => c.name === 'ranked-general');
        if (!channel) {
          channel = await guild.channels.create('ranked-general');
        }
        const creatorMember = `<@${doc.creator}>`;

        if (minutes >= CLOSE_MINUTES) {
          const duration = moment.duration(CLOSE_MINUTES, 'minutes').humanize();
          deleteLobby(doc);
          channel.send(`${creatorMember}, your lobby \`${doc.id}\` has been deleted because it wasn't started in ${duration}.`);
        } else {
          const duration = moment.duration(CLOSE_MINUTES - minutes, 'minutes').humanize();
          channel.send(`${creatorMember}, your lobby \`${doc.id}\` will be deleted in ${duration} if it will not be started.`);
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
      const channel = client.guilds.cache.get(doc.guildId).channels.cache.find((c) => c.name === 'ranked-lobbies');
      const permissionOverwrites = channel.permissionOverwrites.get(doc.discordId);
      if (permissionOverwrites) {
        permissionOverwrites.delete().then(() => {});
      }

      doc.delete();
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

const correctSumsByTeamsCount = {
  1: {
    8: 312,
    7: 248,
    6: 192,
    5: 136,
    4: 55,
    3: 35,
    2: 20,
  },
  2: {
    8: 390,
    4: 80,
  },
  3: {
    6: 168,
  },
  4: {
    8: 288,
  },
};

function checkScoresSum(message) {
  let text = message.content;

  const match = text.match(/`([^`]+)`/);
  if (match) {
    text = match[1];
  }

  const data = parseData(text);

  if (data) {
    const players = [];
    data.clans.forEach((clan) => {
      players.push(...clan.players);
    });
    const sum = players.reduce((s, p) => s + p.totalScore, 0);

    const correctSums = correctSumsByTeamsCount[data.clans.length];
    if (!correctSums) {
      return message.reply('your scores are incorrect.');
    }

    const correctSum = correctSums[players.length];
    if (correctSum && sum !== correctSum) {
      if (sum > correctSum) {
        return message.reply(`the total number of points for your lobby is over ${correctSum} points.
If there were 1 or multiple ties in your lobby, you can ignore this message. If not, please double check the results.`);
      }
      return message.reply(`the total number of points for your lobby is under ${correctSum} points.
Unless somebody left the lobby before all races were played or was penalized, please double check the results.`);
    }
  }
}

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

  const thirtyMinutes = moment().subtract(30, 'm');
  Cooldown.find({ updatedAt: { $lte: thirtyMinutes }, count: { $gt: 0 }, name: 'lobby' })
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
  const isStaff = member.hasPermission(['MANAGE_CHANNELS', 'MANAGE_ROLES']);

  // check submissions
  if (message.channel.name === 'results-submissions') {
    if (!isStaff && !message.content.includes('`') && message.content.includes('|')) {
      message.reply(`\`\`\`${message.content}\`\`\``).then(() => {
        message.delete();
      });
    }

    checkScoresSum(message);
  }

  if (isStaff) return;

  const { roles } = message.mentions;

  if (message.channel.parent && message.channel.parent.name.toLowerCase() === 'ranked lobbies' && roles.find((r) => r.name.toLowerCase() === 'tournament staff')) {
    let rankedStaff = '@Ranked Staff';

    message.channel.send(`${message.author}, incorrect staff ping. If you have a problem ping ${rankedStaff}.`).then((m) => {
      const rankedStaffRole = message.guild.roles.cache.find((r) => r.name.toLowerCase() === 'ranked staff');
      if (rankedStaffRole) {
        rankedStaff = rankedStaffRole.toString();
        m.edit(`${message.author}, incorrect staff ping. If you have a problem ping ${rankedStaff}.`);
      }
    });
  }
});

client.on('ready', () => {
  // todo fetch downtime reactions?

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

  const types = {
    [ITEMS]: 'ay6wNS',
    [ITEMLESS]: 'pAfqYh',
    [DUOS]: 'c9iLJU',
    [BATTLE]: 'oXNYH1',
    [_4V4]: '4fBRNF',
  };

  const ranks = {};

  for (const key in types) {
    const id = types[key];
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
      const lobbiesChannel = guild.channels.cache.find((c) => c.name === 'ranked-lobbies');
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

  if (oldRoles.some((r) => r.name.toLowerCase() === 'ranked verified')) {
    return;
  }

  if (!oldRoles.some((r) => r.name.toLowerCase() === 'ranked') && newRoles.some((r) => r.name.toLowerCase() === 'ranked')) {
    newMember.createDM().then((dm) => {
      dm.send(config.ranked_welcome).then(DMCallback).catch(DMCatchCallback);
    });
  }

  if (newRoles.some((r) => r.name.toLowerCase() === 'ranked verified')) {
    const { guild } = newMember;
    let channel = guild.channels.cache.find((c) => c.name.toLowerCase() === 'ranked-general');
    if (!channel) {
      channel = await guild.channels.create('ranked-general');
    }
    let rankedRules = '#ranked-rules';

    const rankedRulesChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === 'ranked-rules');
    if (rankedRulesChannel) {
      rankedRules = rankedRulesChannel.toString();
    }

    let rankedGuide = '#ranked-guide';

    const rankedGuideChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === 'ranked-guide');
    if (rankedGuideChannel) {
      rankedGuide = rankedGuideChannel.toString();
    }

    Player.findOne({ discordId: newMember.id }).then((doc) => {
      if (!doc || !doc.psn) {
        channel.send(`${newMember}, welcome to the ranked lobbies.
Make sure to read the ${rankedRules} and ${rankedGuide} and set your PSN by using \`!set_psn\` before you can join any lobbies.`);
      }
    });
  }
});

const teamDuration = moment.duration(3, 'hours');

function checkOldDuos() {
  const lte = moment().subtract(teamDuration);
  Duo.find({ date: { $lte: lte } })
    .then((duos) => {
      duos.forEach((duo) => {
        RankedLobby.findOne({
          type: DUOS,
          players: { $in: [duo.discord1, duo.discord2] },
        }).then((activeLobby) => {
          if (!activeLobby) {
            duo.delete().then(() => {
              const guild = client.guilds.cache.get(duo.guild);
              const generalChannel = guild.channels.cache.find((c) => c.name === 'ranked-general');
              const message = `Duo <@${duo.discord1}> & <@${duo.discord2}> was removed after ${teamDuration.humanize()}.`;
              generalChannel.send(message);
            });
          }
        });
      });
    });
}

new CronJob('* * * * *', checkOldDuos).start();

function checkOldTeams() {
  const lte = moment().subtract(teamDuration);
  Team.find({ date: { $lte: lte } })
    .then((teams) => {
      teams.forEach((team) => {
        RankedLobby.findOne({
          type: _4V4,
          players: { $in: teams.players },
        }).then((activeLobby) => {
          if (!activeLobby) {
            team.delete().then(() => {
              const guild = client.guilds.cache.get(team.guild);
              const generalChannel = guild.channels.cache.find((c) => c.name === 'ranked-general');
              const teamPing = team.players.map((p) => `<@${p}>`).join(', ');
              const message = `Team ${teamPing} was removed after ${teamDuration.humanize()}.`;
              generalChannel.send(message);
            });
          }
        });
      });
    });
}

new CronJob('* * * * *', checkOldTeams).start();
