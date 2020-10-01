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
const config = require('../config.js');
const { battleModes } = require('../utils/modes_battle');

const lock = new AsyncLock();

function getTitle(doc) {
  let title = '';

  if (!doc.locked.$isEmpty()) {
    title = 'Locked ';
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
      title += '4v4';
      break;
    default:
      break;
  }

  title += ' Lobby';

  if (doc.pools && doc.type !== DUOS) {
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

const PLAYER_DEFAULT_RANK = 1000;
const DEFAULT_RANK = PLAYER_DEFAULT_RANK;

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

  const flag = p.flag ? ` ${p.flag}` : '';
  const tag = `<@${playerId}>${flag}`;
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
      name: 'Rank Locked',
      value: `${minRank} - ${maxRank}`,
      inline: true,
    };
  }

  const iconUrl = getIcon(doc);
  const timestamp = doc.started ? doc.startedAt : doc.date;
  if (maps) {
    fields = [
      {
        name: 'Players',
        value: playersText,
        inline: true,
      },
      {
        name: 'PSNs & ranks',
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
        name: 'PSNs & ranks',
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

  fields = [{
    name: 'Creator',
    value: `<@${doc.creator}>`,
    inline: true,
  }];

  if (lockedRank) {
    fields.push(lockedRank);
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
    const roleRankedStaff = await findRole(guild, 'Ranked Staff');
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
    channel.createOverwrite(roleRankedStaff, { VIEW_CHANNEL: true });
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
  RankedLobby.findOneAndUpdate({ _id: docId }, { started: true, startedAt: new Date() }, { new: true })
    .then((doc) => {
      client.guilds.cache
        .get(doc.guild).channels.cache
        .get(doc.channel).messages
        .fetch(doc.message).then((message) => {
          rngPools(doc, doc.pools).then((maps) => {
            findRoom(doc).then((room) => {
              findRoomChannel(doc.guild, room.number).then(async (roomChannel) => {
                maps = maps.join('\n');

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

                  for (let i = 0; i < shuffledPlayers.length; i += 1) {
                    const last = randomTeams[randomTeams.length - 1];
                    if (!last || last.length === teamSize) {
                      randomTeams.push([shuffledPlayers[i]]);
                    } else {
                      last.push(shuffledPlayers[i]);
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
                    name: 'PSNs',
                    value: PSNs.join('\n'),
                    inline: true,
                  },
                  {
                    name: 'Maps',
                    value: maps,
                    inline: true,
                  },
                ];

                const modes = await rngModeBattle();

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

Teams: OFF / 4 for Steal The Bacon
AI: DISABLED

${settings.join('\n\n')}\`\`\``);
                  }
                });
              });
            });
          });
        });
    });
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

  // if (!override && minutes < 15) {
  //   return message.channel.send(`You need to wait at least ${15 - minutes} more minutes to force start the lobby.`);
  // }

  const playersCount = doc.players.length;

  if (!override && doc.is4v4() && playersCount < 8) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot force start 4v4 lobby.`);
  }

  if (!override && doc.isItemless() && playersCount < 4) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start itemless lobby with less than 4 players.`);
  }

  if (!override && !doc.isItemless() && !doc.isBattle() && playersCount < 6) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start item lobby with less than 6 players.`);
  }

  if (doc.isDuos() && playersCount % 2 !== 0) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start Duos lobby with player count not divisible by 2.`);
  }

  if (!override && doc.isBattle() && playersCount < 2) {
    return message.channel.send(`Lobby \`${doc.id}\` has ${playersCount} players.\nYou cannot start battle mode lobby with less than 2 players.`);
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
          updatedAt.add(30, 'm');
          const wait = moment.duration(now.diff(updatedAt));
          return message.reply(`you cannot create multiple lobbies so often. You have to wait ${wait.humanize()}.`);
        }

        message.channel.send(`Select lobby mode. Waiting 1 minute.
0 - Items (full rng)
1 - Items (pools)
2 - Itemless (full rng)
3 - Itemless (pools)
4 - Duos (full rng)
5 - Duos (pools)
6 - 4v4 (full rng)
7 - 4v4 (pools)
8 - Battle Mode (full rng)
`).then((confirmMessage) => {
          message.channel.awaitMessages((m) => m.author.id === message.author.id, {
            max: 1,
            time: 60000,
            errors: ['time'],
          })
            .then(async (collected) => {
              const collectedMessage = collected.first();
              const { content } = collectedMessage;
              collectedMessage.delete();

              const choice = parseInt(content, 10);
              const modes = Array.from(Array(9).keys()); // [0, ..., 8]
              if (modes.includes(choice)) {
                let type;
                switch (choice) {
                  case 0:
                  case 1:
                    type = ITEMS;
                    break;
                  case 2:
                  case 3:
                    type = ITEMLESS;
                    break;
                  case 4:
                  case 5:
                    type = DUOS;
                    break;
                  case 6:
                  case 7:
                    type = _4V4;
                    break;
                  case 8:
                    type = BATTLE;
                    break;
                  default:
                    break;
                }

                const pools = [1, 3, 5, 7].includes(choice);

                const sameTypeLobby = await RankedLobby.findOne({
                  started: false, guild: message.guild.id, type,
                });

                if (sameTypeLobby) {
                  confirmMessage.edit('There is already lobby of this type, are you sure you want to create a new one? (yes / no)');
                  const response = await message.channel
                    .awaitMessages((m) => m.author.id === message.author.id,
                      { max: 1, time: 60000, errors: ['time'] })
                    .then((collected2) => {
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

                const roleName = getRoleName(type);
                let role = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName);
                if (!role) {
                  role = await guild.roles.create({
                    data: { name: roleName, mentionable: true },
                    reason: `imagine not having ${roleName} role smh`,
                  });
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
                lobby.save().then(async (doc) => {
                  guild.channels.cache.find((c) => c.name === 'ranked-lobbies')
                    .send({
                      content: role,
                      embed: await getEmbed(doc),
                    }).then((m) => {
                      doc.channel = m.channel.id;
                      doc.message = m.id;
                      doc.save().then(() => {
                        m.react('✅');
                        confirmMessage.edit(`${getTitle(doc)} has been created. Don't forget to press ✅.`);
                      });
                    });
                });
              } else {
                throw new Error('cancel');
              }
            })
            .catch(() => confirmMessage.edit('Command cancelled.').then((m) => m.delete({ timeout: 5000 })));
        });

        break;
      case 'locked':
        message.channel.send(`Select lobby mode. Waiting 1 minute.
0 - Items (full rng)
1 - Items (pools)`).then((confirmMessage) => {
          message.channel.awaitMessages((m) => m.author.id === message.author.id, {
            max: 1,
            time: 60000,
            errors: ['time'],
          })
            .then(async (collected) => {
              const collectedMessage = collected.first();
              const { content } = collectedMessage;
              collectedMessage.delete();
              if (['0', '1'].includes(content)) {
                const type = ITEMS;
                const pools = content === '1';

                const diffMin = 200;
                const diffMax = 500;
                const diffDefault = 350;

                confirmMessage.edit(`Select allowed rank difference. Waiting 1 minute.
The value should be in range: \`${diffMin} - ${diffMax}\`. Defaults to \`${diffDefault}\` on any other input.`).then((confirmMessage2) => {
                  message.channel.awaitMessages((m) => m.author.id === message.author.id, {
                    max: 1,
                    time: 60000,
                    errors: ['time'],
                  })
                    .then(async (collected2) => {
                      const collectedMessage2 = collected2.first();
                      let rankDiff = parseInt(collectedMessage2.content, 10);

                      if (Number.isNaN(rankDiff) || rankDiff < diffMin || rankDiff > diffMax) {
                        rankDiff = diffDefault;
                      }

                      const rank = await Rank.findOne({ name: player.psn });
                      let playerRank = PLAYER_DEFAULT_RANK;
                      if (rank) {
                        playerRank = type === ITEMS ? rank.items.rank : rank.itemless.rank;
                      }

                      collectedMessage2.delete();

                      const roleName = `ranked ${type === ITEMS ? 'items' : 'itemless'}`;
                      let role = guild.roles.cache.find((r) => r.name.toLowerCase() === roleName);
                      if (!role) {
                        role = await guild.roles.create({
                          data: { name: roleName, mentionable: true },
                          reason: `imagine not having ${roleName} role smh`,
                        });
                      }

                      const lobby = new RankedLobby();
                      lobby.guild = guild.id;
                      lobby.creator = message.author.id;
                      lobby.type = type;
                      lobby.pools = pools;
                      lobby.locked = {
                        rank: playerRank,
                        shift: rankDiff,
                      };
                      lobby.save().then(async (doc) => {
                        guild.channels.cache.find((c) => c.name === 'ranked-lobbies')
                          .send({
                            content: role,
                            embed: await getEmbed(doc),
                          }).then((m) => {
                            doc.channel = m.channel.id;
                            doc.message = m.id;
                            doc.save().then(() => {
                              m.react('✅');
                              confirmMessage2.edit(`${getTitle(doc)} has been created. Don't forget to press ✅.`);
                            });
                          });
                      });
                    })
                    .catch(() => confirmMessage2.edit('Command cancelled.').then((m) => m.delete({ timeout: 5000 })));
                });
              } else {
                throw new Error('cancel');
              }
            })
            .catch(() => confirmMessage.edit('Command cancelled.').then((m) => m.delete({ timeout: 5000 })));
        });

        break;

      case 'start':
      case 'begin':
        findLobby(lobbyID, isStaff, message, confirmLobbyStart);
        break;

      case 'override':
      case 'o':
        if (isStaff) {
          findLobby(lobbyID, isStaff, message, (d, m) => confirmLobbyStart(d, m, true));
        } else {
          return message.channel.send('You don\'t have permissions to do that.');
        }
        break;
      case 'delete':
      case 'remove':
      case 'done':
      case 'stop':
      case 'end':
      case 'die':
      case 'fuck':
        findLobby(lobbyID, isStaff, message, (doc, msg) => {
          if (doc.started) {
            const minutes = diffMinutes(new Date(), doc.startedAt);
            const confirmationMinutes = doc.isItemless() || doc.isBattle() ? 30 : 50;
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
      default:
        break;
    }
  },
};

const banDuration = moment.duration(1, 'hour');

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

const ITEMS_MAX = 8;
const ITEMLESS_MAX = 4;

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

          const repeatLobby = await RankedLobby.findOne({ guild: guild.id, players: user.id, _id: { $ne: doc._id } });

          if (repeatLobby) {
            reaction.users.remove(user);
            errorMsg = `${user}, you cannot be in 2 ranked lobbies at the same time.`;
            user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
            return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
          }

          if (!doc.locked.$isEmpty()) {
            const rank = await Rank.findOne({ name: player.psn });

            let playerRank = PLAYER_DEFAULT_RANK;
            if (rank) {
              playerRank = doc.isItems() ? rank.items.rank : rank.itemless.rank;
            }
            const lockedRank = doc.locked.rank;
            const minRank = lockedRank - doc.locked.shift;
            const maxRank = lockedRank + doc.locked.shift;
            const rankTooLow = playerRank < minRank;
            const rankTooHigh = playerRank > maxRank;
            if (rankTooLow || rankTooHigh) {
              reaction.users.remove(user);
              errorMsg = `${user}, you cannot join this lobby because ${rankTooLow ? 'your rank is too low.' : 'your rank is too high.'}`;
              user.createDM().then((dmChannel) => dmChannel.send(errorMsg));
              return rankedGeneral.send(errorMsg).then((m) => m.delete({ timeout: 60000 }));
            }
          }
        }

        lock.acquire(doc._id, async () => RankedLobby.findOne({ _id: doc._id }).then(async (doc) => {
          console.log(`lock acquire ${doc._id}`);
          let players = Array.from(doc.players);

          const playersCount = players.length;
          if (!removed) {
            if (doc.isItemless() && playersCount >= ITEMLESS_MAX) {
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
                // if (playersCount > ITEMS_MAX - 2) {
                //   reaction.users.remove(user);
                //   const error = `${user}, there are already ${playersCount} people the lobby - you cannot join this lobby while you have a partner set.`;
                //   user.createDM().then((dmChannel) => dmChannel.send(error));
                //   rankedGeneral.send(error).then((m) => m.delete({ timeout: 60000 }));
                //   return;
                // }
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
              players.push(user.id);
            }
            doc.teamList = teamList;
          } else if (doc.is4v4()) {
            const team = await Team.findOne({
              guild: guild.id,
              players: user.id,
            });
            if (team) {
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
              players.push(user.id);
            }
            doc.teamList = teamList;
          } else if (removed) {
            players = players.filter((p) => p !== user.id);
          } else if (!players.includes(user.id)) {
            players.push(user.id);
          }

          doc.players = players;

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
        })).then(() => {
          console.log(`lock released ${doc._id}`);
        });
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

  // // Now the message has been cached and is fully available
  // console.log(`${reaction.message.author}'s message "${reaction.message.content}" removed a reaction!`);
  // // The reaction is now also fully available and the properties will be reflected accurately:
  // console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
});

client.on('messageDelete', async (message) => {
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      console.log('Something went wrong when fetching the message: ', error);
    }
  }

  const conditions = {
    // guild: message.guild.id,
    // channel: message.channel.id,
    message: message.id,
  };

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

      const remindMinutes = doc.isItemless() ? [30, 45] : [45, 60];
      const pingMinutes = doc.isItemless() ? [60, 75, 90, 105, 120] : [75, 90, 105, 120];

      if (remindMinutes.includes(minutes)) {
        findRoomAndSendMessage(doc);
      } else if (pingMinutes.includes(minutes)) {
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
        permissionOverwrites.delete().then(() => {
          console.log(doc.discordId, 'unbanned');
        });
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
      }
      const channel = guild.channels.cache.get(doc.channel);
      if (!channel) {
        doc.delete();
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
        console.log(user.id, 'banned from ranked on rejoin');
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
