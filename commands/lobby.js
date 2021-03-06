const axios = require('axios');
const moment = require('moment');
const { CronJob } = require('cron');
const AsyncLock = require('async-lock');
const {
  MessageActionRow,
  MessageMenu,
  MessageMenuOption,
} = require('discord-buttons');
const {
  yesButton,
  noButton,
  maybeButton,
  joinLobbyButton,
  leaveLobbyButton,
  deleteLobbyButton,
} = require('../db/buttons');
const {
  RACE_FFA,
  RACE_DUOS,
  RACE_3V3,
  RACE_4V4,
  RACE_SURVIVAL,
  RACE_ITEMLESS_FFA,
  BATTLE_FFA,
  BATTLE_DUOS,
  BATTLE_4V4,
  SURVIVAL_STYLES,
  LEADERBOARDS,
  LOBBY_MODE_STANDARD,
  LOBBY_MODE_TOURNAMENT,
  CUSTOM_OPTION_MODE,
  CUSTOM_OPTION_TRACK_POOL,
  CUSTOM_OPTION_PLAYERS,
  CUSTOM_OPTION_RULESET,
  CUSTOM_OPTION_REGION,
  CUSTOM_OPTION_BATTLE_MODES,
  CUSTOM_OPTION_PREMADE_TEAMS,
  CUSTOM_OPTION_RESERVE,
  CUSTOM_OPTION_ANONYMOUS,
  CUSTOM_OPTION_TYPE,
  CUSTOM_OPTION_MMR_LOCK,
} = require('../db/models/lobby');
const config = require('../config');
const { Cooldown } = require('../db/models/cooldown');
const { Counter } = require('../db/models/counter');
const { Duo } = require('../db/models/duo');
const { FinishedLobby } = require('../db/models/finished_lobby');
const { Lobby } = require('../db/models/lobby');
const { Player } = require('../db/models/player');
const { Rank } = require('../db/models/rank');
const { RankedBan } = require('../db/models/ranked_ban');
const { Room } = require('../db/models/room');
const { Sequence } = require('../db/models/sequence');
const { Team } = require('../db/models/team');
const { client } = require('../bot');
const createDraft = require('../utils/createDraft');
const createDraftv2 = require('../utils/createDraftv2');
const createAndFindRole = require('../utils/createAndFindRole');
const generateBattleModes = require('../utils/generateBattleModes');
const generateTemplate = require('../utils/generateTemplate');
const generateTracks = require('../utils/generateTracks');
const getConfigValue = require('../utils/getConfigValue');
const getRandomArrayElement = require('../utils/getRandomArrayElement');
const isServerSupporter = require('../utils/isServerSupporter');
const isStaffMember = require('../utils/isStaffMember');
const {
  optimalPartition3,
  optimalPartition4,
} = require('../utils/optimalPartition');
const sendAlertMessage = require('../utils/sendAlertMessage');
const sendLogMessage = require('../utils/sendLogMessage');
const shuffleArray = require('../utils/shuffleArray');
const {
  battleModes1v1,
  battleModesSolos,
  battleModesTeams,
} = require('../db/modes_battle');
const { engineStyles } = require('../db/engine_styles');
const { lobbyTypes } = require('../db/lobby_types');
const { regions } = require('../db/regions');
const { rulesets } = require('../db/rulesets');
const { trackOptions } = require('../db/track_options');

const lock = new AsyncLock();

const NAT3 = 'NAT 3';
const FORCE_START_COOLDOWN = 5;

function getFooter(doc) {
  return {
    icon_url: doc.getIcon(),
    text: `id: ${doc._id}`,
  };
}

function getRoomName(number) {
  return `lobby-room-${number}`;
}

async function getPlayerInfo(playerId, doc) {
  const p = await Player.findOne({ discordId: playerId });
  const rank = await Rank.findOne({ name: p.rankedName });
  let rankValue = doc.getDefaultRank();

  if (rank && rank[doc.type]) {
    rankValue = rank[doc.type].rank;
    rankValue = parseInt(rankValue, 10);
  }

  if (!rankValue) {
    rankValue = doc.getDefaultRank();
  }

  const flag = p.flag !== undefined ? ` ${p.flag}` : ':united_nations:';
  const tag = `${flag} <@${playerId}>`;

  let { psn } = p;
  if (psn) {
    psn = psn.replace('_', '\\_');
  }

  if (!doc.anonymous || doc.started) {
    return [tag, psn, rankValue];
  }

  return [
    ':united_nations: ???',
    '???',
    1200,
  ];
}

async function getLivestreams(doc) {
  const isCTRStream = (a) => a.type === 'STREAMING' && a.state && a.state.toLowerCase().includes('crash team');
  const livestreams = [];

  // eslint-disable-next-line max-len
  const members = await client.guilds.cache.get(doc.guild).members.fetch({ user: doc.players, withPresences: true });

  members.forEach((m) => {
    m.presence.activities.forEach((a) => {
      if (isCTRStream(a) && !livestreams.includes(a.url)) {
        livestreams.push(a.url);
      }
    });
  });

  return livestreams;
}

async function getEmbed(doc, players, tracks, roomChannel) {
  let playersText = 'No players.';
  let psnAndRanks = 'No players.';
  const ranks = [];

  const playersInfo = {};

  const playersOut = [];
  if (players && players.length) {
    const psns = [];

    for (const playerId of players) {
      const [tag, psn, rank] = await getPlayerInfo(playerId, doc);

      ranks.push(rank);
      playersOut.push(tag);

      if (doc.ranked) {
        psns.push(`${psn} [${rank}]`);
      } else {
        psns.push(psn);
      }

      playersInfo[playerId] = { tag, psn, rank };
    }
    playersText = playersOut.join('\n');
    psnAndRanks = psns.join('\n');
  }

  if (doc.teamList && doc.teamList.length) {
    playersText = '';
    playersText += '**Teams:**\n';

    doc.teamList.forEach((team, i) => {
      if (team.length <= 0) {
        return;
      }

      let mmrSum = 0;

      team.forEach((player) => {
        const info = playersInfo[player];
        mmrSum += info.rank;
      });

      if (!doc.anonymous || doc.started) {
        playersText += `**Team ${i + 1} (Rating: ${Math.floor(mmrSum / team.length)})**\n`;
      } else {
        playersText += `**Team ${i + 1}**\n`;
      }

      team.forEach((player, x) => {
        const info = playersInfo[player];
        const tag = info && info.tag;
        playersText += `${x + 1}. ${tag}\n`;
        delete playersInfo[player];
      });
    });

    if (Object.keys(playersInfo).length) {
      playersText += '**Solo Queue:**\n';
      Object.entries(playersInfo).forEach(([, value]) => {
        playersText += `${value.tag}\n`;
      });
    }
  }

  const sum = ranks.reduce((a, b) => a + b, 0);
  const avgRank = Math.round(sum / ranks.length) || 0;

  let fields;

  const iconUrl = doc.getIcon();
  const creator = await Player.findOne({ discordId: doc.creator });
  const timestamp = doc.started ? doc.startedAt : doc.date;
  const engineRestriction = engineStyles.find((e) => e.uid === doc.engineRestriction);
  const survivalStyle = SURVIVAL_STYLES.find((s, i) => i === doc.survivalStyle);
  const ruleset = rulesets.find((r, i) => i === doc.ruleset);

  const lobbyRegions = [];
  doc.regions.forEach((dr) => {
    const region = regions.find((r) => r.uid === dr);
    lobbyRegions.push(region.name);
  });

  const playersField = {
    name: ':busts_in_silhouette: Players',
    value: playersText,
    inline: true,
  };

  const psnsField = {
    name: `:credit_card: PSN IDs${doc.ranked ? ' & Ranks' : ''}`,
    value: psnAndRanks,
    inline: true,
  };

  const tracksField = {
    name: `:motorway: ${doc.isRacing() ? 'Tracks' : 'Arenas'}`,
    value: tracks,
    inline: true,
  };

  let roomField = {};

  if (roomChannel) {
    roomField = {
      name: ':key: Room',
      value: roomChannel.toString(),
      inline: true,
    };
  }

  let creatorField;

  if (!doc.anonymous || doc.started) {
    creatorField = {
      name: ':bust_in_silhouette: Creator',
      value: `${creator.flag} <@${doc.creator}>`,
      inline: true,
    };
  } else {
    creatorField = {
      name: ':bust_in_silhouette: Creator',
      value: ':united_nations: ???',
      inline: true,
    };
  }

  const averageRankField = {
    name: ':checkered_flag: Average Rank',
    value: avgRank,
    inline: true,
  };

  const settings = [
    `Max Players: ${doc.maxPlayerCount}`,
    `${doc.isRacing() ? 'Track Count' : 'Arena Count'}: ${doc.trackCount}`,
  ];

  if (doc.isRacing()) {
    settings.push(`Lap Count: ${doc.lapCount}`);
    settings.push(`Ruleset: ${ruleset.name}`);

    if (engineRestriction) {
      settings.push(`Engine Style: ${engineRestriction.icon}`);
    }

    if (survivalStyle) {
      settings.push(`Survival Style: ${survivalStyle}`);
    }
  }

  if (lobbyRegions.length > 0) {
    settings.push(`Regions: ${lobbyRegions.join(', ')}`);
  }

  if (!doc.locked.$isEmpty()) {
    const playerRank = parseInt(doc.locked.rank, 10);
    const minRank = playerRank - doc.locked.shift;
    const maxRank = playerRank + doc.locked.shift;

    settings.push(`Rank Lock: ${minRank} - ${maxRank}`);
  }

  if (doc.isTeams()) {
    settings.push(`Premade Teams: ${doc.allowPremadeTeams ? 'Allowed' : 'Not allowed'}`);

    if (doc.reservedTeam) {
      settings.push(`Team Reservation: <@${doc.creator}> & <@${doc.reservedTeam}>`);
    }
  }

  let settingsField = {};

  if (settings.length > 0) {
    settingsField = {
      name: ':joystick: Lobby Settings',
      value: settings.join('\n'),
      inline: true,
    };
  }

  if (tracks) {
    fields = [
      playersField,
      psnsField,
      tracksField,
      roomField,
      creatorField,
    ];

    if (doc.ranked) {
      fields.push(averageRankField);
    }

    if (settings.length > 0) {
      fields.push(settingsField);
    }

    const livestreams = await getLivestreams(doc);
    if (livestreams.length > 0) {
      fields.push({
        name: ':tv: Livestreams',
        value: livestreams.join('\n'),
        inline: true,
      });

      // add spacer so that the layout doesn't get fucked
      fields.push({
        name: '\u200B',
        value: '\u200B',
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
    creatorField.inline = false;

    fields = [
      playersField,
      psnsField,
      creatorField,
    ];

    if (doc.ranked) {
      fields.push(averageRankField);
    }

    if (settings.length > 0) {
      fields.push(settingsField);
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

  fields = [creatorField];

  if (settings.length > 0) {
    fields.push(settingsField);
  }

  return {
    color: doc.getColor(),
    author: {
      name: `${doc.getTitle()}`,
      icon_url: iconUrl,
    },
    description: 'Click on the ✅ button to join!',
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
  const channelName = getRoomName(n);
  let category = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.matchmaking_category.toLowerCase() && c.type === 'category');
  if (!category) {
    category = await guild.channels.create(config.channels.matchmaking_category, { type: 'category' });
  }

  let channel = guild.channels.cache.find((c) => c.name === channelName);
  if (!channel) {
    const roleStaff = await createAndFindRole(guild, config.roles.staff_role);
    const roleVerified = await createAndFindRole(guild, config.roles.verified_player_role);
    const roleMatchmaking = await createAndFindRole(guild, config.roles.matchmaking_role);

    channel = await guild.channels.create(channelName, {
      type: 'text',
      parent: category,
    });

    await channel.createOverwrite(roleStaff, { VIEW_CHANNEL: true });
    await channel.createOverwrite(roleVerified, { VIEW_CHANNEL: true });
    await channel.createOverwrite(roleMatchmaking, { VIEW_CHANNEL: true });
    await channel.createOverwrite(guild.roles.everyone, { VIEW_CHANNEL: false });
  }

  return channel;
}

async function getPlayersText(doc) {
  let playersText = '';

  if (doc.isTeams()) {
    playersText += '**Teams:**\n';

    // eslint-disable-next-line guard-for-in
    for (const i in doc.teamList) {
      const team = doc.teamList[i];
      if (team.length <= 0) {
        // eslint-disable-next-line no-continue
        continue;
      }

      let mmrSum = 0;

      // eslint-disable-next-line guard-for-in
      for (const p in team) {
        const player = await Player.findOne({ discordId: team[p] });
        const rank = await Rank.findOne({ name: player.rankedName });

        let mmr = doc.getDefaultRank();
        if (rank && rank[doc.type] && rank[doc.type].rank) {
          mmr = rank[doc.type].rank;
        }

        mmrSum += mmr;
      }

      playersText += `${Number(i) + 1}. (Rank: ${Math.floor(mmrSum / team.length)})\n`;

      // eslint-disable-next-line no-loop-func
      team.forEach((p) => {
        playersText += `<@${p}>\n`;
      });
    }
  } else {
    playersText = doc.players.map((u, i) => `${i + 1}. <@${u}>`).join('\n');
  }

  return playersText;
}

async function getPlayerRanks(doc, players) {
  players = players.sort(() => Math.random() - 0.5);
  const playerRanks = [];

  if (players.length > 0) {
    const playerModels = await Player.find({ discordId: { $in: players } });

    for (const player of playerModels) {
      const rank = await Rank.findOne({ name: player.rankedName });

      let ranking = doc.getDefaultRank();
      if (rank && rank[doc.type]) {
        ranking = rank[doc.type].rank;
      }

      playerRanks.push({
        discordId: player.discordId,
        rank: ranking,
      });
    }
  }

  return playerRanks.sort((a, b) => b.rank - a.rank);
}

function sendBattleModeSettings(doc, roomChannel, modes) {
  let list;

  if (doc.is1v1()) {
    list = battleModes1v1;
  } else if (!doc.isTeams()) {
    list = battleModesSolos;
  } else {
    list = battleModesTeams;
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

  getConfigValue('battle_mode_settings_image', 'https://i.imgur.com/k56NKZc.jpg').then((image) => {
    roomChannel.send({
      embed: {
        color: doc.getColor(),
        description: '**Global Settings**\nAI: Disabled',
        author: {
          name: 'Battle Mode Settings',
        },
        image: {
          url: image,
        },
        fields: embedFields,
      },
    });
  });
}

async function createBalancedTeams(doc, soloPlayers) {
  const randomTeams = [];
  const playerRanks = await getPlayerRanks(doc, soloPlayers);
  const teamCount = (soloPlayers.length / doc.getTeamSize());

  if (doc.isDuos()) {
    for (let i = 1; i <= teamCount; i += 1) {
      const firstPlayer = playerRanks.shift();
      const lastPlayer = playerRanks.pop();

      randomTeams.push([
        firstPlayer.discordId,
        lastPlayer.discordId,
      ]);
    }
  } else if (doc.isWar()) {
    if (teamCount > 1) {
      let result;

      if (!doc.is4v4()) {
        result = optimalPartition3(playerRanks, doc.getTeamSize(), 'rank');
      } else {
        result = optimalPartition4(playerRanks, doc.getTeamSize(), 'rank');
      }

      const playersA = result.A.map((a) => a.discordId);
      const playersB = result.B.map((b) => b.discordId);

      randomTeams.push([...playersA]);
      randomTeams.push([...playersB]);
    } else {
      const discordIds = playerRanks.map((s) => s.discordId);
      randomTeams.push([...discordIds]);
    }
  }

  return randomTeams;
}

async function setupTournamentRound(doc, roomChannel) {
  const pinnedMessages = await roomChannel.messages.fetchPinned();
  pinnedMessages.forEach((pinnedMessage) => pinnedMessage.unpin());

  const engineRestriction = engineStyles.find((e) => e.uid === doc.engineRestriction);
  const ruleset = rulesets.find((r, i) => i === doc.ruleset);

  let settings = [];
  if (doc.isRacing()) {
    settings = [
      `Lap Count: ${doc.lapCount}`,
      `Ruleset: ${ruleset.name}`,
    ];

    if (engineRestriction) {
      settings.push(`Engine Style: ${engineRestriction.icon}`);
    }
  }

  /* Create tracks based on the underlying format */
  const lobby = doc;
  lobby.mode = LOBBY_MODE_STANDARD;

  const tracks = await generateTracks(lobby);

  if (doc.isSolos()) {
    const lobbyCount = doc.players.length / doc.getDefaultPlayerCount();
    const shuffledPlayers = shuffleArray(doc.players);
    const lobbyData = [];

    // eslint-disable-next-line no-plusplus
    for (let i = 1; i <= lobbyCount; i++) {
      const players = [];

      // eslint-disable-next-line no-plusplus
      for (let x = 1; x <= doc.getDefaultPlayerCount(); x++) {
        players.push(shuffledPlayers.shift());
      }

      const [PSNs, templateUrl, template] = await generateTemplate(players, doc);

      lobbyData.push({
        players,
        PSNs,
        templateUrl,
        number: i,
        template,
      });
    }

    for (const l of lobbyData) {
      const embed = {
        color: doc.getColor(),
        title: `Lobby ${l.number}`,
        fields: [
          {
            name: 'PSN IDs & Ranks',
            value: l.PSNs.join('\n'),
            inline: true,
          },
          {
            name: 'Tracks',
            value: tracks.join('\n'),
            inline: true,
          },
        ],
      };

      if (settings.length > 0) {
        embed.fields.push({
          name: 'Settings',
          value: settings.join('\n'),
          inline: true,
        });
      }

      embed.fields.push({
        name: 'Score Template',
        value: `\`\`\`${l.template}\`\`\`\n[Open template on gb.hlorenzi.com](${l.templateUrl})`,
      });

      const pings = doc.players.map((m) => `<@!${m}>`).join(', ');
      roomChannel.send({ content: pings, embed }).then((m) => {
        m.pin();
      });
    }
  }
}

function startLobby(docId) {
  // eslint-disable-next-line max-len
  Lobby.findOneAndUpdate({ _id: docId, started: false }, { started: true, startedAt: new Date() }, { new: true }).then((doc) => {
    // eslint-disable-next-line max-len
    client.guilds.cache.get(doc.guild).channels.cache.get(doc.channel).messages.fetch(doc.message).then((message) => {
      generateTracks(doc).then((tracks) => {
        findRoom(doc).then((room) => {
          findRoomChannel(doc.guild, room.number).then(async (roomChannel) => {
            const joinLobbyButtonCopy = JSON.parse(JSON.stringify(joinLobbyButton));
            const leaveLobbyButtonCopy = JSON.parse(JSON.stringify(leaveLobbyButton));
            const deleteLobbyButtonCopy = JSON.parse(JSON.stringify(deleteLobbyButton));

            joinLobbyButtonCopy.disabled = true;
            leaveLobbyButtonCopy.disabled = true;
            deleteLobbyButtonCopy.disabled = true;

            const buttonRow = new MessageActionRow()
              .addComponent(joinLobbyButtonCopy)
              .addComponent(leaveLobbyButtonCopy)
              .addComponent(deleteLobbyButtonCopy);

            if (doc.isTournament()) {
              sendAlertMessage(roomChannel, `The ${doc.getTitle()} is starting!`, 'info', doc.players).then(async () => {
                await message.edit({
                  embed: await getEmbed(doc, doc.players, tracks, roomChannel),
                  components: [buttonRow],
                });

                await setupTournamentRound(doc, roomChannel);
              });
            } else {
              // Display track column but blank all tracks
              if (doc.isWar() && doc.isDrafting()) {
                tracks = [];

                for (let i = 1; i <= doc.trackCount; i += 1) {
                  tracks.push('*N/A*');
                }
              }

              tracks = tracks.join('\n');

              if (doc.isTeams()) {
                const randomTeams = await createBalancedTeams(doc, doc.getSoloPlayers());

                doc.teamList = Array.from(doc.teamList).concat(randomTeams);
                doc = await doc.save();
              }

              const { players } = doc;
              const playersText = await getPlayersText(doc);

              const [PSNs, templateUrl, template] = await generateTemplate(players, doc);

              await message.edit({
                embed: await getEmbed(doc, players, tracks, roomChannel),
                components: [buttonRow],
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
                modes = await generateBattleModes(doc, tracks.split('\n'));

                fields.push({
                  name: 'Modes',
                  value: modes.join('\n'),
                  inline: true,
                });
              }

              const engineRestriction = engineStyles.find((e) => e.uid === doc.engineRestriction);
              const survivalStyle = SURVIVAL_STYLES.find((s, i) => i === doc.survivalStyle);
              const ruleset = rulesets.find((r, i) => i === doc.ruleset);

              if (doc.isRacing()) {
                const settings = [
                  `Lap Count: ${doc.lapCount}`,
                  `Ruleset: ${ruleset.name}`,
                ];

                if (engineRestriction) {
                  settings.push(`Engine Style: ${engineRestriction.icon}`);
                }

                if (survivalStyle) {
                  settings.push(`Survival Style: ${survivalStyle}`);
                }

                fields.push({
                  name: 'Settings',
                  value: settings.join('\n'),
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
                      title: 'Score Template',
                      description: `\`\`\`${template}\`\`\`
  [Open template on gb.hlorenzi.com](${templateUrl})`,
                    },
                  }).then(() => {
                    if (doc.isBattle()) {
                      sendBattleModeSettings(doc, roomChannel, modes);
                    }

                    if (doc.ranked) {
                      sendAlertMessage(roomChannel, `Report any rule violations to ranked staff by sending a DM to <@!${config.bot_user_id}>.`, 'info');
                    }

                    // eslint-disable-next-line no-shadow
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
                        // eslint-disable-next-line no-use-before-define
                        deleteLobby(doc);
                        m.delete();
                        sendAlertMessage(roomChannel, 'The lobby was ended automatically because nobody volunteered to keep scores.', 'warning');
                      });
                    });

                    if (doc.isWar() && doc.isDrafting()) {
                      const teams = ['A', 'B'];

                      // eslint-disable-next-line max-len
                      const captainAPromise = client.guilds.cache.get(doc.guild).members.fetch(getRandomArrayElement(doc.teamList[0]));
                      // eslint-disable-next-line max-len
                      const captainBPromise = client.guilds.cache.get(doc.guild).members.fetch(getRandomArrayElement(doc.teamList[1]));

                      Promise.all([captainAPromise, captainBPromise]).then((captains) => {
                        switch (doc.type) {
                          case RACE_3V3:
                            createDraft(roomChannel, '1', teams, captains);
                            break;
                          case RACE_4V4:
                            createDraft(roomChannel, '0', teams, captains);
                            break;
                          case BATTLE_DUOS:
                            createDraftv2(roomChannel, 2, 0, 3, 30, captains);
                            break;
                          case BATTLE_4V4:
                            createDraftv2(roomChannel, 2, 0, 4, 30, captains);
                            break;
                          default:
                            break;
                        }
                      });
                    }
                  });
                });
              });
            }
          });
        });
      });
    });
    // eslint-disable-next-line no-console
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

  if (!doc.hasMinimumPlayerCount()) {
    return sendAlertMessage(message.channel, `You cannot start a ${doc.type} lobby with less than ${doc.getMinimumPlayerCount()} players.`, 'warning');
  }

  if (override) {
    return startLobby(doc.id);
  }

  return sendAlertMessage(message.channel, `The lobby \`${doc.id}\` has \`${playersCount}\` players. Are you sure you want to start it? Say \`yes\` or \`no\`.`, 'info').then(() => {
    const filter = (m) => m.author.id === message.author.id;
    const options = { max: 1, time: 60000, errors: ['time'] };

    // eslint-disable-next-line consistent-return
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
      promise = Lobby.findOne({ _id: lobbyID });
    } else {
      promise = Lobby.findOne({
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
    Lobby.find({
      $or: [
        { creator: message.author.id },
        { started: true, players: message.author.id },
      ],
      // eslint-disable-next-line consistent-return
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

function deleteLobby(doc, msg, sendMessage) {
  if (arguments.length < 3) {
    sendMessage = true;
  }

  const promiseMessageDelete = client.guilds.cache.get(doc.guild)
    .channels.cache.get(doc.channel)
    .messages.fetch(doc.message)
    .then((m) => m.delete());

  let endMessage = 'Lobby ended.';

  if (doc.started && doc.ranked) {
    endMessage += ' Don\'t forget to submit your scores.';
  }

  const roomDocDelete = Room.findOne({ lobby: doc.id }).then((room) => {
    if (!room) {
      return;
    }

    // eslint-disable-next-line max-len
    const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name === getRoomName(room.number));
    if (msg && channel && msg.channel.id !== channel.id) {
      sendAlertMessage(channel, endMessage, 'success');
    }

    room.lobby = null;
    room.save();
  });

  const finishedLobby = new FinishedLobby();
  finishedLobby.type = doc.type;
  finishedLobby.trackOption = doc.trackOption;
  finishedLobby.ruleset = doc.ruleset;
  finishedLobby.regions = doc.regions;
  finishedLobby.engineRestriction = doc.engineRestriction;
  finishedLobby.survivalStyle = doc.survivalStyle;
  finishedLobby.tournament = doc.isTournament();
  finishedLobby.ranked = doc.ranked;

  const promiseDocDelete = doc.delete();
  const promiseSaveFinishedLobby = finishedLobby.save();

  // eslint-disable-next-line max-len
  Promise.all([promiseMessageDelete, promiseDocDelete, roomDocDelete, promiseSaveFinishedLobby]).then(() => {
    if (msg && sendMessage) {
      sendAlertMessage(msg.channel, endMessage, 'success');
    }
  });
}

module.exports = {
  name: 'lobby',
  description: 'Lobbies',
  guildOnly: true,
  aliases: ['mogi', 'l', 'lebby'],
  cooldown: 15,
  // eslint-disable-next-line consistent-return
  async execute(message, args) {
    let action = args[0];
    let custom = [];

    if (!action) {
      action = 'new';
    }

    if (action === 'custom') {
      action = 'new';

      args.shift();
      custom = args;

      if (args.length <= 0) {
        // show all options by default
        custom = [
          CUSTOM_OPTION_MODE,
          CUSTOM_OPTION_TRACK_POOL,
          CUSTOM_OPTION_PLAYERS,
          CUSTOM_OPTION_RULESET,
          CUSTOM_OPTION_REGION,
          CUSTOM_OPTION_BATTLE_MODES,
          CUSTOM_OPTION_PREMADE_TEAMS,
          CUSTOM_OPTION_RESERVE,
          CUSTOM_OPTION_ANONYMOUS,
          CUSTOM_OPTION_TYPE,
          CUSTOM_OPTION_MMR_LOCK,
        ];
      }
    }

    const lobbyID = args[1];
    const { member } = message;

    const configValue = await getConfigValue('ranked_lobby_lock_date', new Date());
    const now = moment();
    if (configValue) {
      const lockDate = moment(configValue);

      if (lockDate.isValid() && lockDate >= now) {
        return sendAlertMessage(message.channel, `Matchmaking is temporarily closed until midnight CEST on ${lockDate.format('YYYY-MM-DD')}.`, 'warning');
      }
    }

    const { guild } = message;
    const isStaff = isStaffMember(member);
    const isSupporter = isServerSupporter(member);

    if (!isStaff) {
      // eslint-disable-next-line max-len
      if (!message.channel.parent || (message.channel.parent && message.channel.parent.name.toLowerCase() !== config.channels.matchmaking_category.toLowerCase())) {
        return sendAlertMessage(message.channel, 'You can use this command only in the `Matchmaking` category.', 'warning');
      }
    }

    action = action && action.toLowerCase();
    switch (action) {
      case 'new':
        // eslint-disable-next-line no-case-declarations
        const cooldown = await Cooldown.findOne({ guildId: guild.id, discordId: message.author.id, name: 'lobby' });
        if (!isStaff && !isSupporter && cooldown && cooldown.count >= 1) {
          const updatedAt = moment(cooldown.updatedAt);
          updatedAt.add(config.lobby_creation_cooldown, 'm');
          const wait = moment.duration(now.diff(updatedAt));

          return sendAlertMessage(message.channel, `You cannot create multiple lobbies so often. You have to wait ${wait.humanize()}.`, 'warning');
        }

        // eslint-disable-next-line no-case-declarations
        const actionFilter = (m) => m.clicker.user.id === message.author.id;
        // eslint-disable-next-line no-case-declarations
        const messageFilter = (m) => m.author.id === message.author.id;
        // eslint-disable-next-line no-case-declarations
        const filterOptions = { max: 1, time: 60000, errors: ['time'] };

        // eslint-disable-next-line no-case-declarations
        const lobbyMenu = new MessageMenu()
          .setID('select_lobby')
          .setPlaceholder('Choose ...')
          .setMaxValues(1)
          .setMinValues(1);

        lobbyTypes.forEach((l) => {
          const option = new MessageMenuOption()
            .setLabel(l.name)
            .setValue(l.uid)
            .setDefault(l.default);

          lobbyMenu.addOption(option);
        });

        message.delete();

        return sendAlertMessage(message.channel, 'Select the mode you want to play.', 'info', [], [], [lobbyMenu]).then((confirmMessage) => {
          // eslint-disable-next-line consistent-return
          confirmMessage.awaitMenus(actionFilter, filterOptions).then(async (collected) => {
            confirmMessage.delete();

            let collectedOption = collected.first();
            const type = collectedOption.values.shift();
            let sentMessage = null;

            // Initialize lobby here to be able to use model functions
            const lobby = new Lobby();
            lobby.guild = guild.id;
            lobby.creator = message.author.id;
            lobby.type = type;

            let mode = LOBBY_MODE_STANDARD;
            if (lobby.hasTournamentsEnabled() && custom.includes(CUSTOM_OPTION_MODE)) {
              const modeMenu = new MessageMenu()
                .setID('select_mode')
                .setPlaceholder('Choose ...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOption(new MessageMenuOption()
                  .setLabel('Standard Lobby')
                  .setValue(LOBBY_MODE_STANDARD)
                  .setDefault(true)
                  .setDescription('Standard Lobbies can have up to 8 players.'))
                .addOption(new MessageMenuOption()
                  .setLabel('Tournament Lobby')
                  .setValue(LOBBY_MODE_TOURNAMENT)
                  .setDefault(false)
                  .setDescription('Tournament Lobbies can have up to 64 players.'));

              sentMessage = await sendAlertMessage(message.channel, 'Select the lobby mode.', 'info', [], [], [modeMenu]);

              // eslint-disable-next-line no-shadow,max-len
              mode = await sentMessage.awaitMenus(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                collectedOption.reply.defer();

                return collectedOption.values.shift();
              }).catch(() => {
                sentMessage.delete();
                return LOBBY_MODE_STANDARD;
              });
            }

            lobby.mode = mode;

            // eslint-disable-next-line max-len
            const lobbyTrackOptions = trackOptions.filter((t) => lobby.getTrackOptions().includes(t.uid));
            let trackOption = lobby.getDefaultTrackOption();

            if (lobbyTrackOptions.length > 1 && custom.includes(CUSTOM_OPTION_TRACK_POOL)) {
              const trackOptionMenu = new MessageMenu()
                .setID('select_track_option')
                .setPlaceholder('Choose ...')
                .setMaxValues(1)
                .setMinValues(1);

              lobbyTrackOptions.forEach((l) => {
                const option = new MessageMenuOption()
                  .setLabel(l.name)
                  .setValue(l.uid)
                  .setDefault(l.uid === lobby.getDefaultTrackOption());

                trackOptionMenu.addOption(option);
              });

              sentMessage = await sendAlertMessage(message.channel, 'Select the track pool.', 'info', [], [], [trackOptionMenu]);

              // eslint-disable-next-line no-shadow,max-len
              trackOption = await sentMessage.awaitMenus(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                return collectedOption.values.shift();
              }).catch(() => {
                sentMessage.delete();
                return lobby.getDefaultTrackOption();
              });
            }

            lobby.trackOption = trackOption;

            let maxPlayerCount = lobby.getDefaultPlayerCount();

            // eslint-disable-next-line max-len
            if (lobby.getMinimumPlayerCount() !== lobby.getMaxPlayerCount() && custom.includes(CUSTOM_OPTION_PLAYERS)) {
              const maxPlayerCountMenu = new MessageMenu()
                .setID('select_players')
                .setPlaceholder('Choose ...')
                .setMaxValues(1)
                .setMinValues(1);

              if (lobby.mode === LOBBY_MODE_TOURNAMENT) {
                maxPlayerCountMenu.addOption(new MessageMenuOption()
                  .setLabel(lobby.getMinimumPlayerCount())
                  .setValue(lobby.getMinimumPlayerCount())
                  .setDefault(false))
                  .addOption(new MessageMenuOption()
                    .setLabel(lobby.getMinimumPlayerCount() * 2)
                    .setValue(lobby.getMinimumPlayerCount() * 2)
                    .setDefault(true))
                  .addOption(new MessageMenuOption()
                    .setLabel(lobby.getMaxPlayerCount())
                    .setValue(lobby.getMaxPlayerCount())
                    .setDefault(false));
              } else {
                const count = lobby.getMaxPlayerCount() - lobby.getMinimumPlayerCount();
                for (let i = 0; i <= count; i += 1) {
                  const playerCount = lobby.getMinimumPlayerCount() + i;
                  maxPlayerCountMenu.addOption(new MessageMenuOption()
                    .setLabel(playerCount)
                    .setValue(playerCount)
                    .setDefault(playerCount === lobby.getDefaultPlayerCount()));
                }
              }

              sentMessage = await sendAlertMessage(message.channel, 'Select the maximum number of players.', 'info', [], [], [maxPlayerCountMenu]);

              // eslint-disable-next-line max-len,no-shadow
              maxPlayerCount = await sentMessage.awaitMenus(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                return collectedOption.values.shift();
              }).catch(() => {
                sentMessage.delete();
                return lobby.getDefaultPlayerCount();
              });
            }

            lobby.maxPlayerCount = maxPlayerCount;

            lobby.trackCount = lobby.getDefaultTrackCount();
            lobby.lapCount = lobby.getDefaultLapCount();

            let ruleset = 1;
            if (!lobby.isBattle() && custom.includes(CUSTOM_OPTION_RULESET)) {
              const rulesetMenu = new MessageMenu()
                .setID('select_ruleset')
                .setPlaceholder('Choose ...')
                .setMaxValues(1)
                .setMinValues(1);

              rulesets.forEach((r) => {
                const option = new MessageMenuOption()
                  .setLabel(r.name)
                  .setValue(r.id)
                  .setDefault(r.id === 1);

                rulesetMenu.addOption(option);
              });

              sentMessage = await sendAlertMessage(message.channel, 'Select the ruleset.', 'info', [], [], [rulesetMenu]);

              // eslint-disable-next-line max-len,no-shadow
              ruleset = await sentMessage.awaitMenus(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                return collectedOption.values.shift();
              }).catch(() => {
                sentMessage.delete();
                return 1;
              });
            }

            lobby.ruleset = ruleset;

            let lobbyRegions = null;
            if (custom.includes(CUSTOM_OPTION_REGION)) {
              const regionMenu = new MessageMenu()
                .setID('select_regions')
                .setPlaceholder('Choose ...')
                .setMaxValues(4)
                .setMinValues(1);

              regions.forEach((r) => {
                const option = new MessageMenuOption()
                  .setLabel(r.name)
                  .setValue(r.uid)
                  .setDefault(r.uid === 'regionFree')
                  .setDescription(r.description);

                regionMenu.addOption(option);
              });

              sentMessage = await sendAlertMessage(message.channel, 'Select the region lock.', 'info', [], [], [regionMenu]);

              // eslint-disable-next-line max-len,no-shadow
              lobbyRegions = await sentMessage.awaitMenus(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                let value = collectedOption.values;
                if (value.includes('regionFree')) {
                  value = null;
                }

                return value;
              }).catch(() => {
                sentMessage.delete();
                return null;
              });
            }

            if (lobbyRegions) {
              lobby.regions = lobbyRegions;
            }

            lobby.engineRestriction = null;
            lobby.survivalStyle = (lobby.isSurvival() && lobby.isRacing() ? 1 : null);

            let limitAndLKDOnly = false;
            if (lobby.isBattle() && custom.includes(CUSTOM_OPTION_BATTLE_MODES)) {
              sentMessage = await sendAlertMessage(message.channel, 'Do you want to restrict the battle mode selection to Last Kart Driving and Limit Battle?', 'info', [], [yesButton, noButton, maybeButton]);

              // eslint-disable-next-line no-unused-vars,no-shadow,max-len
              limitAndLKDOnly = await sentMessage.awaitButtons(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                if (collectedOption.id === 'maybe') {
                  return getRandomArrayElement([true, false]);
                }

                return (collectedOption.id === 'yes');
              }).catch(() => {
                sentMessage.delete();
                return false;
              });
            }

            lobby.limitAndLKDOnly = limitAndLKDOnly;

            let allowPremadeTeams = true;

            // eslint-disable-next-line max-len
            if (lobby.isTeams() && custom.includes(CUSTOM_OPTION_PREMADE_TEAMS)) {
              sentMessage = await sendAlertMessage(message.channel, 'Do you want to allow premade teams?', 'info', [], [yesButton, noButton, maybeButton]);

              // eslint-disable-next-line max-len,no-shadow
              allowPremadeTeams = await sentMessage.awaitButtons(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                if (collectedOption.id === 'maybe') {
                  return getRandomArrayElement([true, false]);
                }

                return (collectedOption.id === 'yes');
              }).catch(() => {
                sentMessage.delete();
                return true;
              });
            }

            lobby.allowPremadeTeams = allowPremadeTeams;

            let reservedTeam = null;

            // eslint-disable-next-line max-len
            if (lobby.isWar() && !lobby.is1v1() && allowPremadeTeams && custom.includes(CUSTOM_OPTION_RESERVE)) {
              sentMessage = await sendAlertMessage(message.channel, 'Do you want to reserve the lobby for an existing team?', 'info', [], [yesButton, noButton, maybeButton]);

              // eslint-disable-next-line max-len,no-shadow
              const reserveLobby = await sentMessage.awaitButtons(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                if (collectedOption.id === 'maybe') {
                  return getRandomArrayElement([true, false]);
                }

                return (collectedOption.id === 'yes');
              }).catch(() => {
                sentMessage.delete();
                return false;
              });

              if (reserveLobby) {
                sentMessage = await sendAlertMessage(message.channel, 'Please mention one of the team members.', 'info');

                // eslint-disable-next-line max-len,no-shadow
                const discordId = await message.channel.awaitMessages(messageFilter, filterOptions).then(async (collected) => {
                  sentMessage.delete();

                  collectedOption = collected.first();
                  await collectedOption.reply.defer(false);

                  const mentionedUser = collectedOption.mentions.users.first();
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
                  return sendAlertMessage(message.channel, 'You cannot mention yourself.', 'warning');
                }

                reservedTeam = discordId;
              }
            }

            lobby.reservedTeam = reservedTeam;

            let anonymous = false;

            if (custom.includes(CUSTOM_OPTION_ANONYMOUS)) {
              sentMessage = await sendAlertMessage(message.channel, 'Do you want to create an anonymous lobby?', 'info', [], [yesButton, noButton, maybeButton]);

              // eslint-disable-next-line max-len,no-shadow
              anonymous = await sentMessage.awaitButtons(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                if (collectedOption.id === 'maybe') {
                  return getRandomArrayElement([true, false]);
                }

                return (collectedOption.id === 'yes');
              }).catch(() => {
                sentMessage.delete();
                return false;
              });
            }

            lobby.anonymous = anonymous;

            let ranked = lobby.canBeRanked();
            if (lobby.canBeRanked() && custom.includes(CUSTOM_OPTION_TYPE)) {
              sentMessage = await sendAlertMessage(message.channel, 'Do you want to create a ranked lobby?', 'info', [], [yesButton, noButton, maybeButton]);

              // eslint-disable-next-line max-len,no-shadow
              ranked = await sentMessage.awaitButtons(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                if (collectedOption.id === 'maybe') {
                  return getRandomArrayElement([true, false]);
                }

                return (collectedOption.id === 'yes');
              }).catch(() => {
                sentMessage.delete();
                return lobby.canBeRanked();
              });
            }

            lobby.ranked = ranked;

            let mmrLock = false;
            let rankDiff = null;
            let playerRank = null;

            if (ranked && custom.includes(CUSTOM_OPTION_MMR_LOCK)) {
              sentMessage = await sendAlertMessage(message.channel, 'Do you want to put a rank restriction on your lobby?', 'info', [], [yesButton, noButton, maybeButton]);

              // eslint-disable-next-line max-len,no-shadow
              mmrLock = await sentMessage.awaitButtons(actionFilter, filterOptions).then(async (collected) => {
                sentMessage.delete();

                collectedOption = collected.first();
                await collectedOption.reply.defer(false);

                if (collectedOption.id === 'maybe') {
                  return getRandomArrayElement([true, false]);
                }

                return (collectedOption.id === 'yes');
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

                // eslint-disable-next-line max-len,no-shadow
                rankDiff = await message.channel.awaitMessages(messageFilter, filterOptions).then(async (collected) => {
                  sentMessage.delete();

                  const collectedMessage = collected.first();
                  // eslint-disable-next-line no-shadow
                  const { content } = collectedMessage;
                  collectedMessage.delete();

                  let diff = parseInt(content, 10);
                  if (Number.isNaN(diff) || diff < diffMin || diff > diffMax) {
                    diff = diffDefault;
                  }

                  return diff;
                }).catch(() => {
                  sentMessage.delete();
                  return diffDefault;
                });

                playerRank = lobby.getDefaultRank();

                const player = await Player.findOne({ discordId: message.author.id });
                if (player && player.rankedName) {
                  const rank = await Rank.findOne({ name: player.rankedName });

                  if (rank && rank[type] && rank[type].rank) {
                    playerRank = rank[type].rank;
                  }
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
              let role = null;

              if (lobby.ranked) {
                role = await createAndFindRole(guild, lobby.getRoleName());
              }

              let channel;
              if (lobby.ranked) {
                // eslint-disable-next-line max-len
                channel = guild.channels.cache.find((c) => c.name === config.channels.ranked_lobbies_channel);
              } else {
                // eslint-disable-next-line max-len
                channel = guild.channels.cache.find((c) => c.name === config.channels.unranked_lobbies_channel);
              }

              const buttonRow = new MessageActionRow()
                .addComponent(joinLobbyButton)
                .addComponent(leaveLobbyButton)
                .addComponent(deleteLobbyButton);

              channel.send({
                content: role,
                embed: await getEmbed(doc),
                components: [buttonRow],
              }).then((m) => {
                doc.channel = m.channel.id;
                doc.message = m.id;
                doc.save().then(() => {
                  sendAlertMessage(message.channel, `${lobby.getTitle()} has been created. Don't forget to click on the ✅ button!`, 'success');
                });
              });
            });
          }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error').then((m) => m.delete({ timeout: 5000 })));
        }).catch(() => sendAlertMessage(message.channel, 'Command cancelled.', 'error').then((m) => m.delete({ timeout: 5000 })));

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
        // eslint-disable-next-line consistent-return
        findLobby(lobbyID, isStaff, message, (doc, msg) => {
          if (doc.started) {
            const minutes = diffMinutes(new Date(), doc.startedAt);
            const confirmationMinutes = doc.getLobbyEndCooldown();

            if (confirmationMinutes === null || minutes < confirmationMinutes) {
              // eslint-disable-next-line consistent-return
              Room.findOne({ lobby: doc.id }).then((room) => {
                if (!room) {
                  return deleteLobby(doc, msg);
                }

                // eslint-disable-next-line max-len
                const roomChannel = message.guild.channels.cache.find((c) => c.name.toLowerCase() === getRoomName(room.number).toLowerCase());
                if (roomChannel) {
                  const requiredReactions = Math.ceil((doc.players.length - 1) * 0.75);

                  sendAlertMessage(roomChannel, `I need reactions from ${requiredReactions} other people in the lobby to confirm.`, 'info', doc.players).then((voteMessage) => {
                    voteMessage.react('✅');

                    // eslint-disable-next-line no-shadow
                    const filter = (r, u) => ['✅'].includes(r.emoji.name) && doc.players.includes(u.id) && u.id !== message.author.id;
                    voteMessage.awaitReactions(filter, {
                      max: requiredReactions,
                      time: 60000,
                      errors: ['time'],
                      // eslint-disable-next-line consistent-return
                    }).then(() => {
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
        // eslint-disable-next-line consistent-return
        findLobby(lobbyID, isStaff, message, (doc, msg) => {
          if (doc.started) {
            const minutes = diffMinutes(new Date(), doc.startedAt);
            const confirmationMinutes = doc.getLobbyEndCooldown();

            if (confirmationMinutes === null || minutes >= confirmationMinutes) {
              // eslint-disable-next-line consistent-return
              Room.findOne({ lobby: doc.id }).then((room) => {
                if (!room) {
                  return deleteLobby(doc, msg);
                }

                // eslint-disable-next-line max-len
                const roomChannel = message.guild.channels.cache.find((c) => c.name.toLowerCase() === getRoomName(room.number).toLowerCase());
                if (roomChannel) {
                  const maxReactions = Math.ceil(doc.players.length / 2);
                  const pings = doc.players.map((p) => `<@${p}>`).join(' ');
                  sendAlertMessage(message.channel, `I need reactions from ${maxReactions} other people in the lobby to confirm.\n${pings}`, 'info').then((voteMessage) => {
                    voteMessage.react('✅');

                    // eslint-disable-next-line no-shadow
                    const filter = (r, u) => ['✅'].includes(r.emoji.name) && doc.players.includes(u.id) && u.id !== message.author.id;
                    voteMessage.awaitReactions(filter, {
                      max: maxReactions,
                      time: 60000,
                      errors: ['time'],
                      // eslint-disable-next-line consistent-return
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
                            m.react(savedRelobby.getReactionEmote());
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
      case 'quit':
      case 'leave':
        // eslint-disable-next-line consistent-return
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
      case 'advance':
        // eslint-disable-next-line consistent-return
        findLobby(lobbyID, isStaff, message, (doc) => {
          if (!doc) {
            return sendAlertMessage(message.channel, 'You are not in a tournament lobby.', 'warning');
          }

          if (!isStaff && doc.creator !== message.author.id) {
            return sendAlertMessage(message.channel, 'You need to be either a staff member or the lobby creator to use this command.', 'warning');
          }

          const users = message.mentions.users.map((u) => u.id);
          const lobby = doc;
          lobby.mode = LOBBY_MODE_STANDARD;

          let advanceCount;
          if (doc.players.length <= lobby.getDefaultPlayerCount()) {
            advanceCount = doc.getTeamSize();
          } else {
            advanceCount = doc.players.length / 2;
          }

          if (users.length !== advanceCount) {
            return sendAlertMessage(message.channel, `You need to mention ${advanceCount} players.`, 'warning');
          }

          doc.players = doc.players.filter((p) => users.includes(p));
          doc.save().then(() => {
            if (advanceCount === doc.getTeamSize()) {
              sendAlertMessage(message.channel, `The winner of the tournament is <@${doc.players.join(',')}>!`, 'success');
              deleteLobby(doc, message);
            } else {
              sendAlertMessage(message.channel, 'The next round is starting!', 'success');
              setupTournamentRound(doc, message.channel);
            }
          }).catch(() => {
            sendAlertMessage(message.channel, 'Something went wrong when advancing players.', 'error');
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
      case 'get_decay':
        if (!isStaff) {
          return sendAlertMessage(message.channel, 'You need to be a staff member to use this command.', 'warning');
        }

        // eslint-disable-next-line no-use-before-define,no-case-declarations
        const decay = await getDecay(message.channel);
        message.channel.send(decay[RACE_FFA].join('\n'));

        break;
      case 'force_add':
        // eslint-disable-next-line consistent-return
        findLobby(lobbyID, isStaff, message, (doc) => {
          if (!isStaff) {
            return sendAlertMessage(message.channel, 'You need to be a staff member to use this command.', 'warning');
          }

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

          // eslint-disable-next-line max-len
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

async function restrictSoloQueue(doc, user, soloQueue) {
  const errors = [];
  const player = await Player.findOne({ discordId: user.id });

  if (doc.reservedTeam) {
    if (![doc.creator, doc.reservedTeam].includes(user.id)) {
      errors.push(`This lobby is reserved for <@!${doc.creator}>'s and <@!${doc.reservedTeam}>'s teams.`);
    } else {
      errors.push('This lobby is reserved for your team. Please set your team members or partner first.');
    }
  }

  if (!doc.locked.$isEmpty()) {
    let rank = doc.getDefaultRank();

    if (player && player.rankedName) {
      const playerRank = await Rank.findOne({ name: player.rankedName });

      if (playerRank && playerRank[doc.type]) {
        // eslint-disable-next-line prefer-destructuring
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
    if (!player || (player && !player.discordVc && !player.ps4Vc)) {
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

        // eslint-disable-next-line max-len
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

client.on('clickButton', async (b) => {
  switch (b.id) {
    case 'join_lobby':
      // eslint-disable-next-line max-len
      client.guilds.cache.get(b.guild.id).channels.cache.get(b.message.channel.id).messages.fetch(b.message.id).then(async (lobbyMessage) => {
        const reaction = {
          message: lobbyMessage,
          users: null,
        };

        // eslint-disable-next-line no-use-before-define
        mogi(reaction, b.clicker.user);
        await b.reply.defer();
      });
      break;
    case 'leave_lobby':
      // eslint-disable-next-line max-len
      client.guilds.cache.get(b.guild.id).channels.cache.get(b.message.channel.id).messages.fetch(b.message.id).then(async (lobbyMessage) => {
        const reaction = {
          message: lobbyMessage,
          users: null,
        };

        // eslint-disable-next-line no-use-before-define
        mogi(reaction, b.clicker.user, true);
        await b.reply.defer();
      });
      break;
    case 'delete_lobby':
      // eslint-disable-next-line max-len
      client.guilds.cache.get(b.guild.id).channels.cache.get(b.message.channel.id).messages.fetch(b.message.id).then(async (lobbyMessage) => {
        const doc = await Lobby.findOne({ message: lobbyMessage.id });

        if (!doc.started) {
          if (doc.creator === b.clicker.user.id || isStaffMember(b.clicker.member)) {
            deleteLobby(doc, lobbyMessage, false);
          } else {
            b.reply.send('You do not have permission to do that.', { ephemeral: true });
          }
        } else if (isStaffMember(b.clicker.member)) {
          deleteLobby(doc, lobbyMessage, false);
        } else {
          b.reply.send('You do not have permission to do that.', { ephemeral: true });
        }
      });
      break;
    default:
      break;
  }
});

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

    // eslint-disable-next-line max-len
    let notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.matchmaking_notifications_channel.toLowerCase());
    if (!notificationChannel) {
      // eslint-disable-next-line max-len
      notificationChannel = await guild.channels.create(config.channels.matchmaking_notifications_channel);
    }

    Lobby.findOne(conditions).then(async (doc) => {
      if (doc) {
        const errors = [];

        if (!removed) {
          const member = await guild.members.fetch(user.id);
          if (!member) return;

          const banned = await RankedBan.findOne({ discordId: member.id, guildId: guild.id });
          if (banned && doc.ranked) {
            // eslint-disable-next-line max-len
            const lobbiesChannel = guild.channels.cache.find((c) => c.name === config.channels.ranked_lobbies_channel);
            await lobbiesChannel.createOverwrite(user, { VIEW_CHANNEL: false });
            errors.push('You are banned.');
          }

          // eslint-disable-next-line max-len
          if (member.roles.cache.find((r) => r.name.toLowerCase() === config.roles.muted_role.toLowerCase())) {
            errors.push('You are muted.');
          }

          const player = await Player.findOne({ discordId: user.id });

          if (!player || !player.rankedName) {
            errors.push('You need to set your ranked name. Example: `!set_ranked_name your_ranked_name`.');
          }

          if (!player || !player.psn) {
            errors.push('You need to set your PSN. Example: `!set_psn ctr_tourney_bot`.');
          }

          if (doc.regions.length > 0) {
            if (!player || !player.region) {
              errors.push('You need to set your region because the lobby you are trying to join is region locked. Use `!set_region` and then follow the bot instructions.');
            } else if (!doc.regions.includes(player.region)) {
              const lobbyRegions = [];
              doc.regions.forEach((dr) => {
                const region = regions.find((r) => r.uid === dr);
                lobbyRegions.push(region.name);
              });

              const playerRegion = regions.find((r) => r.uid === player.region);
              errors.push(`The lobby you are trying to join is locked to ${lobbyRegions.join(', ')} and you are from ${playerRegion.name}.`);
            }
          }

          // eslint-disable-next-line max-len
          const repeatLobby = await Lobby.findOne({ guild: guild.id, players: user.id, _id: { $ne: doc._id } });

          if (repeatLobby) {
            errors.push('You cannot be in 2 lobbies at the same time.');
          }

          // eslint-disable-next-line max-len
          if (doc.ranked && !doc.locked.$isEmpty() && doc.isSolos() && player.rankedName) {
            const playerRank = await Rank.findOne({ name: player.rankedName });

            let rank = doc.getDefaultRank();
            if (playerRank && playerRank[doc.type]) {
              // eslint-disable-next-line prefer-destructuring
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

          if (doc.type === RACE_SURVIVAL) {
            if (!player || !player.nat) {
              errors.push('You need to set your NAT Type before you can join a survival lobby.');
            } else if (player && player.nat && player.nat === NAT3) {
              errors.push('You cannot join a survival lobby because you are NAT Type 3.');
            }
          }
        }

        // eslint-disable-next-line max-len,no-shadow
        lock.acquire(doc._id, async () => Lobby.findOne({ _id: doc._id }).then(async (doc) => {
          let players = Array.from(doc.players);
          const playersCount = players.length;

          // eslint-disable-next-line max-len
          if (!removed && playersCount > doc.maxPlayerCount) {
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

              // eslint-disable-next-line max-len
              const savedPartner = userSavedDuo.discord1 === user.id ? userSavedDuo.discord2 : userSavedDuo.discord1;

              if (removed) {
                players = players.filter((p) => p !== user.id && p !== savedPartner);
                teamList = teamList.filter((p) => !(Array.isArray(p) && p.includes(user.id)));
              } else {
                const repeatLobbyPartner = await Lobby.findOne({
                  guild: guild.id,
                  players: savedPartner,
                  _id: { $ne: doc._id },
                });

                if (repeatLobbyPartner) {
                  errors.push('Your partner is in another lobby.');
                }

                if (doc.ranked) {
                  // eslint-disable-next-line max-len
                  const partnerBanned = await RankedBan.findOne({ discordId: savedPartner, guildId: guild.id });
                  if (partnerBanned) {
                    userSavedDuo.delete();
                    errors.push('Your partner is banned. The duo has been deleted.');
                  }
                }

                const partner = await Player.findOne({ discordId: savedPartner });

                if (!partner || !partner.rankedName) {
                  errors.push('Your partner needs to set their ranked name. Example: `!set_ranked_name your_ranked_name`.');
                }

                if (doc.regions.length > 0) {
                  if (!partner || !partner.region) {
                    errors.push('Your partner needs to set their region. Use `!set_region` and then follow the bot instructions.');
                  } else if (!doc.regions.includes(partner.region)) {
                    const lobbyRegions = [];
                    doc.regions.forEach((dr) => {
                      const region = regions.find((r) => r.uid === dr);
                      lobbyRegions.push(region.name);
                    });

                    const partnerRegion = regions.find((r) => r.uid === partner.region);
                    errors.push(`The lobby you are trying to join is locked to ${lobbyRegions.join(', ')} and your partner is from ${partnerRegion.name}.`);
                  }
                }

                if (doc.ranked && !doc.locked.$isEmpty()) {
                  const player = await Player.findOne({ discordId: user.id });

                  let player1Rank = doc.getDefaultRank();
                  let player2Rank = doc.getDefaultRank();

                  if (player && player.rankedName && partner && partner.rankedName) {
                    const playerRank = await Rank.findOne({ name: player.rankedName });
                    const partnerRank = await Rank.findOne({ name: partner.rankedName });

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

                const duoPlayerIds = [userSavedDuo.discord1, userSavedDuo.discord2];

                // eslint-disable-next-line max-len
                if (doc.reservedTeam && !duoPlayerIds.includes(doc.creator) && !duoPlayerIds.includes(doc.reservedTeam)) {
                  errors.push(`The lobby is reserved for <@!${doc.creator}>'s and <@!${doc.reservedTeam}>'s teams.`);
                }

                if (playersCount === (doc.maxPlayerCount - 1)) {
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
          } else if (doc.isWar() && !doc.is1v1()) {
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
                const repeatLobbyTeam = await Lobby.findOne({
                  guild: guild.id,
                  players: { $in: teamPlayers },
                  _id: { $ne: doc._id },
                });

                if (repeatLobbyTeam) {
                  errors.push('One of your teammates is in another lobby.');
                }

                if (doc.ranked) {
                  // eslint-disable-next-line max-len
                  const teammateBanned = await RankedBan.findOne({ discordId: teamPlayers, guildId: guild.id });

                  if (teammateBanned) {
                    team.delete();
                    errors.push('One of your teammates is banned. The team has been deleted.');
                  }
                }

                const teammates = await Player.find({ discordId: { $in: teamPlayers } });
                let rankSum = 0;

                // eslint-disable-next-line guard-for-in
                for (const i in teammates) {
                  const teammate = teammates[i];

                  if (!teammate.rankedName) {
                    errors.push(`Your teammate ${teammate.psn} needs to set their ranked name. Example: \`!set_ranked_name your_ranked_name\`.`);
                  }

                  if (doc.regions.length > 0) {
                    if (!teammate.region) {
                      errors.push(`Your teammate ${teammate.psn} needs to set their region. Use \`!set_region\` and then follow the bot instructions.`);
                    } else if (!doc.regions.includes(teammate.region)) {
                      const lobbyRegions = [];
                      doc.regions.forEach((dr) => {
                        const region = regions.find((r) => r.uid === dr);
                        lobbyRegions.push(region.name);
                      });

                      const teammateRegion = regions.find((r) => r.uid === teammate.region);
                      errors.push(`The lobby you are trying to join is locked to ${lobbyRegions.join(', ')} and your teammate ${teammate.psn} is from ${teammateRegion.name}.`);
                    }
                  }

                  if (doc.ranked && !doc.locked.$isEmpty()) {
                    const teammateRank = await Rank.findOne({ name: teammate.rankedName });

                    let rank = doc.getDefaultRank();
                    if (teammateRank && teammateRank[doc.type]) {
                      // eslint-disable-next-line prefer-destructuring
                      rank = teammateRank[doc.type].rank;
                    }

                    rankSum += rank;
                  }
                }

                if (doc.ranked && !doc.locked.$isEmpty()) {
                  const averageRank = Math.ceil(rankSum / team.players.length);

                  const minRank = doc.locked.rank - doc.locked.shift;
                  const maxRank = doc.locked.rank + doc.locked.shift;
                  const rankTooLow = averageRank < minRank;
                  const rankTooHigh = averageRank > maxRank;

                  if (rankTooLow || rankTooHigh) {
                    errors.push(`Your team's rank is too ${rankTooLow ? 'low' : 'high'}.`);
                  }
                }

                // eslint-disable-next-line max-len
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

          if (errors.length > 0) {
            let out = 'You cannot join the lobby for the following reasons:\n\n';
            out += errors.map((e, i) => `${i + 1}. ${e}`).join('\n');

            if (reaction.users) {
              await reaction.users.remove(user);
            }

            user.createDM().then((dmChannel) => sendAlertMessage(dmChannel, out, 'warning')).catch(() => { });
            // eslint-disable-next-line consistent-return
            return sendAlertMessage(notificationChannel, out, 'warning', [user.id]);
          }

          // eslint-disable-next-line consistent-return
          return doc.save().then(async () => {
            const count = players.length;
            if (count) {
              if (count >= doc.maxPlayerCount) {
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
          }).catch((error) => {
            // eslint-disable-next-line no-console
            console.log(`Unable to save lobby: ${error}`);
          });
        }));
      }
    });
  }
}

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
      await reaction.users.fetch();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Something went wrong when fetching the message: ', error);
      return;
    }
  }

  await mogi(reaction, user);
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Something went wrong when fetching the message: ', error);
      return;
    }
  }

  await mogi(reaction, user, true);
});

client.on('messageDelete', async (message) => {
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Something went wrong when fetching the message: ', error);
    }
  }

  const conditions = { message: message.id };

  Lobby.findOne(conditions).then(async (doc) => {
    if (doc) {
      Room.findOne({ lobby: doc.id }).then((room) => {
        if (!room) {
          return;
        }

        // eslint-disable-next-line max-len
        const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name.toLowerCase() === getRoomName(room.number).toLowerCase());
        if (channel && message.channel.id !== channel.id) {
          if (doc.ranked) {
            sendAlertMessage(channel, 'Lobby ended. Don\'t forget to submit your scores.', 'success');
          } else {
            sendAlertMessage(channel, 'Lobby ended.', 'success');
          }
        }

        room.lobby = null;
        room.save();
      });

      doc.delete();
    }
  });
});

const findRoomAndSendMessage = (doc, ping = false) => {
  let message;
  if (doc.ranked) {
    message = 'Don\'t forget to close the lobby with `!lobby end` and submit your scores.';
  } else {
    message = 'Don\'t forget to close the lobby with `!lobby end`.';
  }

  let pings = [];
  if (ping) {
    pings = doc.players;
  }

  Room.findOne({ lobby: doc.id }).then((room) => {
    if (room) {
      // eslint-disable-next-line max-len
      const channel = client.guilds.cache.get(room.guild).channels.cache.find((c) => c.name.toLowerCase() === getRoomName(room.number).toLowerCase());
      if (channel) {
        sendAlertMessage(channel, message, 'info', pings);
      }
    }
  });
};

const checkOldLobbies = () => {
  Lobby.find({ started: true }).then((docs) => {
    docs.forEach((doc) => {
      const minutes = diffMinutes(new Date(), doc.startedAt);

      const remindMinutes = doc.getRemindMinutes();
      const pingMinutes = doc.getPingMinutes();

      if (remindMinutes !== null && pingMinutes !== null) {
        if (remindMinutes.includes(minutes)) {
          findRoomAndSendMessage(doc);
        } else if (pingMinutes.includes(minutes)) {
          findRoomAndSendMessage(doc, true);
        }
      }
    });
  });

  Lobby.find({ started: false }).then((docs) => {
    // eslint-disable-next-line consistent-return
    docs.forEach(async (doc) => {
      const guild = client.guilds.cache.get(doc.guild);

      if (guild) {
        // eslint-disable-next-line max-len
        let notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.matchmaking_notifications_channel.toLowerCase());
        if (!notificationChannel) {
          // eslint-disable-next-line max-len
          notificationChannel = await guild.channels.create(config.channels.matchmaking_notifications_channel);
        }

        const minutes = diffMinutes(new Date(), doc.date);

        if (doc.players.length <= 0 && minutes >= 5) {
          deleteLobby(doc);
          return sendAlertMessage(notificationChannel, `Your lobby \`${doc.id}\` has been deleted because it was empty for more than 5 minutes.`, 'info', [doc.creator]);
        }

        const remindMinutes = [55];
        const closeMinutes = 60;

        if (remindMinutes.includes(minutes) || minutes >= closeMinutes) {
          if (minutes >= closeMinutes) {
            const duration = moment.duration(closeMinutes, 'minutes').humanize();
            deleteLobby(doc);
            return sendAlertMessage(notificationChannel, `Your lobby \`${doc.id}\` has been deleted because it wasn't started in ${duration}.`, 'info', [doc.creator]);
          }

          const duration = moment.duration(closeMinutes - minutes, 'minutes').humanize();
          return sendAlertMessage(notificationChannel, `Your lobby \`${doc.id}\` will be deleted in ${duration} if it will not be started.`, 'warning', [doc.creator]);
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
        // eslint-disable-next-line max-len
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
  Counter.find({ tickUpdatedAt: { $lte: oneMinuteAgo }, tickCount: { $gt: 0 } }).then((docs) => {
    docs.forEach((doc) => {
      doc.tickCount = 0;
      doc.save();
    });
  });

  const duration = moment().subtract(3, 'h');
  Counter.find({ pingUpdatedAt: { $lte: duration }, pingCount: { $gt: 0 } }).then((docs) => {
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
  Cooldown.find({ updatedAt: { $lte: onHourAgo }, count: { $gt: 0 }, name: 'pings' }).then((docs) => {
    docs.forEach((doc) => {
      doc.count = 0;
      doc.save();
    });
  });

  const duration = moment().subtract(3, 'h');
  Cooldown.find({ updatedAt: { $lte: duration }, count: { $gt: 0 }, name: 'ranked pings' }).then((docs) => {
    docs.forEach((doc) => {
      doc.count = 0;
      doc.save();
    });
  });

  const fiveMinutes = moment().subtract(5, 'm');
  Cooldown.find({ updatedAt: { $lte: fiveMinutes }, count: { $gt: 0 }, name: 'lobby' }).then((docs) => {
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

  // eslint-disable-next-line max-len
  if (message.channel.parent && message.channel.parent.name.toLowerCase() === config.channels.matchmaking_category.toLowerCase() && roles.find((r) => r.name.toLowerCase() === config.roles.tournament_staff_role.toLowerCase())) {
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
  Lobby.find().then((docs) => {
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
async function getRanks(options) {
  const url = 'https://gb.hlorenzi.com/api/v1/graphql';

  const ranks = {};

  // eslint-disable-next-line guard-for-in
  for (const key in LEADERBOARDS) {
    const id = LEADERBOARDS[key];

    if (id !== null) {
      const response = await axios.post(url, getBoardRequestData(id), { headers: { 'Content-Type': 'text/plain' } });

      if (response.data.data.team !== null) {
        const { players } = response.data.data.team;
        players.forEach((p) => {
          const { name } = p;
          if (!(name in ranks)) {
            ranks[name] = { name };
          }
          ranks[name][key] = {
            rank: p.rating,
            position: p.ranking,
            lastActivity: (p.lastActivityDate / 1000),
          };
        });
      }
    }
  }

  await Rank.deleteMany();
  await Rank.insertMany(Object.values(ranks), options);
}

async function getDecay() {
  const boards = {
    [RACE_FFA]: 'Items Racing',
    [RACE_SURVIVAL]: 'Survival',
    [RACE_ITEMLESS_FFA]: 'Itemless Racing',
    [BATTLE_FFA]: 'Battle Mode',
  };

  const ranks = await Rank.find();
  const decay = {};

  ranks.forEach((r) => {
    // eslint-disable-next-line guard-for-in
    for (const key in boards) {
      if (!decay[key]) {
        decay[key] = [];
      }

      // eslint-disable-next-line no-prototype-builtins
      if (key in r && r[key].rank !== undefined) {
        const now = moment();
        const lastActivity = moment.unix(r[key].lastActivity);
        const playedDaysAgo = now.diff(lastActivity, 'days');

        if (playedDaysAgo > 14) {
          const rankDiff = Math.floor(r[key].rank - 1200);
          let decayValue = Math.floor(rankDiff * 0.01 * playedDaysAgo);
          let sign = '-';

          if (r[key].rank < 1200) {
            decayValue *= -1;
            sign = '+';
          }

          decay[key].push(`${r.name} !${sign}${decayValue}`);
        }
      }
    }
  });

  return decay;
}

new CronJob('0/15 * * * *', getRanks).start();

// check bans on rejoin
client.on('guildMemberAdd', (member) => {
  const { guild } = member;
  const { user } = member;

  const now = new Date();

  // eslint-disable-next-line max-len
  RankedBan.findOne({ discordId: user.id, guildId: guild.id, bannedTill: { $gte: now } }).then((doc) => {
    if (doc) {
      // eslint-disable-next-line max-len
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
    const logMessage = `Could not send DM: ${error.message} ${newMember}`;
    sendLogMessage(newMember.guild, logMessage);
  };

  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  // eslint-disable-next-line max-len
  if (!oldRoles.some((r) => r.name.toLowerCase() === config.roles.matchmaking_role.toLowerCase()) && newRoles.some((r) => r.name.toLowerCase() === config.roles.matchmaking_role.toLowerCase())) {
    const promise = getConfigValue('ranked_welcome_message', config.default_matchmaking_welcome_message);
    Promise.resolve(promise).then((welcomeMessage) => {
      newMember.createDM().then((dm) => {
        dm.send(welcomeMessage).then(DMCallback).catch(DMCatchCallback);
      });
    });
  }
});

const teamDuration = moment.duration(3, 'hours');

function checkOldDuos() {
  const lte = moment().subtract(teamDuration);
  Duo.find({ date: { $lte: lte } }).then((duos) => {
    duos.forEach((duo) => {
      Lobby.findOne({
        type: RACE_DUOS,
        players: { $in: [duo.discord1, duo.discord2] },
      }).then((activeLobby) => {
        if (!activeLobby) {
          duo.delete().then(() => {
            const guild = client.guilds.cache.get(duo.guild);

            if (guild) {
              // eslint-disable-next-line max-len
              const notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.matchmaking_notifications_channel.toLowerCase());
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
      Lobby.findOne({
        type: { $in: [RACE_3V3, RACE_4V4] },
        players: { $in: teams.players },
      }).then((activeLobby) => {
        if (!activeLobby) {
          team.delete().then(() => {
            const guild = client.guilds.cache.get(team.guild);

            if (guild) {
              // eslint-disable-next-line max-len
              const notificationChannel = guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.matchmaking_notifications_channel.toLowerCase());
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
